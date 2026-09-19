import assert from 'node:assert/strict';
import {
  lichessGamesExplorerQuerySchema,
  openingExplorerErrorResponseSchema,
  openingExplorerResponseSchema,
} from '../dist/index.js';

assert.deepEqual(lichessGamesExplorerQuerySchema.parse({
  fen: 'startpos',
}), {
  fen: 'startpos',
  speedPreset: 'BLITZ_AND_SLOWER',
  ratingTarget: 'MY_PEERS_PLUS_ONE',
});
assert.deepEqual(lichessGamesExplorerQuerySchema.parse({
  fen: 'startpos',
  speedPreset: 'BULLET',
  ratingTarget: 'GROUP',
  ratingGroup: '1800',
}), {
  fen: 'startpos',
  speedPreset: 'BULLET',
  ratingTarget: 'GROUP',
  ratingGroup: 1800,
});
assert.equal(lichessGamesExplorerQuerySchema.safeParse({
  ratingTarget: 'GROUP',
}).success, false);
assert.equal(lichessGamesExplorerQuerySchema.safeParse({
  ratingTarget: 'ALL',
  ratingGroup: '1800',
}).success, false);
assert.equal(lichessGamesExplorerQuerySchema.safeParse({
  speedPreset: 'ULTRA_BULLET',
}).success, false);
assert.equal(lichessGamesExplorerQuerySchema.safeParse({
  ratingTarget: 'GROUP',
  ratingGroup: '1700',
}).success, false);

const response = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  dataset: {
    source: 'LICHESS_GAMES',
    profileVersion: 666067204,
    sinceYear: 0,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 0,
  },
  cache: {
    status: 'REFRESHED',
    fetchedAt: '2026-07-15T12:00:00.000Z',
    expiresAt: '2026-08-14T12:00:00.000Z',
  },
  population: {
    requested: {
      speedPreset: 'BLITZ_AND_SLOWER',
      ratingTarget: 'MY_PEERS_PLUS_ONE',
      ratingGroup: null,
    },
    effective: {
      speeds: ['blitz', 'classical', 'correspondence', 'rapid'],
      ratingGroups: [1400, 1600],
    },
    peerResolution: {
      evidencePeriod: 'RECENT_THREE_MONTHS',
      eligibleGames: 14,
      selectedGroups: [1400],
      distribution: [
        { group: 0, games: 0 },
        { group: 1000, games: 0 },
        { group: 1200, games: 2 },
        { group: 1400, games: 12 },
        { group: 1600, games: 0 },
        { group: 1800, games: 0 },
        { group: 2000, games: 0 },
        { group: 2200, games: 0 },
        { group: 2500, games: 0 },
      ],
      contributions: [{
        accountId: 7,
        provider: 'LICHESS',
        username: 'player',
        speed: 'blitz',
        games: 14,
      }],
      normalizationProfile: {
        id: 'universal-online-strength',
        version: '2026-07-lichess-bands-v1',
      },
      resolverPolicyVersion: 'dominant-contiguous-window-v1',
    },
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