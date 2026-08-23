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
  console.log('Onboarding OpenAPI tests passed.');
} finally {
  await app.close();
}
