import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  SERIALIZABLE_TRAINING_VERSION,
  createSerializableTrainingSession,
  restoreSerializableTrainingSession,
  type SerializableTrainingEvent,
  type SerializableTrainingSession,
  type SerializableTrainingSubline,
} from 'chess-domain/training';
import { buildMobileTrainingAttempt } from './offline-training-attempt';
import type {
  LocalTrainingStatus,
  OfflineTrainingContext,
} from './offline-training.types';

export type StoredTrainingSessionRow = {
  session_id: string;
  course_id: number;
  content_revision: number;
  line_id: number;
  subline_hash: string;
  subline_key_version: number;
  training_mode: OfflineTrainingContext['trainingMode'];
  marathon_run_id: string | null;
  local_status: LocalTrainingStatus;
  session_json: string;
};

type LineRow = {
  course_id: number;
  course_name: string;
  content_revision: number;
  line_id: number;
  line_name: string;
};

type SublineRow = {
  subline_hash: string;
  subline_key_version: number;
  line_id: number;
  leaf_node_id: number;
  starting_fen: string;
  side_to_train: 'WHITE' | 'BLACK';
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

type EventRow = {
  sequence: number;
  kind: SerializableTrainingEvent['kind'];
  occurred_at: string;
  fen_before: string;
  expected_node_id: number;
  expected_move_uci: string;
  played_move_uci: string | null;
  was_correct: number;
};

export async function openLineTraining(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  lineId: number,
): Promise<OfflineTrainingContext> {
  const latest = await db.getFirstAsync<StoredTrainingSessionRow>(
    `SELECT session_id, course_id, content_revision, line_id, subline_hash,
            subline_key_version, training_mode, marathon_run_id, local_status, session_json
     FROM local_training_session
     WHERE app_user_id = ? AND course_id = ? AND line_id = ?
       AND training_mode = 'LINE' AND marathon_run_id IS NULL
       AND local_status IN ('IN_PROGRESS', 'COMPLETED')
     ORDER BY updated_at DESC, rowid DESC
     LIMIT 1`,
    appUserId,
    courseId,
    lineId,
  );

  if (latest) return restoreTrainingContext(db, appUserId, latest);
  return startNewLineTraining(db, appUserId, courseId, lineId);
}

export async function startNewLineTraining(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  lineId: number,
): Promise<OfflineTrainingContext> {
  const line = await loadActiveLine(db, appUserId, courseId, lineId);
  if (!line) throw new Error('The downloaded line is unavailable.');

  const subline = await selectLocalCandidate(db, appUserId, line);
  if (!subline) throw new Error('This line has no trainable downloaded sublines.');

  const now = new Date().toISOString();
  const session = createSerializableTrainingSession({
    sessionId: randomUUID(),
    courseContentRevision: line.content_revision,
    startedAt: now,
    subline,
  });
  const localStatus: LocalTrainingStatus = session.completed ? 'COMPLETED' : 'IN_PROGRESS';

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO local_training_session (
        app_user_id, session_id, course_id, content_revision, line_id,
        subline_hash, subline_key_version, training_mode, marathon_run_id,
        local_status, session_json, started_at, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'LINE', NULL, ?, ?, ?, ?, ?)`,
      appUserId,
      session.sessionId,
      line.course_id,
      line.content_revision,
      line.line_id,
      subline.sublineHash,
      subline.sublineKeyVersion,
      localStatus,
      JSON.stringify(session),
      session.startedAt,
      session.completedAt,
      now,
    );
    if (session.completed) {
      await writeCompletedAttempt(tx, appUserId, line.course_id, subline, session, 'LINE', now);
    }
  });

  return {
    courseId: line.course_id,
    courseName: line.course_name,
    contentRevision: line.content_revision,
    lineId: line.line_id,
    lineName: line.line_name,
    trainingMode: 'LINE',
    marathonRunId: null,
    localStatus,
    resumed: false,
    pendingAttemptCount: await countPendingAttemptsForLine(db, appUserId, lineId),
    session,
    subline,
  };
}

export async function restartLineTraining(
  db: SQLiteDatabase,
  appUserId: string,
  context: OfflineTrainingContext,
): Promise<OfflineTrainingContext> {
  if (context.localStatus === 'IN_PROGRESS') {
    await db.runAsync(
      `UPDATE local_training_session
       SET local_status = 'ABANDONED', updated_at = ?
       WHERE app_user_id = ? AND session_id = ? AND local_status = 'IN_PROGRESS'`,
      new Date().toISOString(),
      appUserId,
      context.session.sessionId,
    );
  }
  return startNewLineTraining(db, appUserId, context.courseId, context.lineId);
}

export async function persistOfflineTrainingTransition(
  db: SQLiteDatabase,
  appUserId: string,
  context: OfflineTrainingContext,
  nextSession: SerializableTrainingSession,
): Promise<number> {
  const previous = context.session;
  assertSameSession(previous, nextSession, context.subline);
  const newEvents = nextSession.events.slice(previous.events.length);
  const now = new Date().toISOString();
  const localStatus: LocalTrainingStatus = nextSession.completed ? 'COMPLETED' : 'IN_PROGRESS';

  await db.withExclusiveTransactionAsync(async (tx) => {
    const updated = await tx.runAsync(
      `UPDATE local_training_session
       SET local_status = ?, session_json = ?, completed_at = ?, updated_at = ?
       WHERE app_user_id = ? AND session_id = ? AND local_status = 'IN_PROGRESS'`,
      localStatus,
      JSON.stringify(nextSession),
      nextSession.completedAt,
      now,
      appUserId,
      nextSession.sessionId,
    );
    if (updated.changes !== 1) throw new Error('The local training session is no longer active.');

    for (const event of newEvents) {
      await tx.runAsync(
        `INSERT INTO local_training_event (
          app_user_id, session_id, sequence, kind, occurred_at, fen_before,
          expected_node_id, expected_move_uci, played_move_uci, was_correct
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        appUserId,
        nextSession.sessionId,
        event.sequence,
        event.kind,
        event.occurredAt,
        event.fenBefore,
        event.expectedNodeId,
        event.expectedMoveUci,
        event.playedMoveUci,
        event.wasCorrect ? 1 : 0,
      );
    }

    if (nextSession.completed) {
      await writeCompletedAttempt(
        tx,
        appUserId,
        context.courseId,
        context.subline,
        nextSession,
        context.trainingMode,
        now,
      );
      if (context.marathonRunId) {
        const runUpdated = await tx.runAsync(
          `UPDATE local_training_marathon_run
           SET completed_count = completed_count + 1, updated_at = ?
           WHERE app_user_id = ? AND run_id = ? AND status = 'IN_PROGRESS'
             AND current_session_id = ?`,
          now,
          appUserId,
          context.marathonRunId,
          nextSession.sessionId,
        );
        if (runUpdated.changes !== 1) {
          throw new Error('The offline marathon run no longer owns this training session.');
        }
      }
    }
  });

  return countPendingAttemptsForLine(db, appUserId, context.lineId);
}

