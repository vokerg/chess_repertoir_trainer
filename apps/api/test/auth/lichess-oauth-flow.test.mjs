import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Fastify from 'fastify';
import prismaModule from '../../dist/prisma.js';
import authPlugin from '../../dist/auth/auth.plugin.js';
import lichessAuthRoutes from '../../dist/routes/lichessAuth.js';
import { LichessConnectionService } from '../../dist/services/lichessConnectionService.js';

const prisma = prismaModule.default;
const originalEnv = {
  AUTH_MODE: process.env.AUTH_MODE,
  CLERK_JWT_ISSUER: process.env.CLERK_JWT_ISSUER,
  CLERK_JWKS_URL: process.env.CLERK_JWKS_URL,
  CLERK_AUTHORIZED_PARTIES: process.env.CLERK_AUTHORIZED_PARTIES,
  LICHESS_OAUTH_CLIENT_ID: process.env.LICHESS_OAUTH_CLIENT_ID,
  LICHESS_OAUTH_REDIRECT_URI: process.env.LICHESS_OAUTH_REDIRECT_URI,
  LICHESS_OAUTH_SCOPES: process.env.LICHESS_OAUTH_SCOPES,
  LICHESS_TOKEN_ENCRYPTION_KEY: process.env.LICHESS_TOKEN_ENCRYPTION_KEY,
  WEB_APP_URL: process.env.WEB_APP_URL,
};
const originalFetch = globalThis.fetch;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds = [];
let app;

function setTestEnv() {
  process.env.AUTH_MODE = 'clerk';
  process.env.CLERK_JWT_ISSUER = 'https://example.clerk.accounts.dev';
  process.env.CLERK_JWKS_URL = 'https://example.clerk.accounts.dev/.well-known/jwks.json';
  process.env.CLERK_AUTHORIZED_PARTIES = 'http://localhost:4200';
  process.env.LICHESS_OAUTH_CLIENT_ID = 'test-client';
  process.env.LICHESS_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/auth/lichess/callback';
  process.env.LICHESS_OAUTH_SCOPES = '';
  process.env.LICHESS_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  process.env.WEB_APP_URL = 'http://localhost:4200';
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function installFetchMock() {
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    if (href === 'https://lichess.org/api/token' && init.method === 'POST') {
      return Response.json({ token_type: 'Bearer', access_token: 'test-access-token', expires_in: 3600 });
    }
    if (href === 'https://lichess.org/api/account') {
      assert.equal(init.headers.Authorization, 'Bearer test-access-token');
      return Response.json({ id: `lichess-${suffix}`, username: `lichessUser${suffix.replace(/[^a-zA-Z0-9]/g, '')}` });
    }
    throw new Error(`Unexpected fetch: ${href}`);
  };
}

async function createUser(label) {
  const user = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `lichess-oauth-${label}-${suffix}` },
  });
  userIds.push(user.id);
  return user;
}

async function createState(userId, options = {}) {
  const state = options.state ?? `state-${suffix}-${Math.random().toString(16).slice(2)}`;
  await prisma.oAuthLoginState.create({
    data: {
      userId,
      provider: options.provider ?? 'LICHESS',
      state,
      codeVerifier: `verifier-${suffix}`.padEnd(43, 'x'),
      expiresAt: options.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return state;
}

try {
  setTestEnv();
  installFetchMock();

  const user = await createUser('route');
  const state = await createState(user.id);

  app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(lichessAuthRoutes);

  const startWithoutAuth = await app.inject({
    method: 'POST',
    url: '/api/me/lichess-connection/start',
  });
  assert.equal(startWithoutAuth.statusCode, 401);

  const callbackWithoutAuth = await app.inject({
    method: 'GET',
    url: `/api/auth/lichess/callback?code=test-code&state=${encodeURIComponent(state)}`,
  });
  assert.equal(callbackWithoutAuth.statusCode, 302);
  assert.equal(callbackWithoutAuth.headers.location, 'http://localhost:4200/accounts?lichessConnected=1');

  const connection = await prisma.lichessConnection.findUnique({ where: { userId: user.id } });
  assert.equal(connection?.username.startsWith('lichessUser'), true);
  assert.equal(connection?.accessTokenCiphertext.includes('test-access-token'), false);
  assert.equal(await prisma.oAuthLoginState.findUnique({ where: { state } }), null);

  await assert.rejects(
    LichessConnectionService.handleCallback({ code: 'test-code' }),
    /missing code or state/i,
  );

  const expiredUser = await createUser('expired');
  const expiredState = await createState(expiredUser.id, { expiresAt: new Date(Date.now() - 60_000) });
  await assert.rejects(
    LichessConnectionService.handleCallback({ code: 'test-code', state: expiredState }),
    /invalid or expired/i,
  );

  const wrongProviderUser = await createUser('wrong-provider');
  const wrongProviderState = await createState(wrongProviderUser.id, { provider: 'CHESS_COM' });
  await assert.rejects(
    LichessConnectionService.handleCallback({ code: 'test-code', state: wrongProviderState }),
    /invalid or expired/i,
  );

  await assert.rejects(
    LichessConnectionService.handleCallback({ code: 'test-code', state }),
    /invalid or expired/i,
  );

  console.log('Lichess OAuth flow tests passed.');
} finally {
  if (app) await app.close();
  globalThis.fetch = originalFetch;
  restoreEnv();
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  try {
    await prisma.oAuthLoginState.deleteMany({ where: { state: { startsWith: `state-${suffix}` } } });
  } catch (error) {
    if (error?.code !== 'P2021') throw error;
  }
  await prisma.$disconnect();
}
