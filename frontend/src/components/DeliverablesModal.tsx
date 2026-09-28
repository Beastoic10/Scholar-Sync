import React, { useState, useEffect } from 'react';
import { submissionApi } from '../api';
import type { Task, Submission, SubmissionSnapshot, User, CitationDetail } from '../types';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Send,
  Camera,
  Plus,
  Loader2,
  FileText,
  UploadCloud,
  FileCheck,
  RefreshCw,
  Search,
  BookOpen,
  Cpu,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface DeliverablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  currentUser: User;
  onSubmissionsUpdated?: () => void;
}

export const DeliverablesModal: React.FC<DeliverablesModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUser,
  onSubmissionsUpdated,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New version form state
  const [submissionMode, setSubmissionMode] = useState<'upload' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newArtifact, setNewArtifact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Citations modal/toggle
  const [showCitationDetails, setShowCitationDetails] = useState(false);

  // Feedback input
  const [feedbackText, setFeedbackText] = useState('');

  // Snapshot modal
  const [snapshot, setSnapshot] = useState<SubmissionSnapshot | null>(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAssignedStudent = task.assignedStudent?.id === currentUser.id;
  const canSubmit = isSupervisor || isAssignedStudent || !task.assignedStudent;

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await submissionApi.getSubmissionsForTask(task.id);
      const sorted = (data || []).sort((a, b) => b.id - a.id);
      setSubmissions(sorted);
      if (sorted.length > 0) {
        // Keep currently selected submission if still present, or pick newest
        setSelectedSub((prev) => {
          if (!prev) return sorted[0];
          const found = sorted.find((s) => s.id === prev.id);
          return found || sorted[0];
        });
      } else {
        setSelectedSub(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deliverables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSubmissions();
    }
  }, [isOpen, task.id]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
        setError('Only PDF (.pdf) and Word (.docx) documents are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
      if (!newTitle.trim()) {
        // Automatically default title to clean document name
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setNewTitle(cleanName);
      }
    }
  };

  // Handle new submission creation (File upload or manual)
  const handleCreateSubmission = async (draft: boolean) => {
    if (submissionMode === 'upload') {
      if (!selectedFile) {
        setError('Please select a PDF or DOCX research file to upload.');
        return;
      }
    } else {
      if (!newTitle.trim()) {
        setError('Deliverable title is required');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      if (submissionMode === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', newTitle.trim() || selectedFile.name);
        if (newDesc.trim()) formData.append('description', newDesc.trim());
        if (draft) formData.append('draft', 'true');

        await submissionApi.uploadSubmission(task.id, formData);
      } else {
        await submissionApi.createSubmission(task.id, {
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          artifactLocation: newArtifact.trim() || undefined,
          draft,
        });
      }

      setNewTitle('');
      setNewDesc('');
      setNewArtifact('');
      setSelectedFile(null);
      await loadSubmissions();
      onSubmissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit deliverable');
    } finally {
      setSubmitting(false);
    }
  };

  // Supervisor actions
  const handleReview = async (id: number) => {
    setActionLoading(true);
    try {
      await submissionApi.reviewSubmission(id);
      await loadSubmissions();
      onSubmissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as under review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await submissionApi.approveSubmission(id, feedbackText.trim() || undefined);
      setFeedbackText('');
      await loadSubmissions();
      onSubmissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to approve submission');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(true);
    try {
      await submissionApi.rejectSubmission(id, feedbackText.trim() || undefined);
      setFeedbackText('');
      await loadSubmissions();
      onSubmissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to reject submission');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddFeedback = async (id: number) => {
    if (!feedbackText.trim()) return;
    setActionLoading(true);
    try {
      await submissionApi.addFeedback(id, feedbackText.trim());
      setFeedbackText('');
      await loadSubmissions();
    } catch (err: any) {
      setError(err.message || 'Failed to add feedback');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDraft = async (id: number) => {
    setActionLoading(true);
    try {
      await submissionApi.submitDraft(id);
      await loadSubmissions();
      onSubmissionsUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit draft');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReanalyze = async (id: number) => {
    setReanalyzing(true);
    setError(null);
    try {
      const updated = await submissionApi.reanalyzeSubmission(id);
      setSelectedSub(updated);
      await loadSubmissions();
    } catch (err: any) {
      setError(err.message || 'Analysis rerun failed');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleViewSnapshot = async (id: number) => {
    try {
      const snap = await submissionApi.getSnapshot(id);
      setSnapshot(snap);
      setShowSnapshotModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load snapshot');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-400 border border-red-800/60">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <Clock className="w-3 h-3" /> Under Review
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-950/80 text-sky-400 border border-sky-800/60">
            <Send className="w-3 h-3" /> Submitted
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
    }
  };

  // Helper to parse citations
  const parsedCitations: CitationDetail[] = React.useMemo(() => {
    if (!selectedSub?.analysisReport?.citationDetails) return [];
    try {
      return JSON.parse(selectedSub.analysisReport.citationDetails) || [];
    } catch {
      return [];
    }
  }, [selectedSub?.analysisReport?.citationDetails]);

  // Helper to render AI Detection result
  const renderAiDetection = (report: any) => {
    if (!report || report.status === 'PROCESSING') {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-400 py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing document...</span>
        </div>
      );
    }

    if (report.aiDetectionStatus === 'SUCCESS' && report.aiDetectionResult) {
      try {
        const parsed = typeof report.aiDetectionResult === 'string'
          ? JSON.parse(report.aiDetectionResult)
          : report.aiDetectionResult;

        // Hugging Face roberta-base-openai-detector typically returns [[{label: 'Fake', score: 0.9}, ...]]
        let items = Array.isArray(parsed) ? parsed : [];
        if (items.length > 0 && Array.isArray(items[0])) {
          items = items[0];
        }

        if (items.length > 0) {
          return (
            <div className="space-y-1.5 pt-1">
              {items.map((it: any, idx: number) => {
                const label = it.label || (idx === 0 ? 'Real' : 'Fake');
                const score = typeof it.score === 'number' ? it.score : 0;
                const isFake = label.toLowerCase().includes('fake');
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isFake ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {label}
                    </span>
                    <span className="font-mono text-slate-300 font-bold">
                      {(score * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }
      } catch {
        // Fallback to text
      }
    }

    // When external AI service is unavailable or failed, explicitly state it
    return (
      <div className="py-1">
        <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Analysis unavailable</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {report.aiDetectionError || 'External Hugging Face model did not return a valid response.'}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-5xl max-h-[94vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-['Outfit'] flex items-center gap-2">
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">Kanban State:</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                      {task.currentState.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      Assignee: <strong className="text-slate-200">{task.assignedStudent?.name || 'Unassigned'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Body with 2-Column Layout */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Version History Column (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-3 border-r-0 md:border-r border-slate-800/80 md:pr-6">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Version History ({submissions.length})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Immutable</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Loading versions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                  No deliverables submitted yet. Upload v1.0 below.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {submissions.map((sub) => {
                    const isSelected = selectedSub?.id === sub.id;
                    const report = sub.analysisReport;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSub(sub)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-slate-800/90 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-extrabold text-indigo-300 px-2 py-0.5 bg-indigo-950/60 rounded border border-indigo-800/50">
                            {sub.versionNumber}
                          </span>
                          {getStatusBadge(sub.status)}
                        </div>
                        <div className="text-xs font-semibold text-slate-200 mt-2 truncate flex items-center gap-1.5">
                          {sub.fileName ? (
                            <FileCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{sub.title}</span>
                        </div>

                        {/* Analysis quick badge */}
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          {report ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              report.status === 'COMPLETED'
                                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50'
                                : report.status === 'PROCESSING'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                                : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                            }`}>
                              <ShieldCheck className="w-3 h-3" />
                              {report.status}
                              {report.status === 'COMPLETED' && report.similarityScore !== null && report.similarityScore !== undefined && (
                                <span className="font-mono ml-0.5">({(report.similarityScore * 100).toFixed(0)}% sim)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">No document analysis</span>
                          )}

                          <span className="text-[11px] text-slate-500">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Submit New Version Box */}
              {canSubmit && (
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                      <Plus className="w-4 h-4 text-indigo-400" />
                      Submit New Version
                    </div>
                    {/* Toggle Mode */}
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSubmissionMode('upload')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          submissionMode === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        PDF/DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmissionMode('manual')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          submissionMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Link/Artifact
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/90">
                    {submissionMode === 'upload' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                          Research Document (PDF or DOCX)
                        </label>
                        <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/80 rounded-xl p-3 text-center bg-slate-900/60 transition-colors">
                          <input
                            type="file"
                            id="research-doc-upload"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label htmlFor="research-doc-upload" className="cursor-pointer block">
                            <UploadCloud className="w-6 h-6 mx-auto text-indigo-400 mb-1" />
                            {selectedFile ? (
                              <div className="text-xs font-semibold text-emerald-400 truncate max-w-xs mx-auto">
                                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-slate-300">Click to upload PDF or DOCX</span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">Real document extraction & verification</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Deliverable Title (e.g. Manuscript Draft v1)"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Summary of changes, methodology, or experiments..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    {submissionMode === 'manual' && (
                      <div>
                        <input
                          type="text"
                          value={newArtifact}
                          onChange={(e) => setNewArtifact(e.target.value)}
                          placeholder="Artifact Link (e.g. GitHub repo, Zenodo, Drive)"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleCreateSubmission(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        disabled={submitting || (submissionMode === 'upload' ? !selectedFile : !newTitle.trim())}
                        onClick={() => handleCreateSubmission(false)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {submissionMode === 'upload' ? 'Analyzing & Uploading...' : 'Submitting...'}
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            Submit Version
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Selected Version Details, Analysis & Supervisor Review (7 cols) */}
            <div className="md:col-span-7 flex flex-col">
              {selectedSub ? (
                <div className="space-y-4">
                  {/* Selected Version Header Card */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-indigo-300 px-2.5 py-0.5 bg-indigo-950/60 rounded border border-indigo-800/50">
                          {selectedSub.versionNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">{selectedSub.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedSub.status)}
                        <button
                          type="button"
                          onClick={() => handleViewSnapshot(selectedSub.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700"
                          title="View immutable Memento snapshot"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-400" />
                          Snapshot
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedSub.description || (
                        <span className="text-slate-500 italic">No description provided for this version.</span>
                      )}
                    </div>

                    {/* Stored Document File (PDF / DOCX) Card */}
                    {selectedSub.fileName && (
                      <div className="mt-3.5 p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 text-slate-200 truncate">
                          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-100 truncate">{selectedSub.fileName}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{selectedSub.filePath}</div>
                          </div>
                        </div>
                        <a
                          href={submissionApi.getFileUrl(selectedSub.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={selectedSub.fileName}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 ml-3"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View File
                        </a>
                      </div>
                    )}

                    {selectedSub.artifactLocation && (
                      <div className="mt-2.5 p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-300 truncate">
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-mono text-indigo-300 truncate">{selectedSub.artifactLocation}</span>
                        </div>
                        <a
                          href={selectedSub.artifactLocation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 p-1 hover:bg-slate-800 rounded shrink-0 ml-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Submitted by: <strong className="text-slate-400">{selectedSub.submittedBy.name}</strong></span>
                      <span>{new Date(selectedSub.createdAt).toLocaleString()}</span>
                    </div>

                    {/* Draft submission action */}
                    {selectedSub.status === 'DRAFT' && selectedSub.submittedBy.id === currentUser.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-end">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleSubmitDraft(selectedSub.id)}
                          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit Draft for Review
                        </button>
                      </div>
                    )}
                  </div>

                  {/* REAL DOCUMENT ANALYSIS REPORT CARD */}
                  <div className="bg-slate-950/70 border border-cyan-900/40 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-['Outfit']">
                          Automated Document Analysis Report
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedSub.analysisReport?.status === 'COMPLETED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            COMPLETED
                          </span>
                        ) : selectedSub.analysisReport?.status === 'PROCESSING' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/50 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> PROCESSING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/50">
                            FAILED
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={reanalyzing}
                          onClick={() => handleReanalyze(selectedSub.id)}
                          className="text-slate-400 hover:text-cyan-300 p-1 hover:bg-slate-800 rounded transition-colors"
                          title="Rerun document analysis"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin text-cyan-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {selectedSub.analysisReport ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
                        {/* 1. Internal Similarity */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
                              <Search className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Internal Similarity</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Compared against {selectedSub.analysisReport.comparedDocumentsCount || 0} ScholarSync documents
                            </div>
                          </div>

                          <div className="mt-3">
                            {selectedSub.analysisReport.similarityScore !== null && selectedSub.analysisReport.similarityScore !== undefined ? (
                              <div>
                                <div className="text-xl font-bold font-mono text-cyan-300">
                                  {(selectedSub.analysisReport.similarityScore * 100).toFixed(1)}%
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      selectedSub.analysisReport.similarityScore > 0.4
                                        ? 'bg-rose-500'
                                        : selectedSub.analysisReport.similarityScore > 0.2
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(5, selectedSub.analysisReport.similarityScore * 100))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-amber-400/90 font-medium">Analysis unavailable</div>
                            )}
                          </div>
                        </div>

                        {/* 2. AI Writing Detection */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
                              <Cpu className="w-3.5 h-3.5 text-purple-400" />
                              <span>AI Writing Detection</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Hugging Face roberta-base-openai-detector
                            </div>
                          </div>

                          <div className="mt-2">
                            {renderAiDetection(selectedSub.analysisReport)}
                          </div>
                        </div>

                        {/* 3. Citation Verification */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Citation Verification</span>
                              </div>
                              {parsedCitations.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setShowCitationDetails(!showCitationDetails)}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                                >
                                  {showCitationDetails ? 'Hide' : 'Details'}
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">Crossref REST API</div>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Total References:</span>
                              <span className="font-mono text-slate-200 font-semibold">{selectedSub.analysisReport.totalCitations}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-400">Verified:</span>
                              <span className="font-mono text-emerald-400 font-bold">{selectedSub.analysisReport.verifiedCitations}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Unverified:</span>
                              <span className="font-mono text-slate-300 font-semibold">{selectedSub.analysisReport.unverifiedCitations}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-500">
                        No automated document analysis report has been generated for this version yet.
                      </div>
                    )}

                    {/* Expandable Citation Details List */}
                    {showCitationDetails && parsedCitations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 max-h-40 overflow-y-auto">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Extracted Citations & Verification Trail
                        </div>
                        {parsedCitations.map((cit, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-xs border ${
                              cit.verified
                                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono font-semibold">{cit.doi ? `DOI: ${cit.doi}` : 'Reference'}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                cit.verified ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {cit.verified ? 'VERIFIED' : 'UNVERIFIED'}
                              </span>
                            </div>
                            {cit.title && <div className="text-slate-100 font-medium mt-0.5">{cit.title}</div>}
                            {cit.container_title && <div className="text-[10px] text-slate-400">{cit.container_title}</div>}
                            {cit.raw_reference && <div className="text-[10px] text-slate-400 truncate mt-0.5">{cit.raw_reference}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Supervisor Review Controls */}
                  {isSupervisor && (
                    <div className="p-4 bg-slate-950/70 border border-purple-900/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          Supervisor Decision: {selectedSub.versionNumber}
                        </span>
                        <span className="text-[11px] text-slate-500">Permanently records review</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedSub.status !== 'UNDER_REVIEW' && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleReview(selectedSub.id)}
                            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Mark Under Review
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleApprove(selectedSub.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Version
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleReject(selectedSub.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject Version
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback Thread */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      Supervisor Feedback Thread ({selectedSub.feedbackList?.length || 0})
                    </div>

                    <div className="space-y-2.5 max-h-44 overflow-y-auto mb-3">
                      {selectedSub.feedbackList && selectedSub.feedbackList.length > 0 ? (
                        selectedSub.feedbackList.map((fb) => (
                          <div
                            key={fb.id}
                            className="p-3 bg-slate-900/90 border-l-2 border-indigo-500 rounded-r-lg text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                              <span className="font-semibold text-indigo-300">{fb.supervisor.name}</span>
                              <span>{new Date(fb.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-200">{fb.comment}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-500">
                          No feedback on this version yet.
                        </div>
                      )}
                    </div>

                    {isSupervisor && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Add supervisor feedback on this version..."
                          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={actionLoading || !feedbackText.trim()}
                          onClick={() => handleAddFeedback(selectedSub.id)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
                  <Package className="w-10 h-10 text-slate-700 mb-2" />
                  <p className="text-xs">Select a version from the left to view document details and analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Modal */}
      {showSnapshotModal && snapshot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-100 font-['Outfit']">
                  Immutable Deliverable Snapshot (Memento)
                </h4>
              </div>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 mb-3">
              Cryptographically verified snapshot captured at the exact moment of version submission:
            </p>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
