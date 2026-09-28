export type Role = 'STUDENT' | 'SUPERVISOR';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  supervisor: User;
  students: User[];
  createdAt?: string;
  updatedAt?: string;
}

export type TaskStateEnum = 
  | 'PROPOSED' 
  | 'LITERATURE_REVIEW' 
  | 'EXPERIMENTATION' 
  | 'UNDER_REVIEW' 
  | 'APPROVED';

export interface Task {
  id: number;
  title: string;
  description?: string;
  projectId: number;
  projectTitle: string;
  assignedStudent?: User | null;
  currentState: TaskStateEnum;
  createdAt?: string;
  updatedAt?: string;
}

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED';

export interface SubmissionFeedback {
  id: number;
  submissionId: number;
  supervisor: User;
  comment: string;
  createdAt: string;
}

export interface Submission {
  id: number;
  taskId: number;
  taskTitle: string;
  versionNumber: string;
  submittedBy: User;
  title: string;
  description?: string;
  artifactLocation?: string;
  status: SubmissionStatus;
  feedbackList: SubmissionFeedback[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionSnapshot {
  versionNumber: string;
  title: string;
  description?: string;
  artifactLocation?: string;
  submittedById: number;
  submittedByName: string;
  timestamp: string;
}
