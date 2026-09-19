import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalCourseHierarchy } from './course-content.types';

type RevisionRow = {
  course_id: number;
  course_name: string;
  course_description: string | null;
  content_revision: number;
};

type ChapterRow = {
  chapter_id: number;
  name: string;
  description: string | null;
  sort_order: number;
};

type LineRow = {
  line_id: number;
  chapter_id: number;
  name: string;
  side_to_train: 'WHITE' | 'BLACK';
  starting_fen: string;
  notes: string | null;
  tags_json: string;
  attempt_count: number;
  pending_attempt_count: number;
  has_in_progress_session: number;
  latest_result: 'PASSED' | 'FAILED' | null;
};

export async function loadLocalCourseHierarchy(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
): Promise<LocalCourseHierarchy | null> {
  const revision = await db.getFirstAsync<RevisionRow>(
    `SELECT r.course_id, r.course_name, r.course_description, r.content_revision
     FROM downloaded_course d
     JOIN course_revision r
       ON r.app_user_id = d.app_user_id
       AND r.course_id = d.course_id
       AND r.content_revision = d.active_content_revision
     WHERE d.app_user_id = ? AND d.course_id = ?`,
    appUserId,
    courseId,
  );
  if (!revision) return null;

  const chapters = await db.getAllAsync<ChapterRow>(
    `SELECT chapter_id, name, description, sort_order
     FROM course_chapter
     WHERE app_user_id = ? AND course_id = ? AND content_revision = ?
     ORDER BY sort_order, chapter_id`,
    appUserId,
    courseId,
    revision.content_revision,
  );
  const lines = await db.getAllAsync<LineRow>(
    `SELECT l.line_id, l.chapter_id, l.name, l.side_to_train, l.starting_fen,
            l.notes, l.tags_json,
            (
              SELECT COUNT(*) FROM local_training_attempt a
              WHERE a.app_user_id = l.app_user_id AND a.line_id = l.line_id
            ) AS attempt_count,
            (
              SELECT COUNT(*)
              FROM training_attempt_outbox o
              JOIN local_training_attempt a
                ON a.app_user_id = o.app_user_id
                AND a.client_attempt_id = o.client_attempt_id
              WHERE o.app_user_id = l.app_user_id AND a.line_id = l.line_id
                AND o.state IN ('PENDING', 'SENDING')
            ) AS pending_attempt_count,
            EXISTS (
              SELECT 1 FROM local_training_session s
              WHERE s.app_user_id = l.app_user_id AND s.line_id = l.line_id
                AND s.local_status = 'IN_PROGRESS'
            ) AS has_in_progress_session,
            (
              SELECT a.result FROM local_training_attempt a
              WHERE a.app_user_id = l.app_user_id AND a.line_id = l.line_id
              ORDER BY a.completed_at DESC
              LIMIT 1
            ) AS latest_result
     FROM course_line l
     WHERE l.app_user_id = ? AND l.course_id = ? AND l.content_revision = ?
     ORDER BY l.chapter_id, l.line_id`,
    appUserId,
    courseId,
    revision.content_revision,
  );
  const linesByChapter = new Map<number, LocalCourseHierarchy['chapters'][number]['lines']>();
  for (const line of lines) {
    const list = linesByChapter.get(line.chapter_id) ?? [];
    list.push({
      id: line.line_id,
      name: line.name,
      sideToTrain: line.side_to_train,
      startingFen: line.starting_fen,
      notes: line.notes,
      tags: parseTags(line.tags_json),
      attemptCount: line.attempt_count,
      pendingAttemptCount: line.pending_attempt_count,
      hasInProgressSession: line.has_in_progress_session === 1,
      latestResult: line.latest_result,
    });
    linesByChapter.set(line.chapter_id, list);
  }

  return {
    courseId: revision.course_id,
    name: revision.course_name,
    description: revision.course_description,
    contentRevision: revision.content_revision,
    chapters: chapters.map((chapter) => ({
      id: chapter.chapter_id,
      name: chapter.name,
      description: chapter.description,
      sortOrder: chapter.sort_order,
      lines: linesByChapter.get(chapter.chapter_id) ?? [],
    })),
  };
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((tag) => typeof tag === 'string') ? parsed : [];
  } catch {
    return [];
  }
}
