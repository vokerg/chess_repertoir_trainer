export interface CourseDetail {
  id: number;
  name: string;
  description?: string | null;
}

export interface CourseStats {
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

export interface CourseChapter {
  id: number;
  name: string;
  description?: string | null;
  sortOrder: number;
}
export type CourseOverview = CourseOverviewContract;
import type { CourseOverview as CourseOverviewContract } from '@chess-trainer/contracts/courses';
