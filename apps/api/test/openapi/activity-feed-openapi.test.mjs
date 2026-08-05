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
  assert.equal(paths['/api/me/activity'].get.operationId, 'getMyActivityHistory');
  assert.equal(paths['/api/me/activity/today'].get.operationId, 'getMyActivityToday');
  assert.equal(paths['/api/me/activity/preferences'].get.operationId, 'getMyActivityPreferences');
  assert.equal(paths['/api/me/activity/preferences'].put.operationId, 'updateMyActivityPreferences');
  assert.deepEqual(paths['/api/me/activity'].get.tags, ['Activity feed']);
  assert.ok(paths['/api/me/activity'].get.responses['200']);
  assert.ok(paths['/api/me/activity/preferences'].put.responses['400']);
  console.log('Activity feed OpenAPI tests passed.');
} finally {
  await app.close();
}
