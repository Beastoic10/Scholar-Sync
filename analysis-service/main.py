import os
import re
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded from analysis-service, parent workspace, or current working directory
current_dir = Path(__file__).resolve().parent
for env_path in [current_dir / ".env", current_dir.parent / ".env", Path.cwd() / ".env"]:
    if env_path.is_file():
        load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("analysis-service")

app = FastAPI(
    title="ScholarSync Document Analysis Service",
    description="Microservice providing real document analysis: Internal Similarity (MiniLM-L6-v2), AI Detection (Hugging Face chatgpt-detector-roberta), and Citation Verification (Crossref REST API).",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance for sentence transformers
sentence_model = None

def get_sentence_model():
    global sentence_model
    if sentence_model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
        sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("SentenceTransformer model loaded successfully.")
    return sentence_model

class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="Extracted plain text of the document to analyze")
    comparison_texts: Optional[List[str]] = Field(default=[], description="List of previous ScholarSync submission texts for Internal Similarity comparison")

class CitationItem(BaseModel):
    doi: Optional[str] = None
    raw_reference: Optional[str] = None
    verified: bool
    title: Optional[str] = None
    container_title: Optional[str] = None
    publisher: Optional[str] = None
    message: Optional[str] = None

class AnalysisResponse(BaseModel):
    similarity_score: Optional[float] = Field(None, description="Max cosine similarity against previous submissions (0.0 to 1.0), reported as Internal Similarity")
    similarity_type: str = "Internal Similarity"
    compared_documents_count: int = 0
    ai_detection_status: str = Field(..., description="'SUCCESS', 'FAILED', or 'UNAVAILABLE'")
    ai_detection_result: Optional[Any] = Field(None, description="Real output returned by roberta-base-openai-detector. Never fabricated.")
    ai_detection_error: Optional[str] = None
    total_citations: int
    verified_citations: int
    unverified_citations: int
    citation_details: List[CitationItem] = []
    status: str = Field(..., description="Overall analysis status: 'COMPLETED' or 'FAILED'")

DOI_PATTERN = re.compile(r'\b(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)\b', re.IGNORECASE)

def clean_doi(raw_doi: str) -> str:
    cleaned = raw_doi.rstrip(".,;:)>]")
    # If starting with parentheses or angle brackets
    cleaned = cleaned.lstrip("(<[")
    return cleaned

def extract_dois_and_references(text: str) -> Dict[str, Any]:
    """
    Extracts DOIs and potential reference items from document text.
    """
    raw_matches = DOI_PATTERN.findall(text)
    unique_dois = []
    seen = set()
    for m in raw_matches:
        cleaned = clean_doi(m)
        if cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            unique_dois.append(cleaned)

    # Detect additional citation references in bibliography sections if present
    # Look for a section titled References, Works Cited, or Bibliography
    reference_items = []
    bib_match = re.search(r'(?:references|bibliography|works cited)\s*[\r\n]+([\s\S]+)$', text, re.IGNORECASE)
    if bib_match:
        bib_section = bib_match.group(1).strip()
        lines = [line.strip() for line in bib_section.splitlines() if len(line.strip()) > 15]
        # Detect lines that look like bibliography entries (e.g. starting with [1], 1., author names)
        for line in lines[:50]:  # limit to reasonable number
            # check if line contains one of the DOIs
            has_doi = any(doi.lower() in line.lower() for doi in unique_dois)
            if not has_doi and (re.match(r'^(\[\d+\]|\d+\.|\b[A-Z][a-z]+,)', line) or len(line) > 30):
                reference_items.append(line)

    return {
        "dois": unique_dois,
        "raw_references": reference_items
    }

def verify_doi_crossref(doi: str) -> CitationItem:
    """
    Queries Crossref REST API for a given DOI.
    """
    url = f"https://api.crossref.org/works/{doi}"
    headers = {
        "User-Agent": "ScholarSync-AnalysisService/1.0 (mailto:scholar@scholarsync.com)"
    }
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json().get("message", {})
            title = None
            if "title" in data and isinstance(data["title"], list) and len(data["title"]) > 0:
                title = data["title"][0]
            container_title = None
            if "container-title" in data and isinstance(data["container-title"], list) and len(data["container-title"]) > 0:
                container_title = data["container-title"][0]
            publisher = data.get("publisher")
            return CitationItem(
                doi=doi,
                verified=True,
                title=title,
                container_title=container_title,
                publisher=publisher,
                message="Verified via Crossref REST API"
            )
        else:
            return CitationItem(
                doi=doi,
                verified=False,
                message=f"Crossref returned HTTP {resp.status_code}"
            )
    except Exception as e:
        logger.warning(f"Crossref lookup failed for DOI {doi}: {e}")
        return CitationItem(
            doi=doi,
            verified=False,
            message=f"Verification failed: {str(e)}"
        )

# AI detection model: Hello-SimpleAI/chatgpt-detector-roberta
# Supported by HF Inference router (text-classification pipeline).
# roberta-base-openai-detector is NOT supported by the HF Inference provider.
AI_DETECTION_MODEL = "Hello-SimpleAI/chatgpt-detector-roberta"

