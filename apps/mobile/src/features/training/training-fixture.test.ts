import { describe, expect, it } from 'vitest';
import {
  applySerializableTrainingMove,
  restoreSerializableTrainingSession,
} from 'chess-domain/training';
import {
  PHASE_ONE_TRAINING_SUBLINE,
  createPhaseOneTrainingSession,
} from './training-fixture';

describe('Phase 1 mobile training fixture', () => {
  it('supports wrong retries, opponent autoplay, completion, and JSON restore', () => {
    let session = createPhaseOneTrainingSession(new Date('2026-07-12T12:00:00.000Z'));

    const wrong = applySerializableTrainingMove(
      session,
      PHASE_ONE_TRAINING_SUBLINE,
      'd2d4',
      '2026-07-12T12:00:10.000Z',
    );
    expect(wrong.correct).toBe(false);
    expect(wrong.session.currentFen).toBe('startpos');

    const e4 = applySerializableTrainingMove(
      wrong.session,
      PHASE_ONE_TRAINING_SUBLINE,
      'e2e4',
      '2026-07-12T12:00:20.000Z',
    );
    expect(e4.appliedMoves.map((move) => move.moveSan)).toEqual(['e4', 'e5']);

    const nf3 = applySerializableTrainingMove(
      e4.session,
      PHASE_ONE_TRAINING_SUBLINE,
      'g1f3',
      '2026-07-12T12:00:30.000Z',
    );
    expect(nf3.appliedMoves.map((move) => move.moveSan)).toEqual(['Nf3', 'Nc6']);

    session = applySerializableTrainingMove(
      nf3.session,
      PHASE_ONE_TRAINING_SUBLINE,
      'f1b5',
      '2026-07-12T12:00:40.000Z',
    ).session;

    expect(session).toMatchObject({ completed: true, status: 'FAILED' });
    expect(session.counters).toEqual({
      mistakesCount: 1,
      totalExpectedMoves: 4,
      correctMoves: 3,
      accuracy: 0.75,
    });

    const persisted = JSON.parse(JSON.stringify(session));
    expect(
      restoreSerializableTrainingSession(persisted, PHASE_ONE_TRAINING_SUBLINE),
    ).toEqual(session);
  });
});
