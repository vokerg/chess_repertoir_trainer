import type { LichessPuzzleRound } from '@chess-trainer/contracts/lichess-puzzles';
import { toLichessPuzzleTrainerViewModel } from './lichess-puzzle-trainer-view-model';

describe('toLichessPuzzleTrainerViewModel', () => {
  it('maps an active rated round without exposing the wire DTO', () => {
    const view = toLichessPuzzleTrainerViewModel(createRound());

    expect(view.roundId).toBe(7);
    expect(view.lastMove).toEqual({ from: 'e7', to: 'e5' });
    expect(view.outcomeLabel).toBe('Your move');
    expect(view.ratingLabel).toBe('Rated on Lichess');
    expect(view.syncLabel).toBe('Awaiting result');
    expect(view.canAbandon).toBeTrue();
    expect(view.canStartNext).toBeFalse();
    expect(view.mistakeFeedback).toBeNull();
  });

  it('maps a failed completed round to explicit retry state', () => {
    const view = toLichessPuzzleTrainerViewModel(createRound({
      status: 'COMPLETED',
      outcome: 'LOSS',
      currentStep: 3,
      firstWrongAt: '2026-07-29T05:00:00.000Z',
      upstreamStatus: 'FAILED',
      completedAt: '2026-07-29T05:01:00.000Z',
    }));

    expect(view.outcomeLabel).toBe('Line completed after a mistake');
    expect(view.ratingLabel).toBe('Lichess sync failed');
    expect(view.syncLabel).toBe('Failed');
    expect(view.guidance).toBeNull();
    expect(view.mistakeFeedback).toContain('recorded this rated puzzle as a loss');
    expect(view.canRetrySync).toBeTrue();
    expect(view.canStartNext).toBeTrue();
  });
});

function createRound(overrides: Partial<LichessPuzzleRound> = {}): LichessPuzzleRound {
  return {
    id: 7,
    source: 'FRESH',
    angle: 'mix',
    difficulty: 'normal',
    ratedRequested: true,
    status: 'IN_PROGRESS',
    outcome: null,
    currentFen: 'fen',
    lastMoveUci: 'e7e5',
    currentStep: 0,
    firstWrongAt: null,
    learningCompletedAt: null,
    upstreamStatus: 'NOT_REQUIRED',
    ratingDiff: null,
    startedAt: '2026-07-29T04:59:00.000Z',
    completedAt: null,
    puzzle: {
      id: 'abcde',
      rating: 1600,
      themes: ['fork'],
      startFen: 'fen',
      lastMoveUci: 'e7e5',
      sideToMove: 'WHITE',
      solutionPlies: 3,
    },
    ...overrides,
  };
}
