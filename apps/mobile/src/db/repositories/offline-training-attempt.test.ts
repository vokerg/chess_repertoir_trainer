import { describe, expect, it } from 'vitest';
import {
  applySerializableTrainingMove,
  createSerializableTrainingSession,
} from 'chess-domain/training';
import { PHASE_ONE_TRAINING_SUBLINE } from '../../features/training/training-fixture';
import { buildMobileTrainingAttempt } from './offline-training-attempt';

describe('offline training attempt payload', () => {
  it('uses the completed replayable session as a pending synchronization payload', () => {
    let session = createSerializableTrainingSession({
      sessionId: '9b79d8e9-335f-4a53-8180-bd29d3908e0f',
      courseContentRevision: 7,
      startedAt: '2026-07-13T08:00:00.000Z',
      subline: PHASE_ONE_TRAINING_SUBLINE,
    });
    for (const [move, occurredAt] of [
      ['d2d4', '2026-07-13T08:00:01.000Z'],
      ['e2e4', '2026-07-13T08:00:02.000Z'],
      ['g1f3', '2026-07-13T08:00:03.000Z'],
      ['f1b5', '2026-07-13T08:00:04.000Z'],
    ] as const) {
      session = applySerializableTrainingMove(
        session,
        PHASE_ONE_TRAINING_SUBLINE,
        move,
        occurredAt,
      ).session;
    }

    const attempt = buildMobileTrainingAttempt(11, PHASE_ONE_TRAINING_SUBLINE, session);
    expect(attempt.clientAttemptId).toBe(session.sessionId);
    expect(attempt.courseId).toBe(11);
    expect(attempt.courseContentRevision).toBe(7);
    expect(attempt.trainingMode).toBe('LINE');
    expect(attempt.session.status).toBe('FAILED');
    expect(attempt.events).toHaveLength(4);
    expect(attempt.counters).toEqual({
      mistakesCount: 1,
      totalExpectedMoves: 4,
      correctMoves: 3,
      accuracy: 0.75,
    });
  });

  it('preserves the marathon mode for server progress ingestion', () => {
    let session = createSerializableTrainingSession({
      sessionId: '3c85cd93-e33e-4de7-8df6-60dc84905d66',
      courseContentRevision: 7,
      startedAt: '2026-07-13T09:00:00.000Z',
      subline: PHASE_ONE_TRAINING_SUBLINE,
    });
    for (const [move, occurredAt] of [
      ['e2e4', '2026-07-13T09:00:01.000Z'],
      ['g1f3', '2026-07-13T09:00:02.000Z'],
      ['f1b5', '2026-07-13T09:00:03.000Z'],
    ] as const) {
      session = applySerializableTrainingMove(session, PHASE_ONE_TRAINING_SUBLINE, move, occurredAt).session;
    }

    expect(buildMobileTrainingAttempt(
      11,
      PHASE_ONE_TRAINING_SUBLINE,
      session,
      'WEAK_SUBLINES',
    ).trainingMode).toBe('WEAK_SUBLINES');
  });
});
