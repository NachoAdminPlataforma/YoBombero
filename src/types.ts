export interface User {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'pending' | 'blocked';
  displayName: string;
  photoURL: string;
  permissions: string[];
  gender?: 'Opositor' | 'Opositora';
  oppositionType?: string;
  onboardingCompleted?: boolean;
  sessionId?: string;
  tutorialsCompleted?: Record<string, boolean>;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  message: string;
  type: 'improvement' | 'complaint' | 'other';
  createdAt: string;
  status: 'pending' | 'reviewed';
}

export interface Question {
  id: string;
  userId?: string;
  displayId: number;
  text: string;
  options: string[];
  correctOptionIndex: number;
  classification: 'Legislativo' | 'Específico';
  topic: string;
  hits: number;
  misses: number;
  masteryLevel: number;
  nextReviewDate: string; // Legacy, keeping for compatibility if needed, but we will use nextReview
  lastSeen?: string;
  nextReview?: string;
  reps?: number;
  easeFactor?: number;
  interval?: number;
  retrievability?: number;
  sourcePdf?: string;
  flaggedForTeacher?: boolean;
  teacherComment?: string;
  flaggedForCorrection?: boolean;
  correctionComment?: string;
  mnemonics?: string[];
  comments?: string[];
  createdAt?: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
}

export interface ReviewHistory {
  id: string;
  questionId: string;
  isCorrect: boolean;
  reviewedAt: string;
}

export interface TopicStats {
  topic: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  averageTime: number; // in seconds
}

export interface TestSession {
  id: string;
  completedAt: string;
  topics: string[];
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  blankCount?: number;
  score: number;
  topicStats?: TopicStats[];
}

export interface TopicResource {
  id: string;
  topic: string;
  classification: string;
  fileName: string;
  fileContent?: string; // Base64
  extractedText?: string;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhoto?: string;
  answer: string;
  createdAt: string;
}
