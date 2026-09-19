import type { MobileTrainingAttemptBatchResponseDto } from '@chess-trainer/contracts/mobile-sync';

export const ATTEMPT_SYNC_BATCH_LIMIT = 100;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

type AttemptResult = MobileTrainingAttemptBatchResponseDto['results'][number];

export function nextAttemptRetryAt(now: Date, retryCount: number): string {
  const exponent = Math.max(0, retryCount - 1);
  const delay = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * (2 ** exponent));
  return new Date(now.getTime() + delay).toISOString();
}

export function assertAttemptResultCoverage(
  clientAttemptIds: readonly string[],
  results: readonly AttemptResult[],
): void {
  const expected = new Set(clientAttemptIds);
  const seen = new Set<string>();

  for (const result of results) {
    if (!expected.has(result.clientAttemptId)) {
      throw new Error(`Attempt sync response contained unexpected id ${result.clientAttemptId}.`);
    }
    if (seen.has(result.clientAttemptId)) {
      throw new Error(`Attempt sync response duplicated id ${result.clientAttemptId}.`);
    }
    seen.add(result.clientAttemptId);
  }

  const missing = clientAttemptIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`Attempt sync response omitted ${missing.length} attempt result(s).`);
  }
}

export function attemptRejectionMessage(result: AttemptResult): string {
  const code = result.rejectionCode ?? 'REJECTED';
  return result.message ? `${code}: ${result.message}` : code;
}
