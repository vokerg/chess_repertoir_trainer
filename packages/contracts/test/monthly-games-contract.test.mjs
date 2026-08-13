import assert from 'node:assert/strict';
import { monthlyGamesResponseSchema } from '../dist/lab/index.js';

const monthStart = new Date('2026-07-01T00:00:00.000Z');
const response = {
  excludeBullet: true,
  items: [
    {
      year: 2026,
      month: 7,
      monthStart,
      games: 12,
      wins: 6,
      draws: 2,
      losses: 4,
      scorePct: 58.333333333333336,
      avgOpponentRatingLichess: 1842.5,
      avgOpponentRatingChessCom: null,
      highestRatedLichess: 2011,
      highestRatedChessCom: null,
    },
  ],
};

const parsed = monthlyGamesResponseSchema.parse(response);
assert.equal(parsed.items[0].monthStart, monthStart.toISOString());
assert.deepEqual(
  monthlyGamesResponseSchema.parse({ excludeBullet: false, items: [] }),
  { excludeBullet: false, items: [] },
);
assert.equal(
  monthlyGamesResponseSchema.safeParse({
    ...response,
    items: [{ ...response.items[0], month: 13 }],
  }).success,
  false,
  'month must stay within the calendar range',
);
assert.equal(
  monthlyGamesResponseSchema.safeParse({
    ...response,
    items: [{ ...response.items[0], games: -1 }],
  }).success,
  false,
  'game counts cannot be negative',
);
assert.equal(
  monthlyGamesResponseSchema.safeParse({
    ...response,
    items: [{ ...response.items[0], scorePct: 101 }],
  }).success,
  false,
  'score percentage cannot exceed 100',
);

console.log('Monthly games contract tests passed.');