def run_ai_detection(text: str) -> Dict[str, Any]:
    """
    Calls Hugging Face Inference API for AI-generated text detection.
    Uses Hello-SimpleAI/chatgpt-detector-roberta (text-classification).
    Never invents or fabricates scores if the API fails or token is missing.
    """
    hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token or not hf_token.strip():
        logger.warning("HF_TOKEN environment variable is not configured. AI detection cannot be performed.")
        return {
            "status": "UNAVAILABLE",
            "result": None,
            "error": "HF_TOKEN is not configured on analysis service. Real model inference unavailable."
        }

    # Model input: RoBERTa has 512 token limit, truncate to ~1800 chars
    payload_text = text[:1800].strip()
    if not payload_text:
        return {
            "status": "UNAVAILABLE",
            "result": None,
            "error": "Document text is empty"
        }

    token = hf_token.strip()
    hf_endpoints = [
        f"https://router.huggingface.co/hf-inference/models/{AI_DETECTION_MODEL}",
        f"https://api-inference.huggingface.co/models/{AI_DETECTION_MODEL}",
    ]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-wait-for-model": "true"
    }

    last_error = None
    for hf_url in hf_endpoints:
        try:
            logger.info("Attempting AI detection via %s", hf_url)
            response = requests.post(
                hf_url,
                headers=headers,
                json={"inputs": payload_text},
                timeout=30
            )
            if response.status_code == 200:
                result_json = response.json()
                logger.info("AI detection inference succeeded using %s", hf_url)
                return {
                    "status": "SUCCESS",
                    "result": result_json,
                    "error": None
                }
            else:
                last_error = f"HTTP {response.status_code} from {hf_url}: {response.text[:300]}"
                logger.warning("HF endpoint %s returned HTTP %s: %s", hf_url, response.status_code, response.text[:300])
        except Exception as e:
            last_error = f"Connection error to {hf_url}: {str(e)}"
            logger.warning("HF endpoint %s connection failed: %s", hf_url, e)

    return {
        "status": "FAILED",
        "result": None,
        "error": last_error or "All Hugging Face Inference endpoints failed"
    }

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ScholarSync Document Analysis",
        "model": "all-MiniLM-L6-v2",
        "hf_token_configured": bool(os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN"))
    }

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_document(request: AnalyzeRequest):
    """
    Analyzes document text:
    1. Internal Similarity: SentenceTransformer all-MiniLM-L6-v2 vs previous submissions.
    2. AI Detection: Real Hugging Face roberta-base-openai-detector API call (never mocked/fabricated).
    3. Citation Analysis: Crossref REST API verification for DOIs/references.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document text cannot be empty.")

    # 1. Similarity (Internal Similarity)
    similarity_score: Optional[float] = None
    compared_count = 0
    valid_comparisons = [t.strip() for t in (request.comparison_texts or []) if t and t.strip()]

    if valid_comparisons:
        try:
            from sentence_transformers import util
            model = get_sentence_model()
            doc_embedding = model.encode(request.text, convert_to_tensor=True)
            comp_embeddings = model.encode(valid_comparisons, convert_to_tensor=True)
            cos_scores = util.cos_sim(doc_embedding, comp_embeddings)[0]
            max_sim = float(cos_scores.max().item())
            # Clamp to [0.0, 1.0]
            similarity_score = round(max(0.0, min(1.0, max_sim)), 4)
            compared_count = len(valid_comparisons)
        except Exception as e:
            logger.error(f"Failed to compute similarity: {e}")
            similarity_score = None
    else:
        # Explicit 0.0 when no previous submissions exist to compare against
        similarity_score = 0.0
        compared_count = 0

    # 2. AI Detection (Hugging Face Inference API)
    ai_resp = run_ai_detection(request.text)

    # 3. Citation Analysis (Crossref)
    citation_data = extract_dois_and_references(request.text)
    citation_items: List[CitationItem] = []

    for doi in citation_data["dois"]:
        item = verify_doi_crossref(doi)
        citation_items.append(item)

    for ref in citation_data["raw_references"]:
        citation_items.append(CitationItem(
            raw_reference=ref[:250],
            verified=False,
            message="Unverified citation without resolvable DOI"
        ))

    total_citations = len(citation_items)
    verified_citations = sum(1 for c in citation_items if c.verified)
    unverified_citations = total_citations - verified_citations

    # Overall analysis status:
    # If text analysis completed, status is COMPLETED.
    return AnalysisResponse(
        similarity_score=similarity_score,
        similarity_type="Internal Similarity",
        compared_documents_count=compared_count,
        ai_detection_status=ai_resp["status"],
        ai_detection_result=ai_resp["result"],
        ai_detection_error=ai_resp["error"],
        total_citations=total_citations,
        verified_citations=verified_citations,
        unverified_citations=unverified_citations,
        citation_details=citation_items,
        status="COMPLETED"
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
