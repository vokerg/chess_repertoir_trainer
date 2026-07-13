import assert from 'node:assert/strict';
import {
  boardImageQuerySchema,
  importedGameFacetsResponseSchema,
  importedGameSearchQuerySchema,
  mobileSyncManifestSchema,
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

console.log('Shared contract tests passed.');
