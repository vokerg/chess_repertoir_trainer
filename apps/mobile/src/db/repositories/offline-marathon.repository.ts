import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createSerializableTrainingSession,
  type SerializableTrainingSession,
  type SerializableTrainingSubline,
} from 'chess-domain/training';
import {
  filterOfflineMarathonCandidates,
  marathonCandidateKey,
  pickOfflineMarathonCandidate,
  rememberMarathonSubline,
  trainingModeForOfflineMarathon,
  type OfflineMarathonMode,
} from './offline-marathon-policy';
import {
  countPendingAttemptsForLine,
  restoreStoredTrainingContext,
  type StoredTrainingSessionRow,
} from './offline-training.repository';
import type { LocalTrainingStatus, OfflineTrainingContext } from './offline-training.types';

export type OfflineMarathonScopeType = 'COURSE' | 'CHAPTER';
export type OfflineMarathonRunStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'ERROR';

export type OfflineMarathonOptions = {
  courseId: number;
  scopeType: OfflineMarathonScopeType;
  scopeId: number;
  mode: OfflineMarathonMode;
};

export type OfflineMarathonContext = {
  runId: string;
  courseId: number;
  courseName: string;
  contentRevision: number;
  scopeType: OfflineMarathonScopeType;
  scopeId: number;
  scopeName: string;
  mode: OfflineMarathonMode;
  status: OfflineMarathonRunStatus;
  completedCount: number;
  resumed: boolean;
  training: OfflineTrainingContext | null;
};

type RunRow = {
  run_id: string;
  course_id: number;
  content_revision: number;
  scope_type: OfflineMarathonScopeType;
  scope_id: number;
  scope_name: string;
  mode: OfflineMarathonMode;
  status: OfflineMarathonRunStatus;
  current_session_id: string | null;
  recent_subline_keys_json: string;
  served_untrained_keys_json: string;
  completed_count: number;
};

type ActiveRevisionRow = {
  course_id: number;
  course_name: string;
  content_revision: number;
};

type CandidateRow = {
  course_id: number;
  course_name: string;
  content_revision: number;
  chapter_id: number;
  chapter_name: string;
  lineId: number;
  line_name: string;
  sublineHash: string;
  subline_key_version: number;
  leaf_node_id: number;
  starting_fen: string;
  side_to_train: 'WHITE' | 'BLACK';
  blocked_by_active_session: number;
};

type AttemptRow = {
  lineId: number;
  sublineHash: string;
  result: 'PASSED' | 'FAILED';
  completedAt: string;
};

type SublineMoveRow = {
  node_id: number;
  move_uci: string;
  move_san: string;
  fen_before: string;
  fen_after: string;
  is_user_move: number;
  comment: string | null;
  annotation: string | null;
  branch_label: string | null;
};

export async function openOfflineMarathon(
  db: SQLiteDatabase,
  appUserId: string,
  options: OfflineMarathonOptions,
): Promise<OfflineMarathonContext> {
  const existing = await loadActiveRun(db, appUserId, options.courseId, options.scopeType, options.scopeId);
  if (existing) return restoreRunContext(db, appUserId, existing, true);
  return startNewOfflineMarathon(db, appUserId, options);
}

