import React, { useState, useEffect, useRef } from 'react';
import { projectApi } from '../api';
import type { Project, User } from '../types';
import { UserPlus, Search, Check, Loader2, UserCheck } from 'lucide-react';
import { ModalHeader, ErrorBar } from './CreateProjectModal';

interface AssignStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onStudentAssigned: (updatedProject: Project) => void;
}

export const AssignStudentModal: React.FC<AssignStudentModalProps> = ({
  isOpen, onClose, project, onStudentAssigned,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery(''); setSuggestions([]); setSelectedStudent(null); setError(null);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true); setError(null);
    timerRef.current = window.setTimeout(async () => {
      try {
        const results = await projectApi.getEligibleStudents(project.id, query);
        setSuggestions(results || []);
      } catch (err: any) {
        setError(err.message || 'Failed to search eligible students');
      } finally { setLoading(false); }
    }, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isOpen, query, project.id]);

  if (!isOpen) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) { setError('Please select a student from the suggestions'); return; }
    setAssigning(true); setError(null);
    try {
      const updated = await projectApi.addStudentToProject(project.id, selectedStudent.id);
      onStudentAssigned(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign student');
    } finally { setAssigning(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-strong animate-fade-up" style={{ width: '100%', maxWidth: 480 }}>
        <ModalHeader
          icon={<UserPlus size={17} style={{ color: '#93c5fd' }} />}
          title="Assign Student Researcher"
          subtitle={`Enroll into "${project.title}"`}
          onClose={onClose}
        />

        {error && <ErrorBar text={error} />}

        <form onSubmit={handleAssign} style={{ padding: '0 1.5rem 1.5rem', marginTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
            <input
              type="text" value={query} autoFocus
              onChange={(e) => { setQuery(e.target.value); setSelectedStudent(null); }}
              placeholder="Search student by name or email…"
              className="glass-input" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
            />
            {loading && <Loader2 size={13} className="animate-spin" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: '#93c5fd' }} />}
          </div>

          {/* Selected pill */}
          {selectedStudent && (
            <div style={{
              padding: '0.625rem 0.875rem', borderRadius: 12,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd',
                }}>
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedStudent.name}
                    <span className="font-mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', background: 'rgba(59,130,246,0.2)', borderRadius: 6, color: '#93c5fd' }}>
                      #{selectedStudent.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{selectedStudent.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>
                <UserCheck size={13} /> Selected
              </div>
            </div>
          )}

          {/* Suggestions list */}
          <div style={{
            maxHeight: 220, overflowY: 'auto',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}>
            {suggestions.length > 0 ? suggestions.map((student) => {
              const isSel = selectedStudent?.id === student.id;
              return (
                <button
                  key={student.id} type="button"
                  onClick={() => { setSelectedStudent(student); setError(null); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.625rem 0.875rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: isSel ? 'rgba(59,130,246,0.12)' : 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', transition: 'background 0.15s ease',
                  }}
                  onMouseOver={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseOut={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                    }}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#f0f6ff', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {student.name}
                        <span className="font-mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>#{student.id}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{student.email}</div>
                    </div>
                  </div>
                  {isSel ? (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} style={{ color: '#fff' }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)' }}>Select</span>
                  )}
                </button>
              );
            }) : (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                {loading ? 'Searching…' : query ? `No eligible students matching "${query}"` : 'No eligible students available.'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: '0.8rem' }}>Cancel</button>
            <button type="submit" disabled={assigning || !selectedStudent} className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {assigning ? <><Loader2 size={13} className="animate-spin" /> Assigning…</> : <><UserPlus size={13} /> Assign to Project</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
