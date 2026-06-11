export interface CourseDetail {
  id: number;
  name: string;
  description?: string | null;
}

export interface CourseStats {
  courseId: number;
  totalLines: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
}

export interface CourseChapter {
  id: number;
  name: string;
  description?: string | null;
  sortOrder: number;
}
