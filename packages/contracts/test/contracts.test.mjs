import assert from 'node:assert/strict';
import {
  boardImageQuerySchema,
  importedGameFacetsResponseSchema,
  importedGameSearchQuerySchema,
  mobileSyncManifestSchema,
  openingStrugglesQuerySchema,
  openingStrugglesResponseSchema,
  performanceByRatingQuerySchema,
  performanceByRatingResponseSchema,
  positionAnalysisLineSchema,
  serializableTrainingSessionSchema,
} from '../dist/index.js';

assert.deepEqual(boardImageQuerySchema.parse({ fen: 'startpos' }), {
  fen: 'startpos',
  pov: 'white',
  turn: 'none',
});

assert.deepEqual(importedGameSearchQuerySchema.parse({ limit: '25', rated: 'false' }), {
  sort: 'endedAtDesc',
  limit: 25,
  rated: false,
});
assert.equal(importedGameSearchQuerySchema.safeParse({ providers: 'LICHESS,INVALID' }).success, false);

assert.deepEqual(positionAnalysisLineSchema.parse({ moveUci: null, pvUci: [] }), {
  moveUci: null,
  pvUci: [],
});
assert.equal(positionAnalysisLineSchema.safeParse({ moveUci: 'e2e4' }).success, false, 'pvUci is required');
assert.equal(positionAnalysisLineSchema.safeParse({ pvUci: null }).success, false, 'null differs from absence and arrays');

const emptyFacets = {
  accounts: [], providers: [], speeds: [], variants: [], results: [], colors: [],
  openings: [], analysisStatuses: [], tags: [],
};
assert.deepEqual(importedGameFacetsResponseSchema.parse(emptyFacets), emptyFacets);
assert.equal(importedGameFacetsResponseSchema.safeParse({ accounts: [] }).success, false);

const session = {
  version: 1,
  sessionId: 'local-session',
  lineId: 7,
  sublineHash: 'hash',
  sublineKeyVersion: 1,
  courseContentRevision: 3,
  sideToTrain: 'WHITE',
  startingFen: 'startpos',
  startedAt: '2026-07-12T12:00:00.000Z',
  completedAt: null,
  status: 'IN_PROGRESS',
  nextMoveIndex: 0,
  expectedMoveIndex: 0,
  currentFen: 'startpos',
  lastMoveUci: null,
  completed: false,
  completedEarly: false,
  counters: { mistakesCount: 0, totalExpectedMoves: 0, correctMoves: 0, accuracy: null },
  events: [],
};
assert.deepEqual(serializableTrainingSessionSchema.parse(session), session);
assert.equal(
  serializableTrainingSessionSchema.safeParse({ ...session, version: 2 }).success,
  false,
  'persisted training versions are explicit',
);

const manifest = {
  manifestSchemaVersion: 1,
  bundleSchemaVersion: 1,
  minimumSupportedAppVersion: null,
  generatedAt: '2026-07-12T12:00:00.000Z',
  courses: [],
};
assert.deepEqual(mobileSyncManifestSchema.parse(manifest), manifest);
assert.equal(
  mobileSyncManifestSchema.safeParse({ ...manifest, generatedAt: 'not-a-date' }).success,
  false,
);

assert.deepEqual(performanceByRatingQuerySchema.parse({ from: '2026-04-14', to: '2026-07-14', minRating: '600' }), {
  from: '2026-04-14',
  to: '2026-07-14',
  minRating: 600,
});
assert.equal(
  performanceByRatingQuerySchema.safeParse({ from: '2026-07-15', to: '2026-07-14' }).success,
  false,
);
assert.equal(
  performanceByRatingQuerySchema.safeParse({ from: '2999-01-01' }).success,
  false,
  'from-only queries validate against the effective default to date',
);
assert.equal(performanceByRatingQuerySchema.safeParse({ minRating: '-1' }).success, false);
const performanceReport = {
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
assert.deepEqual(performanceByRatingResponseSchema.parse(performanceReport), performanceReport);

assert.deepEqual(openingStrugglesQuerySchema.parse({
  mode: 'repeatedMistakes',
  from: '2026-01-01',
  minOccurrences: '7',
}), {
  mode: 'repeatedMistakes',
  from: '2026-01-01',
  minGames: 5,
  minLossRate: 60,
  minOccurrences: 7,
  minAverageCentipawnLoss: 60,
  minEvaluatedGames: 5,
  maxAverageUserEvalCp: -80,
  maxPly: 20,
  limit: 100,
});
assert.equal(openingStrugglesQuerySchema.safeParse({ mode: 'unknown' }).success, false);

const openingStrugglesReport = {
  totalFilteredGames: 6,
  indexedFilteredGames: 6,
  maxPly: 20,
  limit: 100,
  mode: 'badPositions',
  minEvaluatedGames: 5,
  maxAverageUserEvalCp: -80,
  items: [{
    key: 'WHITE:d2d4 e7e5 c2c4',
    parentKey: 'WHITE:d2d4 e7e5',
    userColor: 'WHITE',
    movesUci: ['d2d4', 'e7e5', 'c2c4'],
    ply: 3,
    analysisGameId: 42,
    totalReachGames: 6,
    metricGames: 6,
    wins: 1,
    draws: 1,
    losses: 4,
    winRate: 16.7,
    lossRate: 66.7,
    scorePct: 25,
    analysedMoveCount: 6,
    averageCentipawnLoss: 154,
    evalGames: 6,
    avgUserEvalCp: -108,
    bestUserEvalCp: -40,
    worstUserEvalCp: -180,
    afterPositionAnalysisId: 7,
    afterPositionNormalizedFen: 'fen',
    afterPositionBestScoreCpWhite: -108,
    afterPositionBestMateWhite: null,
    courseCoverage: {
      status: 'MY_DEVIATION',
      coveredPlies: 2,
      deviationPly: 3,
      courses: [{ id: 3, name: 'White repertoire' }],
      expectedMoveSans: ['dxe5'],
    },
  }],
};
assert.deepEqual(openingStrugglesResponseSchema.parse(openingStrugglesReport), openingStrugglesReport);
assert.equal(
  openingStrugglesResponseSchema.safeParse({
    ...openingStrugglesReport,
    items: [{ ...openingStrugglesReport.items[0], courseCoverage: { ...openingStrugglesReport.items[0].courseCoverage, status: 'UNKNOWN' } }],
  }).success,
  false,
);

console.log('Shared contract tests passed.');
