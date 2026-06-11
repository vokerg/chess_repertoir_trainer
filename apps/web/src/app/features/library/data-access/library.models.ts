export interface LibraryCourse {
  id: number;
  name: string;
  description?: string | null;
}

export interface LibraryCourseStats {
  courseId: number;
  totalLines: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
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
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
}

export type LibraryLineStatus = 'NEW' | 'WEAK' | 'CLEAN' | 'REVIEW';
