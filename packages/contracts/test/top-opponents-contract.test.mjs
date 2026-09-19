import assert from 'node:assert/strict';
import { topOpponentsResponseSchema } from '../dist/lab/index.js';

const response = {
  items: [
    { opponentUsername: 'frequent-opponent', games: 12 },
    { opponentUsername: 'another-opponent', games: 3 },
  ],
};

assert.deepEqual(topOpponentsResponseSchema.parse(response), response);
assert.equal(
  topOpponentsResponseSchema.safeParse({ items: [{ opponentUsername: '', games: 1 }] }).success,
  false,
  'opponent usernames returned by the query must be non-empty',
);
assert.equal(
  topOpponentsResponseSchema.safeParse({ items: [{ opponentUsername: 'player', games: -1 }] }).success,
  false,
  'game counts cannot be negative',
);

console.log('Top opponents contract tests passed.');
