import type { SQLiteDatabase } from 'expo-sqlite';
import { getMobileCourseBundle, getMobileManifest } from '../api/mobile-api-client';
import {
  activateCourseBundle,
  replaceCourseManifest,
} from '../db/repositories/course-content.repository';
import { mobileLogger } from '../diagnostics/mobile-logger';

export async function refreshMobileManifest(
  db: SQLiteDatabase,
  appUserId: string,
  token: string,
): Promise<void> {
  const manifest = await getMobileManifest(token);
  await replaceCourseManifest(db, appUserId, manifest);
  mobileLogger.info('course-sync', 'Mobile manifest refreshed', {
    courses: manifest.courses.length,
    generatedAt: manifest.generatedAt,
  });
}

export async function downloadMobileCourse(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  token: string,
): Promise<void> {
  const bundle = await getMobileCourseBundle(courseId, token);
  await activateCourseBundle(db, appUserId, bundle);
  mobileLogger.info('course-sync', 'Course bundle activated', {
    courseId,
    contentRevision: bundle.contentRevision,
    chapters: bundle.chapters.length,
    lines: bundle.lines.length,
  });
}