export async function startNewOfflineMarathon(
  db: SQLiteDatabase,
  appUserId: string,
  options: OfflineMarathonOptions,
): Promise<OfflineMarathonContext> {
  const revision = await loadActiveRevision(db, appUserId, options.courseId);
  if (!revision) throw new Error('Download the course before starting an offline marathon.');
  const scopeName = await resolveScopeName(db, appUserId, revision, options.scopeType, options.scopeId);
  if (!scopeName) throw new Error('The downloaded marathon scope is unavailable.');

  const now = new Date().toISOString();
  const runId = randomUUID();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const activeRuns = await tx.getAllAsync<{ run_id: string; current_session_id: string | null }>(
      `SELECT run_id, current_session_id
       FROM local_training_marathon_run
       WHERE app_user_id = ? AND course_id = ? AND scope_type = ? AND scope_id = ?
         AND status = 'IN_PROGRESS'`,
      appUserId,
      options.courseId,
      options.scopeType,
      options.scopeId,
    );
    for (const run of activeRuns) {
      if (run.current_session_id) {
        await tx.runAsync(
          `UPDATE local_training_session
           SET local_status = 'ABANDONED', updated_at = ?
           WHERE app_user_id = ? AND session_id = ? AND local_status = 'IN_PROGRESS'`,
          now,
          appUserId,
          run.current_session_id,
        );
      }
    }
    await tx.runAsync(
      `UPDATE local_training_marathon_run
       SET status = 'ABANDONED', current_session_id = NULL, updated_at = ?
       WHERE app_user_id = ? AND course_id = ? AND scope_type = ? AND scope_id = ?
         AND status = 'IN_PROGRESS'`,
      now,
      appUserId,
      options.courseId,
      options.scopeType,
      options.scopeId,
    );
    await tx.runAsync(
      `INSERT INTO local_training_marathon_run (
        app_user_id, run_id, course_id, content_revision, scope_type, scope_id,
        scope_name, mode, status, current_session_id, recent_subline_keys_json,
        served_untrained_keys_json, completed_count, started_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', NULL, '[]', '[]', 0, ?, ?, NULL)`,
      appUserId,
      runId,
      revision.course_id,
      revision.content_revision,
      options.scopeType,
      options.scopeId,
      scopeName,
      options.mode,
      now,
      now,
    );
  });

  const run = await loadRunById(db, appUserId, runId);
  if (!run) throw new Error('The offline marathon run could not be created.');
  return startNextMarathonLine(db, appUserId, run, false);
}

export async function advanceOfflineMarathon(
  db: SQLiteDatabase,
  appUserId: string,
  context: OfflineMarathonContext,
): Promise<OfflineMarathonContext> {
  const run = await loadRunById(db, appUserId, context.runId);
  if (!run || run.status !== 'IN_PROGRESS') throw new Error('The offline marathon is no longer active.');
  if (run.current_session_id) {
    const current = await loadStoredSession(db, appUserId, run.current_session_id);
    if (current?.local_status === 'IN_PROGRESS') {
      throw new Error('Finish the current line before moving to the next one.');
    }
  }
  return startNextMarathonLine(db, appUserId, run, false);
}

