import { useState, useEffect } from 'react';
import type { User, Project, Task } from './types';
import { authApi, projectApi, taskApi, setToken, getToken } from './api';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { ProjectKanbanView } from './components/ProjectKanbanView';
import { CreateProjectModal } from './components/CreateProjectModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { AssignStudentModal } from './components/AssignStudentModal';
import { DeliverablesModal } from './components/DeliverablesModal';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Navigation
  const [view, setView] = useState<'dashboard' | 'project'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);

  // Modals
  const [createProjOpen, setCreateProjOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [assignStudentOpen, setAssignStudentOpen] = useState(false);
  const [deliverablesTask, setDeliverablesTask] = useState<Task | null>(null);

  // Initialize Auth
  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (token) {
        try {
          const user = await authApi.getMe();
          setCurrentUser(user);
        } catch {
          setToken(null);
          setCurrentUser(null);
        }
      }
      setInitializing(false);
    };

    init();
  }, []);

  // Load Projects
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectApi.getProjects();
      setProjects(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadProjects();
    }
  }, [currentUser]);

  // Open Project & Load Tasks
  const handleOpenProject = async (projectId: number) => {
    try {
      const project = await projectApi.getProjectById(projectId);
      const tasks = await taskApi.getProjectTasks(projectId);
      setCurrentProject(project);
      setCurrentTasks(tasks || []);
      setView('project');
    } catch (err: any) {
      alert(err.message || 'Failed to open project');
    }
  };

  const handleRefreshTasks = async () => {
    if (!currentProject) return;
    try {
      const tasks = await taskApi.getProjectTasks(currentProject.id);
      setCurrentTasks(tasks || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setCurrentProject(null);
    setCurrentTasks([]);
    setProjects([]);
    setView('dashboard');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing ScholarSync...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar user={null} onLogout={handleLogout} />
        <AuthView onAuthSuccess={(user) => setCurrentUser(user)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar user={currentUser} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <DashboardView
            projects={projects}
            currentUser={currentUser}
            loading={projectsLoading}
            onOpenProject={handleOpenProject}
            onOpenCreateProject={() => setCreateProjOpen(true)}
          />
        ) : (
          currentProject && (
            <ProjectKanbanView
              project={currentProject}
              tasks={currentTasks}
              currentUser={currentUser}
              onBack={() => {
                setView('dashboard');
                loadProjects();
              }}
              onRefreshTasks={handleRefreshTasks}
              onOpenAssignStudent={() => setAssignStudentOpen(true)}
              onOpenCreateTask={() => setCreateTaskOpen(true)}
              onOpenDeliverables={(task) => setDeliverablesTask(task)}
            />
          )
        )}
      </main>

      {/* Modals */}
      <CreateProjectModal
        isOpen={createProjOpen}
        onClose={() => setCreateProjOpen(false)}
        onProjectCreated={(newProject) => {
          setProjects((prev) => [newProject, ...prev]);
        }}
      />

      {currentProject && (
        <>
          <CreateTaskModal
            isOpen={createTaskOpen}
            onClose={() => setCreateTaskOpen(false)}
            project={currentProject}
            onTaskCreated={(newTask) => {
              setCurrentTasks((prev) => [...prev, newTask]);
            }}
          />

          <AssignStudentModal
            isOpen={assignStudentOpen}
            onClose={() => setAssignStudentOpen(false)}
            project={currentProject}
            onStudentAssigned={(updatedProject) => {
              setCurrentProject(updatedProject);
              setProjects((prev) =>
                prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
              );
            }}
          />
        </>
      )}

      {deliverablesTask && (
        <DeliverablesModal
          isOpen={!!deliverablesTask}
          onClose={() => setDeliverablesTask(null)}
          task={deliverablesTask}
          currentUser={currentUser}
          onSubmissionsUpdated={handleRefreshTasks}
        />
      )}
    </div>
  );
}

export default App;
