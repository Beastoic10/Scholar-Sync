import React, { useState } from 'react';
import type { Project, Task, TaskStateEnum, User } from '../types';
import { taskApi } from '../api';
import {
  ArrowLeft, UserPlus, Plus, Trash2, Package,
  ArrowRight, RotateCcw, CheckCircle2, Clock,
  MessageSquare, Edit3,
} from 'lucide-react';

interface ProjectKanbanViewProps {
  project: Project;
  tasks: Task[];
  currentUser: User;
  onBack: () => void;
  onRefreshTasks: () => void;
  onOpenAssignStudent: () => void;
  onOpenCreateTask: () => void;
  onOpenDeliverables: (task: Task) => void;
  onOpenChat: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
}

type ColDef = {
  state: TaskStateEnum;
  title: string;
  accent: string;
  glow: string;
};

const COLUMNS: ColDef[] = [
  { state: 'PROPOSED',         title: 'Proposed',         accent: '#38bdf8', glow: 'rgba(56,189,248,0.18)' },
  { state: 'LITERATURE_REVIEW',title: 'Lit. Review',      accent: '#a78bfa', glow: 'rgba(167,139,250,0.18)' },
  { state: 'EXPERIMENTATION',  title: 'Experimentation',  accent: '#fbbf24', glow: 'rgba(251,191,36,0.18)' },
  { state: 'UNDER_REVIEW',     title: 'Under Review',     accent: '#fb923c', glow: 'rgba(251,146,60,0.18)' },
  { state: 'APPROVED',         title: 'Approved',         accent: '#34d399', glow: 'rgba(52,211,153,0.18)' },
];

/**
 * Validates whether a state transition is permitted according to the strict state flow:
 * PROPOSED → LITERATURE_REVIEW → EXPERIMENTATION → UNDER_REVIEW → APPROVED
 * - Students cannot skip states or approve tasks (UNDER_REVIEW → APPROVED is supervisor only).
 * - Students cannot perform backward transitions.
 * - Supervisor can perform backward transitions (for revision) and UNDER_REVIEW → APPROVED.
 */
export const isValidTransition = (
  fromState: TaskStateEnum,
  toState: TaskStateEnum,
  isSupervisor: boolean
): boolean => {
  if (fromState === toState) return false;
  switch (fromState) {
    case 'PROPOSED':
      return toState === 'LITERATURE_REVIEW';
    case 'LITERATURE_REVIEW':
      return toState === 'EXPERIMENTATION' || (isSupervisor && toState === 'PROPOSED');
    case 'EXPERIMENTATION':
      return toState === 'UNDER_REVIEW' || (isSupervisor && toState === 'LITERATURE_REVIEW');
    case 'UNDER_REVIEW':
      return isSupervisor && (toState === 'APPROVED' || toState === 'EXPERIMENTATION');
    case 'APPROVED':
    default:
      return false;
  }
};

/**
 * Checks if a task can be dragged by the current user:
 * - Tasks in APPROVED cannot be dragged (terminal state).
 * - Tasks in UNDER_REVIEW cannot be dragged by students (students cannot approve or send back).
 */
