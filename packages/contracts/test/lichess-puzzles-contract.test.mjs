import assert from 'node:assert/strict';
import {
  createLichessPuzzleRoundBodySchema,
  lichessPuzzleRoundSchema,
  submitLichessPuzzleMoveBodySchema,
} from '../dist/lichess-puzzles/index.js';

{
  const parsed = createLichessPuzzleRoundBodySchema.parse({});
  assert.deepEqual(parsed, {
    source: 'FRESH',
    angle: 'mix',
    difficulty: 'normal',
    rated: true,
  });
}

{
  assert.deepEqual(submitLichessPuzzleMoveBodySchema.parse({ moveUci: 'a7a8q' }), {
    moveUci: 'a7a8q',
  });
  assert.throws(() => submitLichessPuzzleMoveBodySchema.parse({ moveUci: 'Nf3' }));
}

{
  const round = {
    id: 1,
    source: 'FRESH',
    angle: 'mix',
    difficulty: 'normal',
    ratedRequested: true,
    status: 'IN_PROGRESS',
    outcome: null,
    currentFen: 'fen',
    currentStep: 0,
    firstWrongAt: null,
    learningCompletedAt: null,
    upstreamStatus: 'NOT_REQUIRED',
    ratingDiff: null,
    startedAt: '2026-07-29T05:00:00.000Z',
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
  };
  assert.deepEqual(lichessPuzzleRoundSchema.parse(round), round);
  assert.equal('solutionUci' in lichessPuzzleRoundSchema.parse({
    ...round,
    puzzle: { ...round.puzzle, solutionUci: ['g1f3'] },
  }).puzzle, false);
}
