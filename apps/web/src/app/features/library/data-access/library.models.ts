export interface LibraryCourse {
  id: number;
  name: string;
  description?: string | null;
}

export interface LibraryCourseStats {
  scopeType: 'LINE' | 'CHAPTER' | 'COURSE';
  scopeId: number;
  activeSublineCount: number;
  trainedSublineCount: number;
  untrainedSublineCount: number;
  statsWindowSize: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
  attemptPassRate: number | null;
}

export interface LibraryChapter {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface LibraryLine {
  id: number;
  name: string;
  sideToTrain: 'WHITE' | 'BLACK';
  startingFen: string;
  trainingStats: {
    totalAttempts: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
    activeSublineCount: number;
  };
}

export type LibraryLineStatus = 'NEW' | 'WEAK' | 'CLEAN' | 'REVIEW';
