import React, { useState } from 'react';
import type { Project, Task, TaskStateEnum, User } from '../types';
import { taskApi } from '../api';
import {
  ArrowLeft,
  UserPlus,
  Plus,
  Trash2,
  Package,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
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
}

const KANBAN_COLUMNS: { state: TaskStateEnum; title: string; color: string; border: string; bg: string }[] = [
  { state: 'PROPOSED', title: 'Proposed', color: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-500/10' },
  { state: 'LITERATURE_REVIEW', title: 'Literature Review', color: 'text-purple-400', border: 'border-purple-500/40', bg: 'bg-purple-500/10' },
  { state: 'EXPERIMENTATION', title: 'Experimentation', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
  { state: 'UNDER_REVIEW', title: 'Under Review', color: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10' },
  { state: 'APPROVED', title: 'Approved', color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
];

export const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({
  project,
  tasks,
  currentUser,
  onBack,
  onRefreshTasks,
  onOpenAssignStudent,
  onOpenCreateTask,
  onOpenDeliverables,
}) => {
  const [transitioningId, setTransitioningId] = useState<number | null>(null);

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
    if (!confirm('Are you sure you want to delete this research task?')) return;
    try {
      await taskApi.deleteTask(taskId);
      onRefreshTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Project Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </button>

          <div className="flex items-center gap-3">
            {isSupervisor && (
              <button
                onClick={onOpenAssignStudent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Assign Student
              </button>
            )}
            <button
              onClick={onOpenCreateTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-['Outfit']">
              {project.title}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
              Supervisor: {project.supervisor.name}
            </span>
          </div>

          {project.description && (
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {project.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Enrolled Students ({project.students.length}):</span>
            {project.students.length > 0 ? (
              project.students.map((student) => (
                <span
                  key={student.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-slate-300 border border-slate-800 text-[11px] font-medium flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {student.name}
                  <span className="text-slate-500 text-[10px]">#{student.id}</span>
                </span>
              ))
            ) : (
              <span className="text-slate-500 italic">No students assigned yet.</span>
            )}
          </div>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.currentState === col.state);

          return (
            <div
              key={col.state}
              className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.bg} border ${col.border}`}></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {col.title}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl shadow-sm transition-all group"
                  >
                    <div className="text-xs font-bold text-slate-100 leading-snug">
                      {task.title}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      {task.assignedStudent ? (
                        <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                          👤 {task.assignedStudent.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}

                      {isSupervisor && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded transition-opacity"
                          title="Delete task (Supervisor only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Deliverables Action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onOpenDeliverables(task)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Package className="w-3.5 h-3.5" />
                        Deliverables
                      </button>

                      {/* State Transition Actions based on State Pattern */}
                      <div className="flex items-center gap-1">
                        {task.currentState === 'PROPOSED' && (
                          <button
                            disabled={transitioningId === task.id}
                            onClick={() => handleTransition(task.id, 'LITERATURE_REVIEW')}
                            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/50"
                            title="Start Literature Review"
                          >
                            <span>Lit. Review</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {task.currentState === 'LITERATURE_REVIEW' && (
                          <>
                            <button
                              disabled={transitioningId === task.id}
                              onClick={() => handleTransition(task.id, 'PROPOSED')}
                              className="text-[11px] font-medium text-slate-400 hover:text-slate-300 p-1"
                              title="Revise Proposal"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              disabled={transitioningId === task.id}
                              onClick={() => handleTransition(task.id, 'EXPERIMENTATION')}
                              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50"
                            >
                              <span>Experiments</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {task.currentState === 'EXPERIMENTATION' && (
                          <>
                            <button
                              disabled={transitioningId === task.id}
                              onClick={() => handleTransition(task.id, 'LITERATURE_REVIEW')}
                              className="text-[11px] font-medium text-slate-400 hover:text-slate-300 p-1"
                              title="Revisit Literature"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              disabled={transitioningId === task.id}
                              onClick={() => handleTransition(task.id, 'UNDER_REVIEW')}
                              className="text-[11px] font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-0.5 px-2 py-0.5 rounded bg-yellow-950/60 border border-yellow-800/50"
                            >
                              <span>For Review</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {task.currentState === 'UNDER_REVIEW' && (
                          <>
                            {isSupervisor ? (
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={transitioningId === task.id}
                                  onClick={() => handleTransition(task.id, 'EXPERIMENTATION')}
                                  className="text-[10px] text-amber-400 p-1 rounded hover:bg-slate-800"
                                  title="Request Revisions"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                  disabled={transitioningId === task.id}
                                  onClick={() => handleTransition(task.id, 'APPROVED')}
                                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 flex items-center gap-0.5"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </>
                        )}

                        {task.currentState === 'APPROVED' && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-[11px] text-slate-600">
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
