import React from 'react';
import type { Project, User } from '../types';
import { Plus, Users, FolderKanban, ArrowRight, BookOpen, Loader2 } from 'lucide-react';

interface DashboardViewProps {
  projects: Project[];
  currentUser: User;
  loading: boolean;
  onOpenProject: (projectId: number) => void;
  onOpenCreateProject: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  currentUser,
  loading,
  onOpenProject,
  onOpenCreateProject,
}) => {
  const isSupervisor = currentUser.role === 'SUPERVISOR';

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 font-['Outfit']">Research Workspaces</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isSupervisor
              ? 'Manage collaborative academic projects, assign students, and oversee deliverable lifecycles.'
              : 'Workspaces where you are enrolled to execute research tasks and submit deliverables.'}
          </p>
        </div>

        {isSupervisor && (
          <button
            onClick={onOpenCreateProject}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            New Research Project
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-xs">Loading research projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No research projects found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {isSupervisor
              ? 'Click "+ New Research Project" above to create your first academic project workspace.'
              : 'You have not been assigned to any research projects yet. Contact your faculty supervisor.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all hover:translate-y-[-2px] group"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    ID: {project.id}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 mt-3 font-['Outfit'] group-hover:text-indigo-300 transition-colors">
                  {project.title}
                </h3>

                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {project.description || 'No project description provided.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>
                    Supervisor: <strong className="text-slate-300">{project.supervisor.name}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {project.students.length} {project.students.length === 1 ? 'student' : 'students'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>Open Kanban Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
