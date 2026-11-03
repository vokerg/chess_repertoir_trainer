import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';
import { CurrentAppUserService } from '../../dist/auth/current-app-user.service.js';
import {
  lichessCloudEvaluationClient,
  LichessCloudEvaluationError,
} from '../../dist/modules/lab/cloud-evaluation/lichess-cloud-evaluation.client.js';

const originalResolve = CurrentAppUserService.resolveDevUser;
const originalFetch = lichessCloudEvaluationClient.fetchPosition;
const apps = [];
const miss = { source: 'LICHESS_CLOUD', depth: null, knodes: null, positionAnalysis: null };
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
let calls = 0;
let lookup = async () => miss;

CurrentAppUserService.resolveDevUser = async (userId) => ({
  auth: { userId, provider: 'test', externalSubject: 'cloud-evaluation-route-test' },
});
lichessCloudEvaluationClient.fetchPosition = async (input) => {
  calls++;
  return lookup(input);
};

try {
  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: 1 },
    prisma: { $disconnect: async () => {} },
  });
  apps.push(app);
  await app.ready();
  const operation = app.swagger().paths['/api/lab/cloud-evaluation'].get;
  assert.equal(operation.operationId, 'getLabCloudEvaluation');
  assert.deepEqual(operation.tags, ['Lab']);
  assert.equal(operation.parameters.find((p) => p.name === 'fen').required, true);
  for (const status of ['200', '400', '401', '502', '503']) assert.ok(operation.responses[status]);

  for (const query of ['', '?fen=', '?fen=not-a-fen', '?fen=' + 'x'.repeat(201)]) {
    const invalid = await app.inject('/api/lab/cloud-evaluation' + query);
    assert.equal(invalid.statusCode, 400, invalid.body);
    assert.deepEqual(invalid.json(), {
      error: query === '?fen=not-a-fen' ? 'The supplied FEN is invalid.' : 'Validation failed',
    });
  }
  assert.equal(calls, 0, 'invalid inputs must not reach the upstream client');

  const url = '/api/lab/cloud-evaluation?fen=' + encodeURIComponent(fen);
  const missing = await app.inject(url);
  assert.equal(missing.statusCode, 200);
  assert.deepEqual(missing.json(), miss);

  const hit = {
    source: 'LICHESS_CLOUD', depth: 24, knodes: 100,
    positionAnalysis: {
      fen, normalizedFen: fen.split(' ').slice(0, 4).join(' '),
      bestMoveUci: 'e2e4', bestScoreCpWhite: 35, bestMateWhite: null,
      persistenceMode: 'rich',
      lines: [{ multipv: 1, depth: 24, moveUci: 'e2e4', scoreCpWhite: 35, pvUci: ['e2e4'] }],
    },
  };
  lookup = async (input) => { assert.equal(input, fen); return hit; };
  const success = await app.inject(url);
  assert.equal(success.statusCode, 200, success.body);
  assert.deepEqual(success.json(), hit, 'serialization preserves the cache-compatible fields');

  for (const [error, status, message] of [
    [new LichessCloudEvaluationError('rate limited', 429), 503, 'rate limited'],
    [new LichessCloudEvaluationError('upstream failed', 500), 502, 'upstream failed'],
    [new Error('internal details'), 502, 'Cloud Eval lookup failed.'],
  ]) {
    lookup = async () => { throw error; };
    const response = await app.inject(url);
    assert.equal(response.statusCode, status);
    assert.deepEqual(response.json(), { error: message });
  }

  const anonymousApp = await buildApp({
    logger: false,
    authConfig: {
      mode: 'clerk', issuer: 'https://auth.example.test',
      jwksUrl: new URL('https://auth.example.test/jwks'), authorizedParties: ['http://localhost:4200'],
    },
    prisma: { $disconnect: async () => {} },
  });
  apps.push(anonymousApp);
  const callsBefore = calls;
  const unauthorized = await anonymousApp.inject(url);
  assert.equal(unauthorized.statusCode, 401);
  assert.deepEqual(unauthorized.json(), { message: 'Unauthorized' });
  assert.equal(calls, callsBefore);
  console.log('Cloud evaluation HTTP, authentication, serialization and OpenAPI tests passed.');
} finally {
  CurrentAppUserService.resolveDevUser = originalResolve;
  lichessCloudEvaluationClient.fetchPosition = originalFetch;
  await Promise.all(apps.map((app) => app.close()));
}
