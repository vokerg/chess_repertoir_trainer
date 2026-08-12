import type { Course, CourseOverview as CourseOverviewContract } from '@chess-trainer/contracts/courses';

export type CourseDetail = Pick<Course, 'id' | 'name' | 'description' | 'side' | 'coverKey'>;

export interface CourseChapter {
  id: number;
  courseId: number;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export type CourseOverview = CourseOverviewContract;
export type CourseOverviewChapter = CourseOverviewContract['chapters'][number];
export type CourseStats = CourseOverviewContract['stats'];
