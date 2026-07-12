import type { LibraryCatalog } from '@chess-trainer/contracts/courses';

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
  weakSublineCount: number;
  statsWindowSize: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
  attemptPassRate: number | null;
  status: LibraryLineStatus;
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
    trainedSublineCount: number;
    untrainedSublineCount: number;
    weakSublineCount: number;
    status: LibraryLineStatus;
  };
}

export type LibraryLineStatus = 'NEW' | 'WEAK' | 'REVIEW' | 'STABLE' | 'STRONG';
export type LibraryMarathonMode = 'ALL' | 'WEAK_SUBLINES' | 'UNTRAINED_SUBLINES' | 'MIXED_WEAK_UNTRAINED';
export type LibraryTrainingScope = 'COURSE' | 'CHAPTER' | 'SELECTED_LINES';
export type LibraryCatalogResponse = LibraryCatalog;
