import assert from 'node:assert/strict';
import {
  OPENING_ANALYSIS_PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
  openingAnalysisCoreResponseSchema,
  openingAnalysisPerformanceResponseSchema,
  openingAnalysisTopGamesResponseSchema,
} from '../dist/imported-games/index.js';

const filters = {
  fen: 'startpos',
  normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  rated: true,
  sort: 'endedAtDesc',
  limit: 200,
};
const wdl = { total: 12, wins: 6, draws: 2, losses: 4, scorePct: 58.3 };

const core = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  normalizedFen: filters.normalizedFen,
  bookOpening: {
    eco: 'A00',
    name: 'Start position',
    pgn: '',
    uci: '',
    epd: filters.normalizedFen,
    ply: 0,
    source: 'FEN',
  },
  sideToMove: 'WHITE',
  fullMoveNumber: 1,
  ratedOnly: true,
  occurrences: 12,
  games: wdl,
  nextMoves: [{
    moveUci: 'e2e4',
    moveSan: 'e4',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    side: 'WHITE',
    moveNumber: 1,
    occurrences: 8,
    games: { total: 8, wins: 4, draws: 1, losses: 3, scorePct: 56.3 },
    gameCount: 8,
    moveSharePercent: 66.7,
    scoreDeltaVsPositionPercent: -2,
    lastPlayedAt: '2026-08-13T18:30:00.000Z',
    personalContext: {
      policyVersion: OPENING_ANALYSIS_PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
      familiarity: 'COMMON',
      resultContext: 'INSUFFICIENT',
      resultSampleQualified: false,
    },
  }],
  appliedFilters: filters,
};
assert.deepEqual(openingAnalysisCoreResponseSchema.parse(core), core);
assert.throws(() => openingAnalysisCoreResponseSchema.parse({ ...core, sideToMove: 'GREEN' }));
assert.throws(() => openingAnalysisCoreResponseSchema.parse({ ...core, appliedFilters: {} }));
assert.throws(() => openingAnalysisCoreResponseSchema.parse({
  ...core,
  nextMoves: [{
    ...core.nextMoves[0],
    personalContext: { ...core.nextMoves[0].personalContext, policyVersion: 'unknown-policy' },
  }],
}));
assert.throws(() => openingAnalysisCoreResponseSchema.parse({
  ...core,
  appliedFilters: { ...filters, from: new Date('2026-08-01T00:00:00.000Z') },
}));

const performance = {
  fen: core.fen,
  normalizedFen: core.normalizedFen,
  performance: {
    sample: { games: 12, taggedGames: 9 },
    wdl,
    tags: [{ code: 1, name: 'Tactical', games: 4, ratePct: 33.3, wdl }],
    buckets: [{
      key: 'recent',
      label: 'Recent',
      games: 12,
      ratePct: 100,
      tags: [{ code: 1, name: 'Tactical', games: 4, ratePct: 33.3, wdl }],
    }],
  },
  appliedFilters: filters,
};
assert.deepEqual(openingAnalysisPerformanceResponseSchema.parse(performance), performance);
assert.throws(() => openingAnalysisPerformanceResponseSchema.parse({
  ...performance,
  performance: { ...performance.performance, sample: { games: -1, taggedGames: 0 } },
}));

const topGamesFilters = { ...filters, limit: 10 };
const topGames = {
  fen: core.fen,
  normalizedFen: core.normalizedFen,
  topGames: [{
    id: 42,
    provider: 'LICHESS',
    endedAt: '2026-08-13T18:30:00.000Z',
    speedCategory: 'rapid',
    white: { username: 'white', rating: 1800 },
    black: { username: 'black', rating: 1810 },
    resultForUser: 'WIN',
    opening: { eco: 'C20', name: "King's Pawn Game" },
    moveNumber: 1,
    nextMoveUci: 'e2e4',
    nextMoveSan: 'e4',
  }],
  appliedFilters: topGamesFilters,
};
assert.deepEqual(openingAnalysisTopGamesResponseSchema.parse(topGames), topGames);
assert.throws(() => openingAnalysisTopGamesResponseSchema.parse({
  ...topGames,
  topGames: [{ ...topGames.topGames[0], provider: 'UNKNOWN' }],
}));
assert.throws(() => openingAnalysisTopGamesResponseSchema.parse({
  ...topGames,
  appliedFilters: { ...topGamesFilters, limit: 51 },
}));

console.log('Opening analysis contract tests passed.');