export async function restartOfflineMarathonCurrent(
  db: SQLiteDatabase,
  appUserId: string,
  context: OfflineMarathonContext,
): Promise<OfflineMarathonContext> {
  const run = await loadRunById(db, appUserId, context.runId);
  if (!run || run.status !== 'IN_PROGRESS' || !run.current_session_id) {
    throw new Error('There is no active marathon line to restart.');
  }
  const current = await loadStoredSession(db, appUserId, run.current_session_id);
  if (!current) throw new Error('The saved marathon line is unavailable.');
  const subline = await loadSubline(
    db,
    appUserId,
    current.course_id,
    current.content_revision,
    current.subline_hash,
    current.subline_key_version,
  );
  if (!subline) throw new Error('The downloaded subline is unavailable.');
  const line = await loadCandidateLine(db, appUserId, current);
  if (!line) throw new Error('The downloaded line is unavailable.');

  const now = new Date().toISOString();
  const session = createSerializableTrainingSession({
    sessionId: randomUUID(),
    courseContentRevision: current.content_revision,
    startedAt: now,
    subline,
  });
  const localStatus: LocalTrainingStatus = session.completed ? 'COMPLETED' : 'IN_PROGRESS';
  const trainingMode = trainingModeForOfflineMarathon(run.mode);

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE local_training_session
       SET local_status = 'ABANDONED', updated_at = ?
       WHERE app_user_id = ? AND session_id = ? AND local_status = 'IN_PROGRESS'`,
      now,
      appUserId,
      current.session_id,
    );
    await insertMarathonSession(tx, appUserId, run, line, subline, session, trainingMode, localStatus, now);
    const updated = await tx.runAsync(
      `UPDATE local_training_marathon_run
       SET current_session_id = ?, updated_at = ?
       WHERE app_user_id = ? AND run_id = ? AND status = 'IN_PROGRESS'`,
      session.sessionId,
      now,
      appUserId,
      run.run_id,
    );
    if (updated.changes !== 1) throw new Error('The offline marathon is no longer active.');
  });

  const nextRun = { ...run, current_session_id: session.sessionId };
  return buildRunContext(db, appUserId, nextRun, false, {
    courseId: line.course_id,
    courseName: line.course_name,
    contentRevision: line.content_revision,
    lineId: line.lineId,
    lineName: line.line_name,
    trainingMode,
    marathonRunId: run.run_id,
    localStatus,
    resumed: false,
    pendingAttemptCount: await countPendingAttemptsForLine(db, appUserId, line.lineId),
    session,
    subline,
  });
}

async function startNextMarathonLine(
  db: SQLiteDatabase,
  appUserId: string,
  run: RunRow,
  resumed: boolean,
): Promise<OfflineMarathonContext> {
  const candidates = await loadCandidates(db, appUserId, run);
  const unblocked = candidates.filter((candidate) => candidate.blocked_by_active_session === 0);
  if (candidates.length > 0 && unblocked.length === 0) {
    throw new Error('Finish another in-progress line before continuing this marathon.');
  }

  const attempts = await loadCandidateAttempts(db, appUserId, unblocked);
  const recentKeys = parseStringArray(run.recent_subline_keys_json);
  const servedUntrainedKeys = new Set(parseStringArray(run.served_untrained_keys_json));
  const eligible = filterOfflineMarathonCandidates(unblocked, attempts, run.mode, servedUntrainedKeys);
  const picked = pickOfflineMarathonCandidate(eligible, recentKeys);

  if (!picked) {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE local_training_marathon_run
       SET status = 'COMPLETED', current_session_id = NULL, completed_at = ?, updated_at = ?
       WHERE app_user_id = ? AND run_id = ? AND status = 'IN_PROGRESS'`,
      now,
      now,
      appUserId,
      run.run_id,
    );
    return buildRunContext(db, appUserId, {
      ...run,
      status: 'COMPLETED',
      current_session_id: null,
    }, resumed, null);
  }

  const subline = await loadSubline(
    db,
    appUserId,
    picked.course_id,
    picked.content_revision,
    picked.sublineHash,
    picked.subline_key_version,
  );
  if (!subline) throw new Error('The selected downloaded subline is unavailable.');

  const now = new Date().toISOString();
  const session = createSerializableTrainingSession({
    sessionId: randomUUID(),
    courseContentRevision: picked.content_revision,
    startedAt: now,
    subline,
  });
  const localStatus: LocalTrainingStatus = session.completed ? 'COMPLETED' : 'IN_PROGRESS';
  const trainingMode = trainingModeForOfflineMarathon(run.mode);
  const nextRecentKeys = rememberMarathonSubline(recentKeys, picked);
  const nextServed = new Set(servedUntrainedKeys);
  if ((run.mode === 'UNTRAINED_SUBLINES' || run.mode === 'MIXED_WEAK_UNTRAINED')
    && !attempts.some((attempt) => marathonCandidateKey(attempt) === marathonCandidateKey(picked))) {
    nextServed.add(marathonCandidateKey(picked));
  }

  await db.withExclusiveTransactionAsync(async (tx) => {
    await insertMarathonSession(tx, appUserId, run, picked, subline, session, trainingMode, localStatus, now);
    const updated = await tx.runAsync(
      `UPDATE local_training_marathon_run
       SET current_session_id = ?, recent_subline_keys_json = ?,
           served_untrained_keys_json = ?, updated_at = ?
       WHERE app_user_id = ? AND run_id = ? AND status = 'IN_PROGRESS'`,
      session.sessionId,
      JSON.stringify(nextRecentKeys),
      JSON.stringify([...nextServed]),
      now,
      appUserId,
      run.run_id,
    );
    if (updated.changes !== 1) throw new Error('The offline marathon is no longer active.');
  });

  const training: OfflineTrainingContext = {
    courseId: picked.course_id,
    courseName: picked.course_name,
    contentRevision: picked.content_revision,
    lineId: picked.lineId,
    lineName: picked.line_name,
    trainingMode,
    marathonRunId: run.run_id,
    localStatus,
    resumed: false,
    pendingAttemptCount: await countPendingAttemptsForLine(db, appUserId, picked.lineId),
    session,
    subline,
  };
  return buildRunContext(db, appUserId, {
    ...run,
    current_session_id: session.sessionId,
    recent_subline_keys_json: JSON.stringify(nextRecentKeys),
    served_untrained_keys_json: JSON.stringify([...nextServed]),
  }, resumed, training);
}

