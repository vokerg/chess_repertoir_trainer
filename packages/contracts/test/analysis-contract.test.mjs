import assert from 'node:assert/strict';
import {
  importedGameAnalysisResponseSchema,
  importedGameClientAnalysisResponseSchema,
  importedGamePlyAnalysisClearResponseSchema,
  importedGamePlyAnalysisUpdateResponseSchema,
  positionAnalysisBulkResponseSchema,
  positionAnalysisLookupResponseSchema,
  positionAnalysisStoreResponseSchema,
} from '../dist/analysis/index.js';

const positionAnalysis = {
  id: 11,
  positionId: 7,
  fen: '8/8/8/8/8/8/4K3/6k1 w - - 0 1',
  normalizedFen: '8/8/8/8/8/8/4K3/6k1 w - -',
  bestMoveUci: 'e2e3',
  bestScoreCpWhite: 23,
  lines: [{
    multipv: 1,
    depth: 18,
    moveUci: 'e2e3',
    scoreCpWhite: 23,
    pvUci: ['e2e3'],
  }],
  fromCache: true,
};

assert.deepEqual(
  positionAnalysisLookupResponseSchema.parse({ positionAnalysis }),
  { positionAnalysis },
);
assert.deepEqual(
  positionAnalysisLookupResponseSchema.parse({ positionAnalysis: null }),
  { positionAnalysis: null },
);
assert.deepEqual(
  positionAnalysisBulkResponseSchema.parse({ positionAnalyses: [positionAnalysis] }),
  { positionAnalyses: [positionAnalysis] },
);
assert.deepEqual(
  positionAnalysisStoreResponseSchema.parse({ positionAnalysis, position: positionAnalysis }),
  { positionAnalysis, position: positionAnalysis },
);
assert.equal(
  positionAnalysisLookupResponseSchema.safeParse({
    positionAnalysis: { ...positionAnalysis, fromCache: 'yes' },
  }).success,
  false,
  'position-analysis cache provenance must remain boolean',
);
assert.equal(
  positionAnalysisBulkResponseSchema.safeParse({
    positionAnalyses: [{ ...positionAnalysis, lines: [{ moveUci: 'e2e3' }] }],
  }).success,
  false,
  'public position-analysis lines must include pvUci',
);

const analysisRun = {
  id: 31,
  importedGameId: 19,
  status: 'COMPLETED',
  positionsTotal: 2,
  positionsDone: 2,
  accuracyVersion: 'v1',
  whiteAccuracy: 91.2,
  blackAccuracy: 84.4,
  whiteAverageCentipawnLoss: 18.5,
  blackAverageCentipawnLoss: 31.25,
  whiteMovesAnalyzed: 1,
  blackMovesAnalyzed: 1,
  summary: { totalMoves: 2 },
  error: null,
  startedAt: null,
  completedAt: '2026-08-14T18:00:00.000Z',
  createdAt: '2026-08-14T17:59:00.000Z',
  moves: [{
    plyNumber: 1,
    moveNumber: 1,
    side: 'WHITE',
    playedMoveUci: 'e2e4',
    playedMoveSan: null,
    classificationCode: 2,
    classification: 'Best',
    scoreLossCp: 0,
    bestMoveUci: 'e2e4',
    bestScoreCpWhite: 25,
    playedScoreCpWhite: 25,
    bestMateWhite: null,
    positionAnalysisId: 4,
  }],
};

assert.deepEqual(importedGameAnalysisResponseSchema.parse({ run: analysisRun }), { run: analysisRun });
const clientAnalysisResponse = {
  reusedExisting: false,
  run: analysisRun,
  tags: {
    importedGameId: 19,
    tagCodes: [101],
    tags: [{ code: 101, name: 'Clean game' }],
  },
};
assert.deepEqual(
  importedGameClientAnalysisResponseSchema.parse(clientAnalysisResponse),
  clientAnalysisResponse,
);
assert.deepEqual(
  importedGamePlyAnalysisUpdateResponseSchema.parse({ importedGameId: 19, updatedPlies: 2 }),
  { importedGameId: 19, updatedPlies: 2 },
);
assert.deepEqual(
  importedGamePlyAnalysisClearResponseSchema.parse({ importedGameId: 19, clearedPlies: 2 }),
  { importedGameId: 19, clearedPlies: 2 },
);
assert.equal(
  importedGameAnalysisResponseSchema.safeParse({
    run: { ...analysisRun, completedAt: new Date() },
  }).success,
  false,
  'analysis run dates must be ISO strings on the wire',
);
assert.equal(
  importedGameAnalysisResponseSchema.safeParse({
    run: { ...analysisRun, status: 'NOT_ANALYZED' },
  }).success,
  false,
  'persisted analysis runs must use a concrete run status',
);
assert.equal(
  importedGamePlyAnalysisUpdateResponseSchema.safeParse({ importedGameId: 19, updatedPlies: -1 }).success,
  false,
  'updated ply counts cannot be negative',
);

console.log('Analysis contract tests passed.');
