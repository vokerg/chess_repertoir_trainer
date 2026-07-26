import assert from 'node:assert/strict';
import {
  openingExplorerErrorResponseSchema,
  openingExplorerResponseSchema,
} from '../dist/index.js';

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
