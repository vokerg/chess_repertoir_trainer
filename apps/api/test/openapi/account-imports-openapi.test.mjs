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
  const collection = paths['/api/me/account-imports'];
  const detail = paths['/api/me/account-imports/{importRunId}'];

  assert.equal(collection.post.operationId, 'createAccountImportRun');
  assert.equal(collection.get.operationId, 'listAccountImportRuns');
  assert.equal(detail.get.operationId, 'getAccountImportRun');
  assert.equal(
    paths['/api/me/account-imports/{importRunId}/pause'].post.operationId,
    'pauseAccountImportRun',
  );
  assert.equal(
    paths['/api/me/account-imports/{importRunId}/resume'].post.operationId,
    'resumeAccountImportRun',
  );
  assert.equal(
    paths['/api/me/account-imports/{importRunId}/cancel'].post.operationId,
    'cancelAccountImportRun',
  );
  assert.equal(
    paths['/api/me/account-imports/{importRunId}/retry'].post.operationId,
    'retryAccountImportRun',
  );
  assert.deepEqual(collection.post.tags, ['Account Imports']);
  assert.ok(collection.post.responses['202']);
  assert.ok(collection.post.responses['409']);
  assert.ok(collection.get.responses['200']);
  assert.ok(detail.get.responses['404']);
  assert.ok(paths['/api/me/account-imports/{importRunId}/retry'].post.responses['202']);
  assert.ok(paths['/api/me/account-imports/{importRunId}/retry'].post.responses['409']);

  console.log('Account import OpenAPI tests passed.');
} finally {
  await app.close();
}
