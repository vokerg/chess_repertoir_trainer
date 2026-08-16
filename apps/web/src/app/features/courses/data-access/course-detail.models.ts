import type { Chapter, Course, CourseOverview as CourseOverviewContract } from '@chess-trainer/contracts/courses';

export type CourseDetail = Pick<Course, 'id' | 'name' | 'description' | 'side' | 'coverKey'>;

export type CourseChapter = Pick<Chapter, 'id' | 'courseId' | 'name' | 'description' | 'sortOrder'>;

export type CourseOverview = CourseOverviewContract;
export type CourseOverviewChapter = CourseOverviewContract['chapters'][number];
export type CourseStats = CourseOverviewContract['stats'];
