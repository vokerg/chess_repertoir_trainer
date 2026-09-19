import {
  mobileTrainingAttemptSchema,
  type MobileTrainingAttemptBatchResponseDto,
  type MobileTrainingAttemptDto,
} from '@chess-trainer/contracts/mobile-sync';
import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  assertAttemptResultCoverage,
  attemptRejectionMessage,
  nextAttemptRetryAt,
} from '../../sync/attempt-sync-policy';

export type AttemptSyncStatus = {
  pendingCount: number;
  sendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  lastAttemptAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
};

export type ClaimedAttempt = {
  clientAttemptId: string;
  attempt: MobileTrainingAttemptDto;
  retryCount: number;
};

export type ClaimedAttemptBatch = {
  deviceId: string;
  scannedCount: number;
  attempts: ClaimedAttempt[];
};

type OutboxRow = {
  client_attempt_id: string;
  payload_json: string;
  retry_count: number;
};

type StatusRow = {
  pending_count: number;
  sending_count: number;
  accepted_count: number;
  rejected_count: number;
  last_attempt_at: string | null;
  last_successful_sync_at: string | null;
};

type ErrorRow = {
  last_error: string;
};

type AttemptResult = MobileTrainingAttemptBatchResponseDto['results'][number];

export async function getOrCreateMobileDeviceId(db: SQLiteDatabase): Promise<string> {
  const existing = await db.getFirstAsync<{ device_id: string }>(
    'SELECT device_id FROM mobile_installation WHERE singleton_id = 1',
  );
  if (existing) return existing.device_id;

  const deviceId = randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO mobile_installation (singleton_id, device_id, created_at)
     VALUES (1, ?, ?)`,
    deviceId,
    now,
  );
  const stored = await db.getFirstAsync<{ device_id: string }>(
    'SELECT device_id FROM mobile_installation WHERE singleton_id = 1',
  );
  if (!stored) throw new Error('Could not create the mobile installation identity.');
  return stored.device_id;
}

export async function recoverInterruptedAttemptUploads(
  db: SQLiteDatabase,
  appUserId: string,
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `UPDATE training_attempt_outbox
     SET state = 'PENDING', next_attempt_at = NULL,
         last_error = COALESCE(last_error, 'Recovered an interrupted upload.'),
         updated_at = ?
     WHERE app_user_id = ? AND state = 'SENDING'`,
    now,
    appUserId,
  );
  return result.changes;
}

export async function makePendingAttemptsImmediatelyEligible(
  db: SQLiteDatabase,
  appUserId: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE training_attempt_outbox
     SET next_attempt_at = NULL, updated_at = ?
     WHERE app_user_id = ? AND state = 'PENDING'`,
    new Date().toISOString(),
    appUserId,
  );
}

export async function claimPendingAttemptBatch(
  db: SQLiteDatabase,
  appUserId: string,
  limit: number,
): Promise<ClaimedAttemptBatch> {
  const deviceId = await getOrCreateMobileDeviceId(db);
  const now = new Date().toISOString();
  const attempts: ClaimedAttempt[] = [];
  let scannedCount = 0;

  await db.withExclusiveTransactionAsync(async (tx) => {
    const rows = await tx.getAllAsync<OutboxRow>(
      `SELECT client_attempt_id, payload_json, retry_count
       FROM training_attempt_outbox
       WHERE app_user_id = ? AND state = 'PENDING'
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY created_at, client_attempt_id
       LIMIT ?`,
      appUserId,
      now,
      limit,
    );
    scannedCount = rows.length;

    for (const row of rows) {
      const parsed = parseAttemptPayload(row.payload_json);
      if (!parsed.success) {
        await tx.runAsync(
          `UPDATE training_attempt_outbox
           SET state = 'REJECTED', last_error = ?, next_attempt_at = NULL, updated_at = ?
           WHERE app_user_id = ? AND client_attempt_id = ? AND state = 'PENDING'`,
          `Invalid local attempt payload: ${parsed.message}`,
          now,
          appUserId,
          row.client_attempt_id,
        );
        continue;
      }

      const retryCount = row.retry_count + 1;
      const claimed = await tx.runAsync(
        `UPDATE training_attempt_outbox
         SET state = 'SENDING', retry_count = ?, last_attempt_at = ?,
             last_error = NULL, next_attempt_at = NULL, updated_at = ?
         WHERE app_user_id = ? AND client_attempt_id = ? AND state = 'PENDING'`,
        retryCount,
        now,
        now,
        appUserId,
        row.client_attempt_id,
      );
      if (claimed.changes === 1) {
        attempts.push({
          clientAttemptId: row.client_attempt_id,
          attempt: parsed.attempt,
          retryCount,
        });
      }
    }
  });

  return { deviceId, scannedCount, attempts };
}

