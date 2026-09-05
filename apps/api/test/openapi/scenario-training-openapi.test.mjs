import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const expectedOperations = new Map([
  ['POST /api/scenario-training/tactical-missed-shot/start', 'startMissedShotScenarioTraining'],
  ['POST /api/scenario-training/tactical-game/start', 'startGameScenarioTraining'],
  ['GET /api/scenario-training/history', 'listScenarioTrainingHistory'],
  ['GET /api/scenario-training/{sessionId}', 'getScenarioTrainingSession'],
  ['POST /api/scenario-training/{sessionId}/attempt', 'submitScenarioTrainingAttempt'],
  ['POST /api/scenario-training/{sessionId}/complete', 'completeScenarioTrainingSession'],
  ['POST /api/scenario-training/tactical-blunder/start', 'startBlunderScenarioTraining'],
  ['POST /api/scenario-training/{sessionId}/dislike', 'dislikeScenarioTrainingSource'],
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
      assert.ok(document.paths[path][method].responses['200']);
    }
    return document;
  } finally {
    await app.close();
  }
}

function resolveSchema(document, schema) {
  if (!schema?.$ref) return schema;
  return schema.$ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((value, segment) => value?.[segment], document);
}

function successSchema(document, path, method) {
  const schema = document.paths[path][method].responses['200'].content['application/json'].schema;
  return resolveSchema(document, schema);
}

const first = await generatedDocument();
const second = await generatedDocument();
assert.deepEqual(second, first);

const sessionSchema = successSchema(
  first,
  '/api/scenario-training/{sessionId}',
  'get',
);
assert.ok(sessionSchema.properties?.sessionId);
assert.ok(sessionSchema.properties?.importedGameId);
assert.ok(sessionSchema.properties?.attempts);

const historySchema = successSchema(first, '/api/scenario-training/history', 'get');
assert.ok(historySchema.properties?.items);

const attemptSchema = successSchema(
  first,
  '/api/scenario-training/{sessionId}/attempt',
  'post',
);
assert.ok(attemptSchema.properties?.passed);
assert.ok(attemptSchema.properties?.session);

const dislikeSchema = successSchema(
  first,
  '/api/scenario-training/{sessionId}/dislike',
  'post',
);
assert.ok(dislikeSchema.properties?.disliked);

for (const path of [
  '/api/scenario-training/tactical-missed-shot/start',
  '/api/scenario-training/tactical-game/start',
  '/api/scenario-training/tactical-blunder/start',
]) {
  assert.ok(successSchema(first, path, 'post').properties?.sessionId);
}

console.log('Scenario-training OpenAPI tests passed.');
