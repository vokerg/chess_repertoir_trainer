import type { MobileCourseBundleDto } from '@chess-trainer/contracts/mobile-sync';
import type { SQLiteDatabase } from 'expo-sqlite';
import { validateCourseBundleReferences } from './course-bundle-validation';
import { writeCourseBundleRevision } from './course-bundle-writer';

export async function activateCourseBundle(
  db: SQLiteDatabase,
  appUserId: string,
  bundle: MobileCourseBundleDto,
): Promise<void> {
  validateCourseBundleReferences(bundle);
  const now = new Date().toISOString();
  await markDownloading(db, appUserId, bundle.courseId);

  try {
    await db.withExclusiveTransactionAsync(async (tx) => {
      const existing = await tx.getFirstAsync<{ status: 'STAGING' | 'ACTIVE' | 'RETIRED' }>(
        `SELECT status FROM course_revision
         WHERE app_user_id = ? AND course_id = ? AND content_revision = ?`,
        appUserId,
        bundle.courseId,
        bundle.contentRevision,
      );
      if (existing?.status === 'ACTIVE') {
        await tx.runAsync(
          `UPDATE downloaded_course SET download_status = 'AVAILABLE',
             last_verified_at = ?, last_error = NULL
           WHERE app_user_id = ? AND course_id = ?`,
          now,
          appUserId,
          bundle.courseId,
        );
        return;
      }

      await tx.runAsync(
        `DELETE FROM course_revision
         WHERE app_user_id = ? AND course_id = ? AND content_revision = ? AND status <> 'ACTIVE'`,
        appUserId,
        bundle.courseId,
        bundle.contentRevision,
      );
      await writeCourseBundleRevision(tx, appUserId, bundle, now);
      await tx.runAsync(
        `UPDATE course_revision SET status = 'RETIRED'
         WHERE app_user_id = ? AND course_id = ? AND status = 'ACTIVE'`,
        appUserId,
        bundle.courseId,
      );
      await tx.runAsync(
        `UPDATE course_revision SET status = 'ACTIVE', activated_at = ?
         WHERE app_user_id = ? AND course_id = ? AND content_revision = ?`,
        now,
        appUserId,
        bundle.courseId,
        bundle.contentRevision,
      );
      await tx.runAsync(
        `UPDATE downloaded_course SET
          active_content_revision = ?, bundle_schema_version = ?,
          download_status = 'AVAILABLE', downloaded_at = ?, last_verified_at = ?,
          last_error = NULL
         WHERE app_user_id = ? AND course_id = ?`,
        bundle.contentRevision,
        bundle.bundleSchemaVersion,
        now,
        now,
        appUserId,
        bundle.courseId,
      );
    });
  } catch (error) {
    await db.runAsync(
      `UPDATE downloaded_course SET download_status = 'ERROR', last_error = ?
       WHERE app_user_id = ? AND course_id = ?`,
      error instanceof Error ? error.message : String(error),
      appUserId,
      bundle.courseId,
    );
    throw error;
  }
}

async function markDownloading(db: SQLiteDatabase, appUserId: string, courseId: number) {
  await db.runAsync(
    `INSERT INTO downloaded_course (
      app_user_id, course_id, active_content_revision, bundle_schema_version,
      download_status, downloaded_at, last_verified_at, last_error
    ) VALUES (?, ?, NULL, NULL, 'DOWNLOADING', NULL, NULL, NULL)
    ON CONFLICT(app_user_id, course_id) DO UPDATE SET
      download_status = 'DOWNLOADING', last_error = NULL`,
    appUserId,
    courseId,
  );
}
