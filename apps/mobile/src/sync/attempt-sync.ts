import type { SQLiteDatabase } from 'expo-sqlite';
import { postMobileTrainingAttempts } from '../api/mobile-api-client';
import {
  applyAttemptBatchResults,
  claimPendingAttemptBatch,
  makePendingAttemptsImmediatelyEligible,
  readAttemptSyncStatus,
  recoverInterruptedAttemptUploads,
  releaseAttemptBatchForRetry,
  type AttemptSyncStatus,
} from '../db/repositories/attempt-outbox.repository';
import { mobileLogger } from '../diagnostics/mobile-logger';
import { ATTEMPT_SYNC_BATCH_LIMIT } from './attempt-sync-policy';

export type AttemptSyncRunSummary = {
  uploaded: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  status: AttemptSyncStatus;
};

type SyncInput = {
  db: SQLiteDatabase;
  appUserId: string;
  token: string;
  force?: boolean;
};

const inFlightByUser = new Map<string, Promise<AttemptSyncRunSummary>>();

export function syncPendingTrainingAttempts(input: SyncInput): Promise<AttemptSyncRunSummary> {
  const existing = inFlightByUser.get(input.appUserId);
  if (existing) return existing;

  const run = runAttemptSync(input).finally(() => {
    if (inFlightByUser.get(input.appUserId) === run) {
      inFlightByUser.delete(input.appUserId);
    }
  });
  inFlightByUser.set(input.appUserId, run);
  return run;
}

async function runAttemptSync(input: SyncInput): Promise<AttemptSyncRunSummary> {
  await recoverInterruptedAttemptUploads(input.db, input.appUserId);
  if (input.force) {
    await makePendingAttemptsImmediatelyEligible(input.db, input.appUserId);
  }

  let uploaded = 0;
  let accepted = 0;
  let duplicates = 0;
  let rejected = 0;

  while (true) {
    const batch = await claimPendingAttemptBatch(
      input.db,
      input.appUserId,
      ATTEMPT_SYNC_BATCH_LIMIT,
    );
    if (batch.attempts.length === 0) {
      if (batch.scannedCount > 0) continue;
      break;
    }

    try {
      const response = await postMobileTrainingAttempts({
        deviceId: batch.deviceId,
        attempts: batch.attempts.map((item) => item.attempt),
      }, input.token);
      const applied = await applyAttemptBatchResults(
        input.db,
        input.appUserId,
        batch.attempts,
        response.results,
      );
      uploaded += batch.attempts.length;
      accepted += applied.accepted;
      duplicates += applied.duplicates;
      rejected += applied.rejected;
      mobileLogger.info('attempt-sync', 'Processed offline attempt batch', {
        uploaded: batch.attempts.length,
        accepted: applied.accepted,
        duplicates: applied.duplicates,
        rejected: applied.rejected,
      });
    } catch (error) {
      const message = compactErrorMessage(error);
      await releaseAttemptBatchForRetry(
        input.db,
        input.appUserId,
        batch.attempts,
        message,
      );
      mobileLogger.error('attempt-sync', 'Attempt upload batch failed', error);
      throw error;
    }
  }

  return {
    uploaded,
    accepted,
    duplicates,
    rejected,
    status: await readAttemptSyncStatus(input.db, input.appUserId),
  };
}

function compactErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length <= 500 ? value : `${value.slice(0, 497)}...`;
}
