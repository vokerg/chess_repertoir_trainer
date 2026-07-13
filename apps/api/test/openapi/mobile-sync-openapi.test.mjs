import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const existingDevUser = await prisma.appUser.findUnique({
  where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
});
const devUser = existingDevUser ?? await prisma.appUser.create({
  data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
});

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: devUser.id },
  prisma: { $disconnect: async () => {} },
});

try {
  await app.ready();
  const document = app.swagger();
  const manifest = document.paths['/api/mobile-sync/manifest']?.get;
  const bundle = document.paths['/api/mobile-sync/courses/{courseId}']?.get;
  const ingestion = document.paths['/api/mobile-sync/training-attempts']?.post;

  assert.equal(manifest?.operationId, 'getMobileSyncManifest');
  assert.deepEqual(Object.keys(manifest?.responses ?? {}).sort(), ['200', '401']);
  assert.equal(bundle?.operationId, 'getMobileCourseBundle');
  assert.deepEqual(Object.keys(bundle?.responses ?? {}).sort(), ['200', '400', '401', '404']);
  assert.equal(ingestion?.operationId, 'ingestMobileTrainingAttempts');
  assert.deepEqual(Object.keys(ingestion?.responses ?? {}).sort(), ['200', '400', '401']);
  assert.ok(ingestion?.requestBody);

  const malformed = await app.inject({
    method: 'POST',
    url: '/api/mobile-sync/training-attempts',
    payload: { deviceId: 'device', attempts: [] },
  });
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(malformed.json(), { error: 'Validation failed' });

  const oversized = await app.inject({
    method: 'POST',
    url: '/api/mobile-sync/training-attempts',
    payload: { deviceId: 'device', attempts: Array.from({ length: 101 }, () => ({})) },
  });
  assert.equal(oversized.statusCode, 400);
  assert.deepEqual(oversized.json(), { error: 'Validation failed' });

  console.log('Mobile sync OpenAPI tests passed.');
} finally {
  await app.close();
}