async function insertMarathonSession(
  db: SQLiteDatabase,
  appUserId: string,
  run: RunRow,
  line: Pick<CandidateRow, 'course_id' | 'content_revision' | 'lineId'>,
  subline: SerializableTrainingSubline,
  session: SerializableTrainingSession,
  trainingMode: OfflineTrainingContext['trainingMode'],
  localStatus: LocalTrainingStatus,
  now: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO local_training_session (
      app_user_id, session_id, course_id, content_revision, line_id,
      subline_hash, subline_key_version, training_mode, marathon_run_id,
      local_status, session_json, started_at, completed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    appUserId,
    session.sessionId,
    line.course_id,
    line.content_revision,
    line.lineId,
    subline.sublineHash,
    subline.sublineKeyVersion,
    trainingMode,
    run.run_id,
    localStatus,
    JSON.stringify(session),
    session.startedAt,
    session.completedAt,
    now,
  );
}

async function restoreRunContext(
  db: SQLiteDatabase,
  appUserId: string,
  run: RunRow,
  resumed: boolean,
): Promise<OfflineMarathonContext> {
  if (!run.current_session_id) return startNextMarathonLine(db, appUserId, run, resumed);
  const session = await loadStoredSession(db, appUserId, run.current_session_id);
  if (!session) throw new Error('The saved marathon session is unavailable.');
  const training = await restoreStoredTrainingContext(db, appUserId, session);
  return buildRunContext(db, appUserId, run, resumed, training);
}

async function buildRunContext(
  db: SQLiteDatabase,
  appUserId: string,
  run: RunRow,
  resumed: boolean,
  training: OfflineTrainingContext | null,
): Promise<OfflineMarathonContext> {
  const revision = await db.getFirstAsync<{ course_name: string }>(
    `SELECT course_name FROM course_revision
     WHERE app_user_id = ? AND course_id = ? AND content_revision = ?`,
    appUserId,
    run.course_id,
    run.content_revision,
  );
  if (!revision) throw new Error('The downloaded content for this marathon is unavailable.');
  return {
    runId: run.run_id,
    courseId: run.course_id,
    courseName: revision.course_name,
    contentRevision: run.content_revision,
    scopeType: run.scope_type,
    scopeId: run.scope_id,
    scopeName: run.scope_name,
    mode: run.mode,
    status: run.status,
    completedCount: run.completed_count,
    resumed,
    training,
  };
}

async function loadActiveRun(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  scopeType: OfflineMarathonScopeType,
  scopeId: number,
): Promise<RunRow | null> {
  return db.getFirstAsync<RunRow>(
    `SELECT run_id, course_id, content_revision, scope_type, scope_id, scope_name,
            mode, status, current_session_id, recent_subline_keys_json,
            served_untrained_keys_json, completed_count
     FROM local_training_marathon_run
     WHERE app_user_id = ? AND course_id = ? AND scope_type = ? AND scope_id = ?
       AND status = 'IN_PROGRESS'
     ORDER BY updated_at DESC, rowid DESC
     LIMIT 1`,
    appUserId,
    courseId,
    scopeType,
    scopeId,
  );
}