export const canDragTask = (task: Task, isSupervisor: boolean): boolean => {
  if (task.currentState === 'APPROVED') return false;
  if (task.currentState === 'UNDER_REVIEW' && !isSupervisor) return false;
  return true;
};

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  project, tasks, currentUser, onBack, onRefreshTasks,
  onOpenAssignStudent, onOpenCreateTask, onOpenDeliverables,
  onOpenChat, onOpenEditTask,
}) => {
  const [transitioningId, setTransitioningId] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStateEnum | null>(null);
  const isSupervisor = currentUser.role === 'SUPERVISOR';

  const handleTransition = async (taskId: number, targetState: TaskStateEnum) => {
    setTransitioningId(taskId);
    try {
      await taskApi.transitionTask(taskId, targetState);
      onRefreshTasks();
    } catch (err: any) {
      alert(err.message || 'Transition failed');
    } finally {
      setTransitioningId(null);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Delete this research task?')) return;
    try {
      await taskApi.deleteTask(taskId);
      onRefreshTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Project Header ── */}
      <div className="glass animate-fade-up" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <button onClick={onBack} className="btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
            <ArrowLeft size={13} />
            All Projects
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSupervisor && (
              <button onClick={onOpenAssignStudent} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
                <UserPlus size={13} />
                Assign Student
              </button>
            )}
            <button onClick={onOpenCreateTask} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
              <Plus size={14} />
              Create Task
            </button>
          </div>
        </div>

        <hr className="glow-divider" style={{ marginBottom: '0.9rem' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0.5rem 1rem' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f6ff', marginBottom: '0.35rem' }}>
              {project.title}
            </h1>
            {project.description && (
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, maxWidth: 560 }}>
                {project.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="badge badge-supervisor">Supervisor: {project.supervisor.name}</span>
            {project.students.map((s) => (
              <span key={s.id} className="badge badge-student">
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                {s.name}
              </span>
            ))}
            {project.students.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No students assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '0.875rem',
        minHeight: 0,
      }}>
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.currentState === col.state);
          const isDropTargetValid = draggedTask
            ? isValidTransition(draggedTask.currentState, col.state, isSupervisor)
            : false;
          const isCurrentDragOver = dragOverCol === col.state && isDropTargetValid;

          return (
            <div
              key={col.state}
              className="kanban-col animate-fade-up"
              onDragOver={(e) => {
                if (draggedTask && isValidTransition(draggedTask.currentState, col.state, isSupervisor)) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverCol !== col.state) {
                    setDragOverCol(col.state);
                  }
                } else {
                  e.dataTransfer.dropEffect = 'none';
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverCol === col.state) {
                    setDragOverCol(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                if (!draggedTask) return;
                if (!isValidTransition(draggedTask.currentState, col.state, isSupervisor)) {
                  setDraggedTask(null);
                  return;
                }
                const taskId = draggedTask.id;
                setDraggedTask(null);
                handleTransition(taskId, col.state);
              }}
              style={{
                outline: isCurrentDragOver
                  ? `2px dashed ${col.accent}`
                  : (draggedTask && isDropTargetValid ? `1px dashed ${col.accent}60` : undefined),
                outlineOffset: -2,
                boxShadow: isCurrentDragOver ? `0 0 16px ${col.glow}` : undefined,
                transition: 'outline 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: '0.75rem', marginBottom: '0.75rem',
                borderBottom: `1px solid ${col.accent}30`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.accent, boxShadow: `0 0 8px ${col.accent}` }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: col.accent }}>
                    {col.title}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                  padding: '0.15rem 0.5rem', borderRadius: 999,
                  background: `${col.accent}18`, color: col.accent, border: `1px solid ${col.accent}30`,
                }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem', overflowY: 'auto' }}>
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    col={col}
                    isSupervisor={isSupervisor}
                    transitioningId={transitioningId}
                    isDragging={draggedTask?.id === task.id}
                    onTransition={handleTransition}
                    onDelete={handleDeleteTask}
                    onOpenDeliverables={onOpenDeliverables}
                    onOpenChat={onOpenChat}
                    onOpenEditTask={onOpenEditTask}
                    onDragStart={(t) => setDraggedTask(t)}
                    onDragEnd={() => {
                      setDraggedTask(null);
                      setDragOverCol(null);
                    }}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px dashed ${col.accent}20`, borderRadius: 12,
                    minHeight: 80, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)',
                  }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Task Card ────────────────────────────────────────────────── */
function TaskCard({
  task, col, isSupervisor, transitioningId, isDragging,
  onTransition, onDelete, onOpenDeliverables, onOpenChat, onOpenEditTask, onDragStart, onDragEnd,
}: {
  task: Task;
  col: ColDef;
  isSupervisor: boolean;
  transitioningId: number | null;
  isDragging: boolean;
  onTransition: (id: number, state: TaskStateEnum) => void;
  onDelete: (id: number) => void;
  onOpenDeliverables: (task: Task) => void;
  onOpenChat: (task: Task) => void;
  onOpenEditTask: (task: Task) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
}) {
  const busy = transitioningId === task.id;
  const draggable = canDragTask(task, isSupervisor) && !busy;

  const assignedList = task.assignedStudents && task.assignedStudents.length > 0
    ? task.assignedStudents
    : (task.assignedStudent ? [task.assignedStudent] : []);

  return (
    <div
      className="kanban-card"
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task);
      }}
      onDragEnd={() => {
        onDragEnd();
      }}
      style={{
        position: 'relative',
        borderLeft: `2px solid ${col.accent}50`,
        cursor: draggable ? 'grab' : 'default',
        opacity: busy ? 0.5 : (isDragging ? 0.35 : 1),
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      }}
    >
      {/* Title */}
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f0f6ff', lineHeight: 1.35, marginBottom: '0.35rem' }}>
        {task.title}
      </div>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          marginBottom: '0.5rem',
        }}>
          {task.description}
        </p>
      )}

      {/* Assignees */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
          {assignedList.length > 0 ? (
            assignedList.map((s) => (
              <span key={s.id} className="badge badge-student" style={{ fontSize: '0.65rem' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                {s.name}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Unassigned</span>
          )}
        </div>
        {isSupervisor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={() => onOpenEditTask(task)}
              title="Edit task & assignments"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.3)', borderRadius: 6, transition: 'color 0.15s ease' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#93c5fd'}
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              title="Delete task"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, color: 'rgba(255,255,255,0.3)', borderRadius: 6, transition: 'color 0.15s ease' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: '0.6rem' }} />

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Deliverables */}
          <button
            type="button"
            onClick={() => onOpenDeliverables(task)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.7rem', fontWeight: 600, color: '#93c5fd',
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
              transition: 'color 0.15s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
            onMouseOut={(e) => e.currentTarget.style.color = '#93c5fd'}
          >
            <Package size={11} />
            Deliverables
          </button>

          {/* Discussion / Chat */}
          <button
            type="button"
            onClick={() => onOpenChat(task)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.7rem', fontWeight: 600, color: '#38bdf8',
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
              transition: 'color 0.15s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#7dd3fc'}
            onMouseOut={(e) => e.currentTarget.style.color = '#38bdf8'}
          >
            <MessageSquare size={11} />
            Discussion
          </button>
        </div>

        {/* Transitions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {task.currentState === 'PROPOSED' && (
            <TransBtn disabled={busy} color="#38bdf8" onClick={() => onTransition(task.id, 'LITERATURE_REVIEW')}>
              Lit. Review <ArrowRight size={10} />
            </TransBtn>
          )}

          {task.currentState === 'LITERATURE_REVIEW' && (<>
            {isSupervisor && <BackBtn disabled={busy} onClick={() => onTransition(task.id, 'PROPOSED')} title="Send back to Proposed" />}
            <TransBtn disabled={busy} color="#fbbf24" onClick={() => onTransition(task.id, 'EXPERIMENTATION')}>
              Experiment <ArrowRight size={10} />
            </TransBtn>
          </>)}

          {task.currentState === 'EXPERIMENTATION' && (<>
            {isSupervisor && <BackBtn disabled={busy} onClick={() => onTransition(task.id, 'LITERATURE_REVIEW')} title="Send back to Lit. Review" />}
            <TransBtn disabled={busy} color="#fb923c" onClick={() => onTransition(task.id, 'UNDER_REVIEW')}>
              Review <ArrowRight size={10} />
            </TransBtn>
          </>)}

          {task.currentState === 'UNDER_REVIEW' && (
            isSupervisor ? (<>
              <BackBtn disabled={busy} onClick={() => onTransition(task.id, 'EXPERIMENTATION')} title="Send back to Experimentation" />
              <TransBtn disabled={busy} color="#34d399" onClick={() => onTransition(task.id, 'APPROVED')}>
                <CheckCircle2 size={10} /> Approve
              </TransBtn>
            </>) : (
              <span style={{ fontSize: '0.65rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> Awaiting
              </span>
            )
          )}

          {task.currentState === 'APPROVED' && (
            <span style={{ fontSize: '0.65rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
              <CheckCircle2 size={10} /> Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TransBtn({ children, color, disabled, onClick }: { children: React.ReactNode; color: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
        background: `${color}18`, border: `1px solid ${color}35`,
        color, borderRadius: 7, padding: '0.2rem 0.4rem',
        transition: 'all 0.15s ease', opacity: disabled ? 0.5 : 1,
      }}
      onMouseOver={(e) => { if (!disabled) e.currentTarget.style.background = `${color}30`; }}
      onMouseOut={(e) => { e.currentTarget.style.background = `${color}18`; }}
    >
      {children}
    </button>
  );
}

function BackBtn({ disabled, onClick, title }: { disabled: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={title || "Go back"}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 7, padding: '0.2rem 0.35rem', cursor: 'pointer',
        color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s ease', opacity: disabled ? 0.5 : 1,
        display: 'inline-flex', alignItems: 'center',
      }}
      onMouseOver={(e) => { if (!disabled) { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; } }}
      onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
    >
      <RotateCcw size={10} />
    </button>
  );
}
