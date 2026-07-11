import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildApp } from '../../dist/app.js';

const TEST_AUTH = { mode: 'dev-single-user', userId: 1 };

async function inspectApp(prisma = { $disconnect: async () => {} }) {
  const app = await buildApp({ logger: false, authConfig: TEST_AUTH, prisma });
  try {
    await app.ready();
    const health = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(health.statusCode, 200);
    assert.deepEqual(health.json(), { ok: true });
    const openApi = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(openApi.statusCode, 200);
    return app.swagger();
  } finally {
    await app.close();
  }
}

const first = await inspectApp();
const second = await inspectApp();

assert.deepEqual(second, first);
assert.equal(first.openapi, '3.0.3');
assert.deepEqual(first.info, { title: 'Chess Repertoire Trainer API', version: '1.0.0' });

let closeCount = 0;
await inspectApp({ $disconnect: async () => { closeCount += 1; } });
assert.equal(closeCount, 1, 'app.close() must close its injected Prisma lifecycle exactly once');

const isolatedCounts = [0, 0];
const isolatedApps = await Promise.all(isolatedCounts.map(async (_value, index) => buildApp({
  logger: false,
  authConfig: TEST_AUTH,
  prisma: { $disconnect: async () => { isolatedCounts[index] += 1; } },
})));
await Promise.all(isolatedApps.map((app) => app.close()));
assert.deepEqual(isolatedCounts, [1, 1], 'app lifecycle closers must remain instance-local');

const devAuthApp = await buildApp({ logger: false, authConfig: TEST_AUTH, prisma: { $disconnect: async () => {} } });
const clerkAuthApp = await buildApp({
  logger: false,
  authConfig: {
    mode: 'clerk',
    issuer: 'https://issuer.example.test',
    jwksUrl: new URL('https://issuer.example.test/.well-known/jwks.json'),
    authorizedParties: ['https://app.example.test'],
  },
  prisma: { $disconnect: async () => {} },
});
await Promise.all([devAuthApp.ready(), clerkAuthApp.ready()]);
const unauthenticated = await clerkAuthApp.inject({ method: 'GET', url: '/api/courses' });
assert.equal(unauthenticated.statusCode, 401, 'auth configuration must not leak from the dev-auth app');
await Promise.all([devAuthApp.close(), clerkAuthApp.close()]);

const cleanupError = new Error('test disconnect failed');
const failingApp = await buildApp({
  logger: false,
  authConfig: TEST_AUTH,
  prisma: { $disconnect: async () => { throw cleanupError; } },
});
await assert.rejects(failingApp.close(), /test disconnect failed/);

const childEnv = { ...process.env, AUTH_MODE: '', DEV_SINGLE_USER_ID: '' };
await assert.rejects(
  promisify(execFile)(process.execPath, [
    '--input-type=module',
    '--eval',
    "import { buildApp } from './dist/app.js'; const app = await buildApp({ prisma: { $disconnect: async () => {} } }); await app.ready();",
  ], { cwd: new URL('../../', import.meta.url), env: childEnv }),
  /AUTH_MODE must be either dev-single-user or clerk/,
  'omitting injected auth must preserve production environment validation',
);

console.log('App factory isolation tests passed.');
