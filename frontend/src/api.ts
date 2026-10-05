import type { Project, Task, TaskStateEnum, Submission, SubmissionFeedback, SubmissionSnapshot, User, TaskChat, ChatMessage } from './types';

const TOKEN_KEY = 'scholarsync_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// AUTH
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiCall<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (payload: { name: string; email: string; password: string; role: string }) =>
    apiCall<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiCall<User>('/api/auth/me'),
};

// PROJECTS
export const projectApi = {
  getProjects: () => apiCall<Project[]>('/api/projects'),

  getProjectById: (id: number) => apiCall<Project>(`/api/projects/${id}`),

  createProject: (payload: { title: string; description?: string }) =>
    apiCall<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addStudentToProject: (projectId: number, studentId: number) =>
    apiCall<Project>(`/api/projects/${projectId}/students/${studentId}`, {
      method: 'POST',
    }),

  getEligibleStudents: (projectId: number, query?: string) => {
    const param = query && query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
    return apiCall<User[]>(`/api/projects/${projectId}/eligible-students${param}`);
  },
};

// TASKS
export const taskApi = {
  getProjectTasks: (projectId: number) => apiCall<Task[]>(`/api/projects/${projectId}/tasks`),

  createTask: (projectId: number, payload: {
    title: string;
    description?: string;
    assignedStudentId?: number | null;
    assignedStudentIds?: number[];
  }) =>
    apiCall<Task>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTask: (taskId: number, payload: {
    title: string;
    description?: string;
    assignedStudentId?: number | null;
    assignedStudentIds?: number[];
  }) =>
    apiCall<Task>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteTask: (taskId: number) =>
    apiCall<void>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  transitionTask: (taskId: number, targetState: TaskStateEnum) =>
    apiCall<Task>(`/api/tasks/${taskId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetState }),
    }),
};

// CHAT
export const chatApi = {
  getTaskChat: (taskId: number) =>
    apiCall<TaskChat>(`/api/tasks/${taskId}/chat`),

  getChatMessages: (taskId: number) =>
    apiCall<ChatMessage[]>(`/api/tasks/${taskId}/chat/messages`),

  sendMessage: (taskId: number, content: string) =>
    apiCall<ChatMessage>(`/api/tasks/${taskId}/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

// SUBMISSIONS
export const submissionApi = {
  getSubmissionsForTask: (taskId: number) =>
    apiCall<Submission[]>(`/api/tasks/${taskId}/submissions`),

  createSubmission: (
    taskId: number,
    payload: { title: string; description?: string; artifactLocation?: string; draft?: boolean }
  ) =>
    apiCall<Submission>(`/api/tasks/${taskId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSubmissionById: (id: number) =>
    apiCall<Submission>(`/api/submissions/${id}`),

  submitDraft: (id: number) =>
    apiCall<Submission>(`/api/submissions/${id}/submit`, {
      method: 'POST',
    }),

  reviewSubmission: (id: number) =>
    apiCall<Submission>(`/api/submissions/${id}/review`, {
      method: 'POST',
    }),

  approveSubmission: (id: number, comment?: string) =>
    apiCall<Submission>(`/api/submissions/${id}/approve`, {
      method: 'POST',
      body: comment ? JSON.stringify({ comment }) : undefined,
    }),

  rejectSubmission: (id: number, comment?: string) =>
    apiCall<Submission>(`/api/submissions/${id}/reject`, {
      method: 'POST',
      body: comment ? JSON.stringify({ comment }) : undefined,
    }),

  addFeedback: (id: number, comment: string) =>
    apiCall<SubmissionFeedback>(`/api/submissions/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  uploadSubmission: async (taskId: number, formData: FormData): Promise<Submission> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/tasks/${taskId}/submissions/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Upload failed (${response.status})`;
      throw new Error(errorMsg);
    }
    return data as Submission;
  },

  reanalyzeSubmission: (id: number) =>
    apiCall<Submission>(`/api/submissions/${id}/reanalyze`, {
      method: 'POST',
    }),

  getFileUrl: (id: number) => `/api/submissions/${id}/file`,

  getSnapshot: (id: number) =>
    apiCall<SubmissionSnapshot>(`/api/submissions/${id}/snapshot`),
};
