import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: 1 },
  prisma: { $disconnect: async () => {} },
});
try {
  await app.ready();
  const paths = app.swagger().paths;

  assert.equal(paths['/api/me/onboarding'].get.operationId, 'getMyOnboardingReadiness');
  assert.deepEqual(paths['/api/me/onboarding'].get.tags, ['Onboarding']);
  assert.ok(paths['/api/me/onboarding'].get.responses['200']);
  assert.ok(paths['/api/me/onboarding'].get.responses['401']);
  assert.equal(paths['/api/me/onboarding'].post, undefined);
  assert.equal(paths['/api/me/onboarding'].put, undefined);
  assert.equal(paths['/api/me/onboarding'].delete, undefined);

  const expectedCommands = [
    ['/api/me/onboarding/start', 'startMyOnboarding', '202'],
    ['/api/me/onboarding/skip', 'skipMyOnboarding', '200'],
    ['/api/me/onboarding/runs/{runId}/finish', 'finishMyOnboardingWithAttention', '200'],
    ['/api/me/onboarding/runs/{runId}/pause', 'pauseMyOnboardingPreparation', '200'],
    ['/api/me/onboarding/runs/{runId}/resume', 'resumeMyOnboardingPreparation', '200'],
    ['/api/me/onboarding/runs/{runId}/cancel', 'cancelMyOnboardingPreparation', '200'],
    ['/api/me/onboarding/runs/{runId}/retry', 'retryMyOnboardingPreparation', '202'],
    ['/api/me/onboarding/runs/{runId}/restart', 'restartMyOnboardingPreparation', '202'],
    ['/api/me/onboarding/runs/{runId}/expand', 'expandMyOnboardingPreparation', '202'],
  ];

  for (const [path, operationId, successStatus] of expectedCommands) {
    const operation = paths[path]?.post;
    assert.ok(operation, `Expected POST ${path} in OpenAPI.`);
    assert.equal(operation.operationId, operationId);
    assert.deepEqual(operation.tags, ['Onboarding']);
    assert.ok(operation.responses[successStatus]);
    assert.ok(operation.responses['401']);
    assert.ok(operation.responses['404']);
    assert.ok(operation.responses['409']);
  }

  assert.ok(paths['/api/me/onboarding/start'].post.requestBody);
  assert.ok(paths['/api/me/onboarding/runs/{runId}/expand'].post.requestBody);
  assert.equal(paths['/api/me/onboarding/skip'].post.requestBody, undefined);
  assert.equal(paths['/api/me/onboarding/runs/{runId}/finish'].post.requestBody, undefined);
  assert.equal(paths['/api/me/onboarding/runs/{runId}/pause'].post.requestBody, undefined);
  assert.equal(paths['/api/me/onboarding/runs/{runId}/resume'].post.requestBody, undefined);
  assert.equal(paths['/api/me/onboarding/runs/{runId}/cancel'].post.requestBody, undefined);
  assert.equal(paths['/api/me/onboarding/runs/{runId}/retry'].post.requestBody, undefined);
  assert.equal(paths['/api/me/onboarding/runs/{runId}/restart'].post.requestBody, undefined);
  assert.ok(paths['/api/me/onboarding/runs/{runId}/pause'].post.parameters);

  console.log('Onboarding OpenAPI tests passed.');
} finally {
  await app.close();
}