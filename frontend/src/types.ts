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
  assignedStudents?: User[];
  currentState: TaskStateEnum;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskChat {
  id: number;
  taskId: number;
  taskTitle: string;
  projectId: number;
  projectTitle: string;
  participants: User[];
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  chatId: number;
  taskId: number;
  sender: User;
  content: string;
  createdAt: string;
}

export type SubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED';

export type AnalysisStatus =
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface CitationDetail {
  doi?: string;
  raw_reference?: string;
  verified: boolean;
  title?: string;
  container_title?: string;
  publisher?: string;
  message?: string;
}

export interface AnalysisReport {
  id: number;
  similarityScore?: number | null;
  similarityType?: string;
  comparedDocumentsCount?: number;
  aiDetectionResult?: string | null;
  aiDetectionStatus?: string;
  aiDetectionError?: string | null;
  totalCitations: number;
  verifiedCitations: number;
  unverifiedCitations: number;
  citationDetails?: string | null;
  status: AnalysisStatus;
  failureReason?: string | null;
  analyzedAt?: string | null;
}

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
  fileName?: string;
  filePath?: string;
  status: SubmissionStatus;
  analysisReport?: AnalysisReport | null;
  feedbackList: SubmissionFeedback[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionSnapshot {
  versionNumber: string;
  title: string;
  description?: string;
  artifactLocation?: string;
  fileName?: string;
  filePath?: string;
  submittedById: number;
  submittedByName: string;
  timestamp: string;
}
