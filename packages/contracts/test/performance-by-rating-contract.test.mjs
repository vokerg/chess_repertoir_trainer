import assert from 'node:assert/strict';
import {
  performanceByRatingQuerySchema,
  performanceByRatingResponseSchema,
} from '../dist/performance-by-rating/index.js';

assert.deepEqual(
  performanceByRatingQuerySchema.parse({
    from: '2026-04-14',
    to: '2026-07-14',
    minRating: '600',
  }),
  {
    from: '2026-04-14',
    to: '2026-07-14',
    minRating: 600,
  },
);
assert.equal(
  performanceByRatingQuerySchema.safeParse({ from: '2026-07-15', to: '2026-07-14' }).success,
  false,
);
assert.equal(performanceByRatingQuerySchema.safeParse({ minRating: '-1' }).success, false);

const response = {
  range: { from: '2026-04-14', to: '2026-07-14' },
  items: [{
    provider: 'LICHESS',
    speed: 'blitz',
    type: 'LICHESS_BLITZ',
    ratingFrom: 1200,
    ratingTo: 1299,
    games: 10,
    analysedGames: 8,
    accuracyGames: 7,
    wdl: { wins: 5, draws: 2, losses: 3 },
    whiteWdl: { wins: 3, draws: 1, losses: 1 },
    blackWdl: { wins: 2, draws: 1, losses: 2 },
    scorePercent: 60,
    openingSuccess: 3,
    openingTrouble: 2,
    wasWinningAndLost: 1,
    wasLosingAndWon: 1,
    flaggedInWinningPosition: 0,
    opponentFlaggedInWinningPosition: 1,
    slowBleedLosses: 1,
    slowBleedWins: 2,
    averageAccuracy: 78.4,
  }],
};

assert.deepEqual(performanceByRatingResponseSchema.parse(response), response);
assert.equal(
  performanceByRatingResponseSchema.safeParse({
    ...response,
    items: [{ ...response.items[0], scorePercent: 101 }],
  }).success,
  false,
);

console.log('Performance by rating contract tests passed.');
