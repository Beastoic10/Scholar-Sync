import React, { useState } from 'react';
import { projectApi } from '../api';
import type { Project } from '../types';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen, onClose, onProjectCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newProj = await projectApi.createProject({ title: title.trim(), description: description.trim() || undefined });
      setTitle(''); setDescription('');
      onProjectCreated(newProj);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-strong animate-fade-up" style={{ width: '100%', maxWidth: 480 }}>
        <ModalHeader icon={<FolderPlus size={17} style={{ color: '#93c5fd' }} />} title="New Research Project" subtitle="Initializes in PROPOSED state" onClose={onClose} />

        {error && <ErrorBar text={error} />}

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <FieldLabel label="Project Title" required>
            <input
              type="text" required value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. LLM Reasoning Alignment & Formal Proofs"
              className="glass-input"
            />
          </FieldLabel>

          <FieldLabel label="Description & Objectives">
            <textarea
              rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hypotheses, methodological scope, expected publications..."
              className="glass-input" style={{ resize: 'none' }}
            />
          </FieldLabel>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: '0.8rem' }}>Cancel</button>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Shared helpers ───────────────────────────────────────────── */
export function ModalHeader({ icon, title, subtitle, onClose }: { icon: React.ReactNode; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
        <div>
          <div className="font-display" style={{ fontSize: '0.975rem', fontWeight: 700, color: '#f0f6ff' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, borderRadius: 7, transition: 'all 0.15s ease' }}
        onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'none'; }}>
        <X size={17} />
      </button>
    </div>
  );
}

export function ErrorBar({ text }: { text: string }) {
  return (
    <div style={{
      margin: '0.75rem 1.5rem 0',
      padding: '0.5rem 0.75rem',
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)',
      borderRadius: 10, display: 'flex', alignItems: 'center', gap: 7,
      fontSize: '0.775rem', color: '#fca5a5',
    }}>
      <AlertCircle size={13} style={{ flexShrink: 0 }} />{text}
    </div>
  );
}

export function FieldLabel({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
