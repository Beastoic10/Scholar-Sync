import React, { useState, useEffect } from 'react';
import { submissionApi } from '../api';
import type { Task, Submission, SubmissionSnapshot, User } from '../types';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  ExternalLink,
  MessageSquare,
  Send,
  Camera,
  Plus,
  Loader2,
  FileText,
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
  const [error, setError] = useState<string | null>(null);

  // New version form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newArtifact, setNewArtifact] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      // Sort newest first for version history display
      const sorted = (data || []).sort((a, b) => b.id - a.id);
      setSubmissions(sorted);
      if (sorted.length > 0) {
        setSelectedSub(sorted[0]);
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

  // Handle new submission creation
  const handleCreateSubmission = async (draft: boolean) => {
    if (!newTitle.trim()) {
      setError('Deliverable title is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submissionApi.createSubmission(task.id, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        artifactLocation: newArtifact.trim() || undefined,
        draft,
      });

      setNewTitle('');
      setNewDesc('');
      setNewArtifact('');
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
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
            <div className="mx-6 mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
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
                  No deliverables submitted yet. Create v1.0 below.
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const isSelected = selectedSub?.id === sub.id;
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
                        <div className="text-xs font-semibold text-slate-200 mt-2 truncate">
                          {sub.title}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                          <span>{sub.submittedBy.name}</span>
                          <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Submit New Version Accordion / Box */}
              {canSubmit && (
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    Submit New Version
                  </div>
                  <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/90">
                    <div>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Deliverable Title (e.g. Model Weights & Report)"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <textarea
                        rows={2}
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Version description, changes, metrics..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newArtifact}
                        onChange={(e) => setNewArtifact(e.target.value)}
                        placeholder="Artifact Link (URL / Repo / Drive)"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
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
                        disabled={submitting || !newTitle.trim()}
                        onClick={() => handleCreateSubmission(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                      >
                        {submitting ? 'Submitting...' : 'Submit Version'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Selected Version Details & Supervisor Feedback (7 cols) */}
            <div className="md:col-span-7 flex flex-col">
              {selectedSub ? (
                <div className="space-y-4">
                  {/* Selected Version Card */}
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

                    {selectedSub.artifactLocation && (
                      <div className="mt-3.5 p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-300 truncate">
                          <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
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

                    <div className="space-y-2.5 max-h-48 overflow-y-auto mb-3">
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
                  <p className="text-xs">Select a version from the left to view details and feedback.</p>
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
