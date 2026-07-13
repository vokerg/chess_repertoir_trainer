import type { MobileSyncManifestDto } from '@chess-trainer/contracts/mobile-sync';
import type { SQLiteDatabase } from 'expo-sqlite';
import { deriveDownloadState, type LocalCourseSummary } from './course-content.types';

type CourseSummaryRow = {
  course_id: number;
  name: string;
  description: string | null;
  server_content_revision: number | null;
  active_content_revision: number | null;
  server_content_changed_at: string | null;
  estimated_bundle_bytes: number | null;
  available_on_server: number | null;
  download_status: 'DOWNLOADING' | 'AVAILABLE' | 'ERROR' | null;
  last_error: string | null;
};

export async function replaceCourseManifest(
  db: SQLiteDatabase,
  appUserId: string,
  manifest: MobileSyncManifestDto,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      'UPDATE course_manifest SET available_on_server = 0 WHERE app_user_id = ?',
      appUserId,
    );
    for (const course of manifest.courses) {
      await tx.runAsync(
        `INSERT INTO course_manifest (
          app_user_id, course_id, name, description, server_content_revision,
          server_content_changed_at, estimated_bundle_bytes, last_manifest_seen_at,
          available_on_server
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(app_user_id, course_id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          server_content_revision = excluded.server_content_revision,
          server_content_changed_at = excluded.server_content_changed_at,
          estimated_bundle_bytes = excluded.estimated_bundle_bytes,
          last_manifest_seen_at = excluded.last_manifest_seen_at,
          available_on_server = 1`,
        appUserId,
        course.courseId,
        course.name,
        course.description,
        course.contentRevision,
        course.contentChangedAt,
        course.estimatedBundleBytes,
        manifest.generatedAt,
      );
    }
    await tx.runAsync(
      `INSERT INTO sync_state (app_user_id, key, value, updated_at)
       VALUES (?, 'last_manifest_sync_at', ?, ?)
       ON CONFLICT(app_user_id, key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      appUserId,
      manifest.generatedAt,
      new Date().toISOString(),
    );
  });
}

export async function listLocalCourses(
  db: SQLiteDatabase,
  appUserId: string,
): Promise<LocalCourseSummary[]> {
  await recoverInterruptedCourseDownloads(db, appUserId);
  const rows = await db.getAllAsync<CourseSummaryRow>(
    `SELECT
      COALESCE(m.course_id, d.course_id) AS course_id,
      COALESCE(m.name, r.course_name) AS name,
      COALESCE(m.description, r.course_description) AS description,
      m.server_content_revision,
      d.active_content_revision,
      m.server_content_changed_at,
      m.estimated_bundle_bytes,
      m.available_on_server,
      d.download_status,
      d.last_error
    FROM course_manifest m
    LEFT JOIN downloaded_course d
      ON d.app_user_id = m.app_user_id AND d.course_id = m.course_id
    LEFT JOIN course_revision r
      ON r.app_user_id = d.app_user_id
      AND r.course_id = d.course_id
      AND r.content_revision = d.active_content_revision
    WHERE m.app_user_id = ?
    UNION ALL
    SELECT
      d.course_id, r.course_name, r.course_description, NULL,
      d.active_content_revision, NULL, NULL, 0, d.download_status, d.last_error
    FROM downloaded_course d
    JOIN course_revision r
      ON r.app_user_id = d.app_user_id
      AND r.course_id = d.course_id
      AND r.content_revision = d.active_content_revision
    WHERE d.app_user_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM course_manifest m
        WHERE m.app_user_id = d.app_user_id AND m.course_id = d.course_id
      )
    ORDER BY name COLLATE NOCASE, course_id`,
    appUserId,
    appUserId,
  );

  return rows.map((row) => ({
    courseId: row.course_id,
    name: row.name,
    description: row.description,
    serverContentRevision: row.server_content_revision,
    activeContentRevision: row.active_content_revision,
    contentChangedAt: row.server_content_changed_at,
    estimatedBundleBytes: row.estimated_bundle_bytes,
    state: deriveDownloadState({
      serverContentRevision: row.server_content_revision,
      activeContentRevision: row.active_content_revision,
      availableOnServer: row.available_on_server === 1,
      downloadStatus: row.download_status,
    }),
    lastError: row.last_error,
  }));
}

export async function readLastManifestSyncAt(
  db: SQLiteDatabase,
  appUserId: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_state
     WHERE app_user_id = ? AND key = 'last_manifest_sync_at'`,
    appUserId,
  );
  return row?.value ?? null;
}

async function recoverInterruptedCourseDownloads(
  db: SQLiteDatabase,
  appUserId: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE downloaded_course
     SET download_status = 'ERROR',
         last_error = COALESCE(last_error, 'Download interrupted before activation.')
     WHERE app_user_id = ? AND download_status = 'DOWNLOADING'`,
    appUserId,
  );
}
