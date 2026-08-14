import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const expectedOperations = new Map([
  ['GET /api/imported-games', 'listImportedGames'],
  ['GET /api/imported-games/facets', 'getImportedGameFacets'],
  ['GET /api/imported-games/tag-definitions', 'getImportedGameTagDefinitions'],
  ['GET /api/imported-games/{gameId}', 'getImportedGame'],
  ['GET /api/imported-games/{gameId}/pgn', 'getImportedGamePgn'],
  ['GET /api/opening-analysis', 'getOpeningAnalysis'],
  ['GET /api/opening-analysis/performance', 'getOpeningAnalysisPerformance'],
  ['GET /api/opening-analysis/top-games', 'getOpeningAnalysisTopGames'],
]);

async function generatedDocument() {
  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: 1 },
    prisma: { $disconnect: async () => {} },
  });
  try {
    await app.ready();
    const document = app.swagger();
    const served = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(served.statusCode, 200);
    const servedDocument = served.json();
    for (const [key, operationId] of expectedOperations) {
      const separator = key.indexOf(' ');
      const method = key.slice(0, separator).toLowerCase();
      const path = key.slice(separator + 1);
      assert.equal(document.paths[path][method].operationId, operationId);
      assert.equal(servedDocument.paths[path][method].operationId, operationId);
    }
    return document;
  } finally {
    await app.close();
  }
}

const first = await generatedDocument();
const second = await generatedDocument();
assert.deepEqual(second, first);

const operations = Object.values(first.paths).flatMap((path) => Object.values(path));
const operationIds = operations.map((operation) => operation.operationId);
assert.equal(new Set(operationIds).size, operationIds.length);
for (const operationId of expectedOperations.values()) assert.ok(operationIds.includes(operationId));
assert.ok(first.paths['/api/imported-games'].get.responses['200']);
assert.ok(first.paths['/api/imported-games'].get.responses['400']);
assert.ok(first.paths['/api/imported-games/{gameId}'].get.responses['404']);
for (const path of [
  '/api/opening-analysis',
  '/api/opening-analysis/performance',
  '/api/opening-analysis/top-games',
]) {
  assert.ok(first.paths[path].get.responses['200']);
  assert.ok(first.paths[path].get.responses['400']);
  assert.ok(first.paths[path].get.responses['401']);
}

console.log('Imported games OpenAPI tests passed.');