export async function countPendingAttemptsForLine(
  db: SQLiteDatabase,
  appUserId: string,
  lineId: number,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM training_attempt_outbox o
     JOIN local_training_attempt a
       ON a.app_user_id = o.app_user_id AND a.client_attempt_id = o.client_attempt_id
     WHERE o.app_user_id = ? AND a.line_id = ? AND o.state IN ('PENDING', 'SENDING')`,
    appUserId,
    lineId,
  );
  return row?.count ?? 0;
}

export async function restoreStoredTrainingContext(
  db: SQLiteDatabase,
  appUserId: string,
  row: StoredTrainingSessionRow,
): Promise<OfflineTrainingContext> {
  return restoreTrainingContext(db, appUserId, row);
}

async function restoreTrainingContext(
  db: SQLiteDatabase,
  appUserId: string,
  row: StoredTrainingSessionRow,
): Promise<OfflineTrainingContext> {
  const line = await loadStoredLine(db, appUserId, row);
  if (!line) throw new Error('The downloaded content for this session is unavailable.');
  const subline = await loadSubline(
    db,
    appUserId,
    row.course_id,
    row.content_revision,
    row.subline_hash,
    row.subline_key_version,
  );
  if (!subline) throw new Error('The downloaded subline for this session is unavailable.');

  const snapshot = JSON.parse(row.session_json) as SerializableTrainingSession;
  const session = restoreSerializableTrainingSession(snapshot, subline);
  const eventRows = await readPersistedEvents(db, appUserId, row.session_id);
  if (JSON.stringify(eventRows) !== JSON.stringify(session.events)) {
    throw new Error('The local training event rows do not match the session snapshot.');
  }
  if (row.local_status === 'COMPLETED' && !session.completed) {
    throw new Error('The completed local session has an incomplete reducer snapshot.');
  }

  return {
    courseId: line.course_id,
    courseName: line.course_name,
    contentRevision: line.content_revision,
    lineId: line.line_id,
    lineName: line.line_name,
    trainingMode: row.training_mode,
    marathonRunId: row.marathon_run_id,
    localStatus: row.local_status,
    resumed: row.local_status === 'IN_PROGRESS',
    pendingAttemptCount: await countPendingAttemptsForLine(db, appUserId, row.line_id),
    session,
    subline,
  };
}

async function loadActiveLine(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  lineId: number,
): Promise<LineRow | null> {
  return db.getFirstAsync<LineRow>(
    `SELECT l.course_id, r.course_name, l.content_revision,
            l.line_id, l.name AS line_name
     FROM downloaded_course d
     JOIN course_revision r
       ON r.app_user_id = d.app_user_id
       AND r.course_id = d.course_id
       AND r.content_revision = d.active_content_revision
     JOIN course_line l
       ON l.app_user_id = r.app_user_id
       AND l.course_id = r.course_id
       AND l.content_revision = r.content_revision
     WHERE d.app_user_id = ? AND d.course_id = ? AND l.line_id = ?`,
    appUserId,
    courseId,
    lineId,
  );
}

async function loadStoredLine(
  db: SQLiteDatabase,
  appUserId: string,
  session: Pick<StoredTrainingSessionRow, 'course_id' | 'content_revision' | 'line_id'>,
): Promise<LineRow | null> {
  return db.getFirstAsync<LineRow>(
    `SELECT l.course_id, r.course_name, l.content_revision,
            l.line_id, l.name AS line_name
     FROM course_revision r
     JOIN course_line l
       ON l.app_user_id = r.app_user_id
       AND l.course_id = r.course_id
       AND l.content_revision = r.content_revision
     WHERE r.app_user_id = ? AND r.course_id = ? AND r.content_revision = ?
       AND l.line_id = ?`,
    appUserId,
    session.course_id,
    session.content_revision,
    session.line_id,
  );
}

async function selectLocalCandidate(
  db: SQLiteDatabase,
  appUserId: string,
  line: LineRow,
): Promise<SerializableTrainingSubline | null> {
  const candidate = await db.getFirstAsync<SublineRow>(
    `SELECT s.subline_hash, s.subline_key_version, s.line_id,
            s.leaf_node_id, s.starting_fen, s.side_to_train
     FROM training_subline s
     LEFT JOIN local_training_attempt a
       ON a.app_user_id = s.app_user_id
       AND a.line_id = s.line_id
       AND a.subline_hash = s.subline_hash
       AND a.subline_key_version = s.subline_key_version
     WHERE s.app_user_id = ? AND s.course_id = ? AND s.content_revision = ?
       AND s.line_id = ?
       AND EXISTS (
         SELECT 1 FROM training_subline_move m
         WHERE m.app_user_id = s.app_user_id
           AND m.course_id = s.course_id
           AND m.content_revision = s.content_revision
           AND m.subline_hash = s.subline_hash
           AND m.subline_key_version = s.subline_key_version
           AND m.is_user_move = 1
       )
     GROUP BY s.subline_hash, s.subline_key_version, s.line_id,
              s.leaf_node_id, s.starting_fen, s.side_to_train
     ORDER BY COUNT(a.client_attempt_id) ASC,
              (MAX(a.completed_at) IS NOT NULL) ASC,
              MAX(a.completed_at) ASC,
              s.subline_hash ASC
     LIMIT 1`,
    appUserId,
    line.course_id,
    line.content_revision,
    line.line_id,
  );
  if (!candidate) return null;
  return loadSubline(
    db,
    appUserId,
    line.course_id,
    line.content_revision,
    candidate.subline_hash,
    candidate.subline_key_version,
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
  const row = await db.getFirstAsync<SublineRow>(
    `SELECT subline_hash, subline_key_version, line_id, leaf_node_id,
            starting_fen, side_to_train
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
    version: SERIALIZABLE_TRAINING_VERSION,
    lineId: row.line_id,
    startingFen: row.starting_fen,
    sideToTrain: row.side_to_train,
    sublineHash: row.subline_hash,
    sublineKeyVersion: row.subline_key_version,
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

async function readPersistedEvents(
  db: SQLiteDatabase,
  appUserId: string,
  sessionId: string,
): Promise<SerializableTrainingEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT sequence, kind, occurred_at, fen_before, expected_node_id,
            expected_move_uci, played_move_uci, was_correct
     FROM local_training_event
     WHERE app_user_id = ? AND session_id = ?
     ORDER BY sequence`,
    appUserId,
    sessionId,
  );
  return rows.map((event) => ({
    version: SERIALIZABLE_TRAINING_VERSION,
    sequence: event.sequence,
    kind: event.kind,
    occurredAt: event.occurred_at,
    fenBefore: event.fen_before,
    expectedNodeId: event.expected_node_id,
    expectedMoveUci: event.expected_move_uci,
    playedMoveUci: event.played_move_uci,
    wasCorrect: event.was_correct === 1,
  }));
}

async function writeCompletedAttempt(
  db: SQLiteDatabase,
  appUserId: string,
  courseId: number,
  subline: SerializableTrainingSubline,
  session: SerializableTrainingSession,
  trainingMode: OfflineTrainingContext['trainingMode'],
  createdAt: string,
): Promise<void> {
  const attempt = buildMobileTrainingAttempt(courseId, subline, session, trainingMode);
  const attemptJson = JSON.stringify(attempt);
  await db.runAsync(
    `INSERT OR IGNORE INTO local_training_attempt (
      app_user_id, client_attempt_id, session_id, course_id, content_revision,
      line_id, subline_hash, subline_key_version, training_mode, result,
      mistakes_count, total_expected_moves, correct_moves, accuracy,
      started_at, completed_at, session_json, subline_json, attempt_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    appUserId,
    attempt.clientAttemptId,
    session.sessionId,
    attempt.courseId,
    attempt.courseContentRevision,
    session.lineId,
    subline.sublineHash,
    subline.sublineKeyVersion,
    attempt.trainingMode,
    session.status,
    session.counters.mistakesCount,
    session.counters.totalExpectedMoves,
    session.counters.correctMoves,
    session.counters.accuracy,
    session.startedAt,
    session.completedAt!,
    JSON.stringify(session),
    JSON.stringify(subline),
    attemptJson,
    createdAt,
  );
  await db.runAsync(
    `INSERT OR IGNORE INTO training_attempt_outbox (
      app_user_id, client_attempt_id, state, payload_json, retry_count,
      last_attempt_at, last_error, server_training_session_id,
      server_received_at, created_at, updated_at
    ) VALUES (?, ?, 'PENDING', ?, 0, NULL, NULL, NULL, NULL, ?, ?)`,
    appUserId,
    attempt.clientAttemptId,
    attemptJson,
    createdAt,
    createdAt,
  );
}

function assertSameSession(
  previous: SerializableTrainingSession,
  next: SerializableTrainingSession,
  subline: SerializableTrainingSubline,
): void {
  if (
    previous.sessionId !== next.sessionId
    || previous.lineId !== next.lineId
    || next.lineId !== subline.lineId
    || previous.courseContentRevision !== next.courseContentRevision
    || previous.sublineHash !== next.sublineHash
    || previous.sublineKeyVersion !== next.sublineKeyVersion
  ) {
    throw new Error('The reducer transition does not belong to the active local session.');
  }
  if (next.events.length < previous.events.length) {
    throw new Error('The reducer transition removed persisted events.');
  }
  const previousProjection = next.events.slice(0, previous.events.length);
  if (JSON.stringify(previousProjection) !== JSON.stringify(previous.events)) {
    throw new Error('The reducer transition changed an immutable persisted event.');
  }
}
