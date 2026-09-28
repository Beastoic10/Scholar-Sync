import React from 'react';
import type { Project, User } from '../types';
import { Plus, Users, FolderKanban, ArrowRight, BookOpen, Loader2, FlaskConical } from 'lucide-react';

interface DashboardViewProps {
  projects: Project[];
  currentUser: User;
  loading: boolean;
  onOpenProject: (projectId: number) => void;
  onOpenCreateProject: () => void;
}

const PALETTE = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects, currentUser, loading, onOpenProject, onOpenCreateProject,
}) => {
  const isSupervisor = currentUser.role === 'SUPERVISOR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Hero Header ── */}
      <div className="glass animate-fade-up" style={{ padding: '1.75rem 2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FlaskConical size={18} style={{ color: '#93c5fd' }} />
            </div>
            <h1 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f0f6ff' }}>
              Research Workspaces
            </h1>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', maxWidth: 520, lineHeight: 1.6 }}>
            {isSupervisor
              ? 'Manage collaborative academic projects, assign students, and oversee deliverable lifecycles.'
              : 'Workspaces where you are enrolled to execute research tasks and submit deliverables.'}
          </p>
        </div>
        {isSupervisor && (
          <button onClick={onOpenCreateProject} className="btn-primary" style={{ fontSize: '0.8125rem' }}>
            <Plus size={15} />
            New Project
          </button>
        )}
      </div>

      {/* ── Stats row (supervisor) ── */}
      {isSupervisor && !loading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
          {[
            { label: 'Total Projects', value: projects.length, color: '#60a5fa' },
            { label: 'Total Students', value: projects.reduce((a, p) => a + p.students.length, 0), color: '#a78bfa' },
            { label: 'Active Projects', value: projects.length, color: '#34d399' },
          ].map((s) => (
            <div key={s.label} className="glass animate-fade-up" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, fontFamily: 'Outfit,sans-serif', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.35rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Projects Grid ── */}
      {loading ? (
        <div style={{ padding: '5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.35)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#60a5fa' }} />
          <span style={{ fontSize: '0.8125rem' }}>Loading research projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass" style={{
          padding: '5rem 2rem', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <BookOpen size={44} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '1rem' }} />
          <div className="font-display" style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
            No research projects found
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.3)', maxWidth: 380 }}>
            {isSupervisor
              ? 'Click "New Project" above to create your first academic research project.'
              : 'You have not been assigned to any projects yet. Contact your faculty supervisor.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {projects.map((project, i) => {
            const accent = PALETTE[i % PALETTE.length];
            return (
              <div
                key={project.id}
                className="glass glass-hover animate-fade-up"
                style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', animationDelay: `${i * 0.04}s` }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: `${accent}22`, border: `1px solid ${accent}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FolderKanban size={16} style={{ color: accent }} />
                  </div>
                  <span className="font-mono badge badge-draft" style={{ fontSize: '0.65rem' }}>
                    #{project.id}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display" style={{ fontSize: '0.975rem', fontWeight: 700, color: '#f0f6ff', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {project.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)',
                  lineHeight: 1.6, flex: 1,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {project.description || 'No project description provided.'}
                </p>

                {/* Accent bar */}
                <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}55, transparent)`, borderRadius: 999, margin: '0.9rem 0 0.75rem' }} />

                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)' }}>
                    Supervisor: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{project.supervisor.name}</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    <Users size={12} />
                    {project.students.length} {project.students.length === 1 ? 'student' : 'students'}
                  </span>
                </div>

                {/* Open button */}
                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '0.55rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    background: `${accent}18`, border: `1px solid ${accent}35`,
                    color: accent, transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = `${accent}30`; e.currentTarget.style.borderColor = `${accent}60`; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = `${accent}18`; e.currentTarget.style.borderColor = `${accent}35`; }}
                >
                  Open Kanban Board
                  <ArrowRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
