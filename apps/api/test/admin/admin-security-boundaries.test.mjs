import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildApp } from '../../dist/app.js';
import {
  loadAdminAuthConfig,
  validateAdminAuthConfig,
} from '../../dist/modules/admin/admin-auth.config.js';
import {
  AdminUserNotFoundError,
} from '../../dist/modules/admin/admin.errors.js';

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_AUTH_MODE: process.env.ADMIN_AUTH_MODE,
  ADMIN_CLERK_SUBJECT_ALLOWLIST: process.env.ADMIN_CLERK_SUBJECT_ALLOWLIST,
  ADMIN_ACTOR_KEY_SECRET: process.env.ADMIN_ACTOR_KEY_SECRET,
  ADMIN_ACTOR_KEY_VERSION: process.env.ADMIN_ACTOR_KEY_VERSION,
};

try {
  process.env.ADMIN_AUTH_MODE = 'disabled';
  assert.deepEqual(loadAdminAuthConfig({ mode: 'dev-single-user', userId: 1 }), { mode: 'disabled' });

  process.env.ADMIN_AUTH_MODE = 'clerk-subject-allowlist';
  process.env.ADMIN_CLERK_SUBJECT_ALLOWLIST = 'user_admin,user_admin';
  process.env.ADMIN_ACTOR_KEY_SECRET = 'x'.repeat(32);
  process.env.ADMIN_ACTOR_KEY_VERSION = '1';
  assert.throws(
    () => loadAdminAuthConfig({
      mode: 'clerk',
      issuer: 'https://clerk.example.test',
      jwksUrl: new URL('https://clerk.example.test/.well-known/jwks.json'),
      authorizedParties: ['https://app.example.test'],
    }),
    /duplicate subjects/,
  );

  process.env.ADMIN_CLERK_SUBJECT_ALLOWLIST = 'user_admin';
  process.env.ADMIN_ACTOR_KEY_SECRET = 'short';
  assert.throws(
    () => loadAdminAuthConfig({
      mode: 'clerk',
      issuer: 'https://clerk.example.test',
      jwksUrl: new URL('https://clerk.example.test/.well-known/jwks.json'),
      authorizedParties: ['https://app.example.test'],
    }),
    /at least 32/,
  );

  process.env.NODE_ENV = 'production';
  assert.throws(
    () => validateAdminAuthConfig(
      { mode: 'dev-single-user', userId: 1 },
      {
        mode: 'test',
        userIds: new Set([1]),
        actorKeySecret: new Uint8Array(32).fill(1),
        actorKeyVersion: 1,
      },
    ),
    /not allowed when NODE_ENV=production/,
  );
} finally {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const noTargetCalls = [];
const missingTargetService = {
  listUsers: async () => ({ items: [], nextCursor: null }),
  getUserDetail: async (userId) => {
    noTargetCalls.push(userId);
    throw new AdminUserNotFoundError();
  },
  getUserWork: async (userId) => {
    noTargetCalls.push(userId);
    throw new AdminUserNotFoundError();
  },
};

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: 1 },
  adminAuthConfig: {
    mode: 'test',
    userIds: new Set([1]),
    actorKeySecret: new Uint8Array(32).fill(9),
    actorKeyVersion: 1,
  },
  adminDiagnosticsService: missingTargetService,
  prisma: { $disconnect: async () => {} },
});
try {
  await app.ready();
  const missing = await app.inject({ method: 'GET', url: '/api/admin/users/999' });
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.json(), {
    message: 'Administrator target user was not found',
    code: 'ADMIN_USER_NOT_FOUND',
  });
  assert.deepEqual(noTargetCalls, [999]);
} finally {
  await app.close();
}

const unauthenticatedApp = await buildApp({
  logger: false,
  authConfig: {
    mode: 'clerk',
    issuer: 'https://clerk.example.test',
    jwksUrl: new URL('https://clerk.example.test/.well-known/jwks.json'),
    authorizedParties: ['https://app.example.test'],
  },
  adminAuthConfig: { mode: 'disabled' },
  prisma: { $disconnect: async () => {} },
});
try {
  await unauthenticatedApp.ready();
  const response = await unauthenticatedApp.inject({ method: 'GET', url: '/api/admin/me' });
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { message: 'Unauthorized' });
} finally {
  await unauthenticatedApp.close();
}

for (const path of [
  '../../src/modules/admin/admin.routes.ts',
  '../../../../packages/contracts/src/admin/admin.schemas.ts',
]) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bemail\b|\busername\b|\bproviderUrl\b|\baccessToken\b|\bnormalizedFen\b|\bpgn\b/i);
}

console.log('Administrator startup, non-enumeration, and sensitive-field boundary tests passed.');