export async function releaseAttemptBatchForRetry(
  db: SQLiteDatabase,
  appUserId: string,
  attempts: readonly ClaimedAttempt[],
  errorMessage: string,
): Promise<void> {
  const now = new Date();
  const updatedAt = now.toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const attempt of attempts) {
      await tx.runAsync(
        `UPDATE training_attempt_outbox
         SET state = 'PENDING', last_error = ?, next_attempt_at = ?, updated_at = ?
         WHERE app_user_id = ? AND client_attempt_id = ? AND state = 'SENDING'`,
        errorMessage,
        nextAttemptRetryAt(now, attempt.retryCount),
        updatedAt,
        appUserId,
        attempt.clientAttemptId,
      );
    }
  });
}

export async function applyAttemptBatchResults(
  db: SQLiteDatabase,
  appUserId: string,
  attempts: readonly ClaimedAttempt[],
  results: readonly AttemptResult[],
): Promise<{ accepted: number; duplicates: number; rejected: number }> {
  const clientAttemptIds = attempts.map((attempt) => attempt.clientAttemptId);
  assertAttemptResultCoverage(clientAttemptIds, results);
  let accepted = 0;
  let duplicates = 0;
  let rejected = 0;
  const now = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const result of results) {
      const acceptedState = result.status === 'ACCEPTED' || result.status === 'DUPLICATE';
      const state = acceptedState ? 'ACCEPTED' : 'REJECTED';
      const lastError = result.status === 'REJECTED' ? attemptRejectionMessage(result) : null;
      const update = await tx.runAsync(
        `UPDATE training_attempt_outbox
         SET state = ?, last_error = ?, next_attempt_at = NULL,
             server_training_session_id = ?, server_received_at = ?, updated_at = ?
         WHERE app_user_id = ? AND client_attempt_id = ? AND state = 'SENDING'`,
        state,
        lastError,
        result.trainingSessionId,
        result.receivedAt,
        now,
        appUserId,
        result.clientAttemptId,
      );
      if (update.changes !== 1) {
        throw new Error(`Attempt ${result.clientAttemptId} was no longer in SENDING state.`);
      }

      if (result.status === 'ACCEPTED') accepted += 1;
      else if (result.status === 'DUPLICATE') duplicates += 1;
      else rejected += 1;
    }
  });

  return { accepted, duplicates, rejected };
}

export async function readAttemptSyncStatus(
  db: SQLiteDatabase,
  appUserId: string,
): Promise<AttemptSyncStatus> {
  const [row, errorRow] = await Promise.all([
    db.getFirstAsync<StatusRow>(
      `SELECT
         COALESCE(SUM(CASE WHEN state = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_count,
         COALESCE(SUM(CASE WHEN state = 'SENDING' THEN 1 ELSE 0 END), 0) AS sending_count,
         COALESCE(SUM(CASE WHEN state = 'ACCEPTED' THEN 1 ELSE 0 END), 0) AS accepted_count,
         COALESCE(SUM(CASE WHEN state = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected_count,
         MAX(last_attempt_at) AS last_attempt_at,
         MAX(CASE WHEN state = 'ACCEPTED' THEN server_received_at END) AS last_successful_sync_at
       FROM training_attempt_outbox
       WHERE app_user_id = ?`,
      appUserId,
    ),
    db.getFirstAsync<ErrorRow>(
      `SELECT last_error
       FROM training_attempt_outbox
       WHERE app_user_id = ? AND last_error IS NOT NULL
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      appUserId,
    ),
  ]);

  return {
    pendingCount: row?.pending_count ?? 0,
    sendingCount: row?.sending_count ?? 0,
    acceptedCount: row?.accepted_count ?? 0,
    rejectedCount: row?.rejected_count ?? 0,
    lastAttemptAt: row?.last_attempt_at ?? null,
    lastSuccessfulSyncAt: row?.last_successful_sync_at ?? null,
    lastError: errorRow?.last_error ?? null,
  };
}

function parseAttemptPayload(value: string):
  | { success: true; attempt: MobileTrainingAttemptDto }
  | { success: false; message: string } {
  try {
    const parsedJson: unknown = JSON.parse(value);
    const parsed = mobileTrainingAttemptSchema.safeParse(parsedJson);
    if (parsed.success) return { success: true, attempt: parsed.data };
    return { success: false, message: parsed.error.issues[0]?.message ?? 'schema validation failed' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'invalid JSON',
    };
  }
}
