import { describe, expect, it } from 'vitest';
import { assertAttemptResultCoverage, nextAttemptRetryAt } from './attempt-sync-policy';

const receivedAt = '2026-07-13T12:00:00.000Z';

describe('attempt synchronization policy', () => {
  it('uses bounded exponential retry delays', () => {
    const now = new Date(receivedAt);
    expect(nextAttemptRetryAt(now, 1)).toBe('2026-07-13T12:00:05.000Z');
    expect(nextAttemptRetryAt(now, 2)).toBe('2026-07-13T12:00:10.000Z');
    expect(nextAttemptRetryAt(now, 20)).toBe('2026-07-13T12:05:00.000Z');
  });

  it('requires one result for every claimed attempt', () => {
    expect(() => assertAttemptResultCoverage(['a', 'b'], [
      {
        clientAttemptId: 'a',
        status: 'ACCEPTED',
        trainingSessionId: 1,
        rejectionCode: null,
        message: null,
        receivedAt,
      },
      {
        clientAttemptId: 'b',
        status: 'DUPLICATE',
        trainingSessionId: 2,
        rejectionCode: null,
        message: null,
        receivedAt,
      },
    ])).not.toThrow();

    expect(() => assertAttemptResultCoverage(['a', 'b'], [{
      clientAttemptId: 'a',
      status: 'ACCEPTED',
      trainingSessionId: 1,
      rejectionCode: null,
      message: null,
      receivedAt,
    }])).toThrow(/omitted/i);
  });
});
