package com.scholarsync.service.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.entity.AnalysisReport;
import com.scholarsync.entity.AnalysisStatus;
import com.scholarsync.entity.ResearchSubmission;
import com.scholarsync.repository.AnalysisReportRepository;
import com.scholarsync.repository.ResearchSubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FastApiAnalysisService implements DocumentAnalysisService {

    private final AnalysisReportRepository analysisReportRepository;
    private final ResearchSubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    @Value("${analysis.service.url:http://localhost:8000}")
    private String analysisServiceUrl;

    @Override
    @Transactional
    public AnalysisReport analyzeSubmission(ResearchSubmission submission) {
        log.info("Starting document analysis for submission id: '{}', version: '{}'",
                submission.getId(), submission.getVersionNumber());

        AnalysisReport report = analysisReportRepository.findBySubmissionId(submission.getId())
                .orElseGet(() -> AnalysisReport.builder()
                        .submission(submission)
                        .status(AnalysisStatus.PROCESSING)
                        .build());

        report.setStatus(AnalysisStatus.PROCESSING);
        report = analysisReportRepository.save(report);

        String text = submission.getExtractedText();
        if (text == null || text.trim().isEmpty()) {
            report.setStatus(AnalysisStatus.FAILED);
            report.setFailureReason("No text extracted from document. Analysis cannot proceed.");
            report.setAiDetectionStatus("UNAVAILABLE");
            report.setAiDetectionError("Empty document content");
            report.setAnalyzedAt(Instant.now());
            log.warn("Submission id '{}' has no extracted text. Marked analysis as FAILED.", submission.getId());
            return analysisReportRepository.save(report);
        }

        try {
            // Gather all other submission texts across the platform for Internal Similarity comparison
            List<String> comparisonTexts = submissionRepository.findExtractedTextsForComparison(submission.getId());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", text);
            requestBody.put("comparison_texts", comparisonTexts != null ? comparisonTexts : Collections.emptyList());

            RestTemplate restTemplate = new RestTemplateBuilder()
                    .setConnectTimeout(Duration.ofSeconds(10))
                    .setReadTimeout(Duration.ofSeconds(60))
                    .build();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            String endpoint = analysisServiceUrl.replaceAll("/+$", "") + "/analyze";
            log.info("Dispatching analysis request to FastAPI at: {}", endpoint);

            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());

                Double similarityScore = root.hasNonNull("similarity_score")
                        ? root.get("similarity_score").asDouble()
                        : 0.0;
                String similarityType = root.hasNonNull("similarity_type")
                        ? root.get("similarity_type").asText()
                        : "Internal Similarity";
                int comparedDocs = root.hasNonNull("compared_documents_count")
                        ? root.get("compared_documents_count").asInt()
                        : 0;

                String aiStatus = root.hasNonNull("ai_detection_status")
                        ? root.get("ai_detection_status").asText()
                        : "UNAVAILABLE";
                String aiResult = root.hasNonNull("ai_detection_result")
                        ? objectMapper.writeValueAsString(root.get("ai_detection_result"))
                        : null;
                String aiError = root.hasNonNull("ai_detection_error")
                        ? root.get("ai_detection_error").asText()
                        : null;

                int totalCitations = root.hasNonNull("total_citations") ? root.get("total_citations").asInt() : 0;
                int verifiedCitations = root.hasNonNull("verified_citations") ? root.get("verified_citations").asInt() : 0;
                int unverifiedCitations = root.hasNonNull("unverified_citations") ? root.get("unverified_citations").asInt() : 0;
                String citationDetails = root.hasNonNull("citation_details")
                        ? objectMapper.writeValueAsString(root.get("citation_details"))
                        : null;

                report.setSimilarityScore(similarityScore);
                report.setSimilarityType(similarityType);
                report.setComparedDocumentsCount(comparedDocs);
                report.setAiDetectionStatus(aiStatus);
                report.setAiDetectionResult(aiResult);
                report.setAiDetectionError(aiError);
                report.setTotalCitations(totalCitations);
                report.setVerifiedCitations(verifiedCitations);
                report.setUnverifiedCitations(unverifiedCitations);
                report.setCitationDetails(citationDetails);
                report.setStatus(AnalysisStatus.COMPLETED);
                report.setFailureReason(null);
                report.setAnalyzedAt(Instant.now());

                log.info("Analysis COMPLETED for submission id: '{}'. Similarity: {}, Citations: {}/{}, AI Status: {}",
                        submission.getId(), similarityScore, verifiedCitations, totalCitations, aiStatus);
            } else {
                report.setStatus(AnalysisStatus.FAILED);
                report.setFailureReason("FastAPI analysis service returned non-2xx status: " + response.getStatusCode());
                report.setAiDetectionStatus("UNAVAILABLE");
                report.setAiDetectionError("Service error");
                report.setAnalyzedAt(Instant.now());
                log.warn("FastAPI service returned error for submission id: '{}': {}", submission.getId(), response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to execute document analysis for submission id: '{}': {}", submission.getId(), e.getMessage());
            report.setStatus(AnalysisStatus.FAILED);
            report.setFailureReason("Analysis unavailable: " + (e.getMessage() != null ? e.getMessage() : "Connection failed"));
            report.setAiDetectionStatus("UNAVAILABLE");
            report.setAiDetectionError("Service unreachable or failed");
            report.setAnalyzedAt(Instant.now());
        }

        return analysisReportRepository.save(report);
    }
}
