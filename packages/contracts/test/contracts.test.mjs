import assert from 'node:assert/strict';
import {
  boardImageQuerySchema,
  importedGameFacetsResponseSchema,
  importedGameSearchQuerySchema,
  positionAnalysisLineSchema,
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

console.log('Shared contract tests passed.');
