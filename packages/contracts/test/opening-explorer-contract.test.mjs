import assert from 'node:assert/strict';
import {
  lichessGamesExplorerQuerySchema,
  openingExplorerErrorResponseSchema,
  openingExplorerResponseSchema,
} from '../dist/index.js';

assert.deepEqual(lichessGamesExplorerQuerySchema.parse({
  fen: 'startpos',
  since: '2024-01',
  until: '2024-12',
  ratings: '1600,1800',
  speeds: 'blitz,rapid',
}), {
  fen: 'startpos',
  since: '2024-01',
  until: '2024-12',
  ratings: [1600, 1800],
  speeds: ['blitz', 'rapid'],
});
assert.equal(lichessGamesExplorerQuerySchema.safeParse({ ratings: '1700' }).success, false);
assert.equal(lichessGamesExplorerQuerySchema.safeParse({
  since: '2025-01',
  until: '2024-12',
}).success, false);

const response = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  dataset: {
    source: 'LICHESS_GAMES',
    profileVersion: 1,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 4,
  },
  cache: {
    status: 'REFRESHED',
    fetchedAt: '2026-07-15T12:00:00.000Z',
    expiresAt: '2026-08-14T12:00:00.000Z',
  },
  opening: null,
  games: { total: 0, whiteWins: 0, draws: 0, blackWins: 0 },
  moves: [],
  topGames: [],
};

assert.deepEqual(openingExplorerResponseSchema.parse(response), response);
assert.deepEqual(openingExplorerErrorResponseSchema.parse({
  error: 'Lichess games explorer is temporarily unavailable.',
  code: 'LICHESS_GAMES_EXPLORER_UNAVAILABLE',
}), {
  error: 'Lichess games explorer is temporarily unavailable.',
  code: 'LICHESS_GAMES_EXPLORER_UNAVAILABLE',
});

console.log('Opening explorer contract tests passed.');