async function loadRunById(db: SQLiteDatabase, appUserId: string, runId: string): Promise<RunRow | null> {
  return db.getFirstAsync<RunRow>(
    `SELECT run_id, course_id, content_revision, scope_type, scope_id, scope_name,
            mode, status, current_session_id, recent_subline_keys_json,
            served_untrained_keys_json, completed_count
     FROM local_training_marathon_run
     WHERE app_user_id = ? AND run_id = ?`,
    appUserId,
    runId,
  );
}

async function loadActiveRevision(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
): Promise<ActiveRevisionRow | null> {
  return db.getFirstAsync<ActiveRevisionRow>(
    `SELECT r.course_id, r.course_name, r.content_revision
     FROM downloaded_course d
     JOIN course_revision r
       ON r.app_user_id = d.app_user_id AND r.course_id = d.course_id
      AND r.content_revision = d.active_content_revision
     WHERE d.app_user_id = ? AND d.course_id = ?`,
    appUserId,
    courseId,
  );
}

async function resolveScopeName(
  db: SQLiteDatabase,
  appUserId: string,
  revision: ActiveRevisionRow,
  scopeType: OfflineMarathonScopeType,
  scopeId: number,
): Promise<string | null> {
  if (scopeType === 'COURSE') return scopeId === revision.course_id ? revision.course_name : null;
  const chapter = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM course_chapter
     WHERE app_user_id = ? AND course_id = ? AND content_revision = ? AND chapter_id = ?`,
    appUserId,
    revision.course_id,
    revision.content_revision,
    scopeId,
  );
  return chapter?.name ?? null;
}

async function loadCandidates(
  db: SQLiteDatabase,
  appUserId: string,
  run: RunRow,
): Promise<CandidateRow[]> {
  return db.getAllAsync<CandidateRow>(
    `SELECT s.course_id, r.course_name, s.content_revision,
            l.chapter_id, c.name AS chapter_name, s.line_id AS lineId, l.name AS line_name,
            s.subline_hash AS sublineHash, s.subline_key_version, s.leaf_node_id,
            s.starting_fen, s.side_to_train,
            EXISTS (
              SELECT 1 FROM local_training_session active
              WHERE active.app_user_id = s.app_user_id
                AND active.line_id = s.line_id
                AND active.local_status = 'IN_PROGRESS'
            ) AS blocked_by_active_session
     FROM training_subline s
     JOIN course_revision r
       ON r.app_user_id = s.app_user_id AND r.course_id = s.course_id
      AND r.content_revision = s.content_revision
     JOIN course_line l
       ON l.app_user_id = s.app_user_id AND l.course_id = s.course_id
      AND l.content_revision = s.content_revision AND l.line_id = s.line_id
     JOIN course_chapter c
       ON c.app_user_id = l.app_user_id AND c.course_id = l.course_id
      AND c.content_revision = l.content_revision AND c.chapter_id = l.chapter_id
     WHERE s.app_user_id = ? AND s.course_id = ? AND s.content_revision = ?
       AND (? = 'COURSE' OR l.chapter_id = ?)
       AND EXISTS (
         SELECT 1 FROM training_subline_move m
         WHERE m.app_user_id = s.app_user_id AND m.course_id = s.course_id
           AND m.content_revision = s.content_revision
           AND m.subline_hash = s.subline_hash
           AND m.subline_key_version = s.subline_key_version
           AND m.is_user_move = 1
       )
     ORDER BY l.chapter_id, l.line_id, s.subline_hash`,
    appUserId,
    run.course_id,
    run.content_revision,
    run.scope_type,
    run.scope_id,
  );
}

async function loadCandidateAttempts(
  db: SQLiteDatabase,
  appUserId: string,
  candidates: CandidateRow[],
): Promise<AttemptRow[]> {
  if (candidates.length === 0) return [];
  const lineIds = [...new Set(candidates.map((candidate) => candidate.lineId))];
  const placeholders = lineIds.map(() => '?').join(', ');
  return db.getAllAsync<AttemptRow>(
    `SELECT line_id AS lineId, subline_hash AS sublineHash, result, completed_at AS completedAt
     FROM local_training_attempt
     WHERE app_user_id = ? AND line_id IN (${placeholders})
     ORDER BY completed_at DESC`,
    appUserId,
    ...lineIds,
  );
}

async function loadStoredSession(
  db: SQLiteDatabase,
  appUserId: string,
  sessionId: string,
): Promise<StoredTrainingSessionRow | null> {
  return db.getFirstAsync<StoredTrainingSessionRow>(
    `SELECT session_id, course_id, content_revision, line_id, subline_hash,
            subline_key_version, training_mode, marathon_run_id, local_status, session_json
     FROM local_training_session
     WHERE app_user_id = ? AND session_id = ?`,
    appUserId,
    sessionId,
  );
}

async function loadCandidateLine(
  db: SQLiteDatabase,
  appUserId: string,
  session: Pick<StoredTrainingSessionRow, 'course_id' | 'content_revision' | 'line_id'>,
): Promise<CandidateRow | null> {
  return db.getFirstAsync<CandidateRow>(
    `SELECT l.course_id, r.course_name, l.content_revision,
            l.chapter_id, c.name AS chapter_name, l.line_id AS lineId, l.name AS line_name,
            '' AS sublineHash, 1 AS subline_key_version, 1 AS leaf_node_id,
            l.starting_fen, l.side_to_train, 0 AS blocked_by_active_session
     FROM course_line l
     JOIN course_revision r
       ON r.app_user_id = l.app_user_id AND r.course_id = l.course_id
      AND r.content_revision = l.content_revision
     JOIN course_chapter c
       ON c.app_user_id = l.app_user_id AND c.course_id = l.course_id
      AND c.content_revision = l.content_revision AND c.chapter_id = l.chapter_id
     WHERE l.app_user_id = ? AND l.course_id = ? AND l.content_revision = ? AND l.line_id = ?`,
    appUserId,
    session.course_id,
    session.content_revision,
    session.line_id,
  );
}

async function loadSubline(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  contentRevision: number,
  sublineHash: string,
  sublineKeyVersion: number,
): Promise<SerializableTrainingSubline | null> {
  const row = await db.getFirstAsync<{
    line_id: number;
    leaf_node_id: number;
    starting_fen: string;
    side_to_train: 'WHITE' | 'BLACK';
  }>(
    `SELECT line_id, leaf_node_id, starting_fen, side_to_train
     FROM training_subline
     WHERE app_user_id = ? AND course_id = ? AND content_revision = ?
       AND subline_hash = ? AND subline_key_version = ?`,
    appUserId,
    courseId,
    contentRevision,
    sublineHash,
    sublineKeyVersion,
  );
  if (!row) return null;
  const moves = await db.getAllAsync<SublineMoveRow>(
    `SELECT node_id, move_uci, move_san, fen_before, fen_after,
            is_user_move, comment, annotation, branch_label
     FROM training_subline_move
     WHERE app_user_id = ? AND course_id = ? AND content_revision = ?
       AND subline_hash = ? AND subline_key_version = ?
     ORDER BY sequence`,
    appUserId,
    courseId,
    contentRevision,
    sublineHash,
    sublineKeyVersion,
  );
  return {
    version: 1,
    lineId: row.line_id,
    startingFen: row.starting_fen,
    sideToTrain: row.side_to_train,
    sublineHash,
    sublineKeyVersion,
    leafNodeId: row.leaf_node_id,
    moves: moves.map((move) => ({
      nodeId: move.node_id,
      moveUci: move.move_uci,
      moveSan: move.move_san,
      fenBefore: move.fen_before,
      fenAfter: move.fen_after,
      isUserMove: move.is_user_move === 1,
      comment: move.comment,
      annotation: move.annotation,
      branchLabel: move.branch_label,
    })),
  };
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch {
    return [];
  }
}
