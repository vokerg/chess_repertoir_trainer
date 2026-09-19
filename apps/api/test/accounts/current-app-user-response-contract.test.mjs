import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { currentAppUserResponseSchema } from '@chess-trainer/contracts/external-accounts';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;

const currentUser = {
  user: {
    id: 7,
    displayName: 'Contract user',
    authProvider: 'dev',
    authSubject: 'dev-single-user',
    email: 'contract@example.test',
    timeZone: 'Europe/Copenhagen',
    onboardingDisposition: 'PENDING',
    onboardingDispositionReason: null,
    onboardingDispositionAt: '2026-09-02T12:30:00.000Z',
    defaultProgressAccountId: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-02T12:30:00.000Z',
  },
  auth: {
    userId: 7,
    provider: 'dev',
    externalSubject: 'dev-single-user',
  },
};

assert.deepEqual(currentAppUserResponseSchema.parse(currentUser), currentUser);
assert.equal(
  currentAppUserResponseSchema.safeParse({
    ...currentUser,
    user: { ...currentUser.user, createdAt: new Date() },
  }).success,
  false,
  'Prisma Date values must be serialized before crossing the HTTP boundary',
);
assert.equal(
  currentAppUserResponseSchema.safeParse({
    ...currentUser,
    auth: { ...currentUser.auth, provider: 'other' },
  }).success,
  false,
  'current session providers are the verified dev/clerk auth modes',
);
const { timeZone: _timeZone, ...userWithoutTimeZone } = currentUser.user;
assert.equal(
  currentAppUserResponseSchema.safeParse({ ...currentUser, user: userWithoutTimeZone }).success,
  false,
  'the persisted AppUser scalar projection must remain explicit',
);

await verifyOpenApi();
await verifyHttpBoundary();

console.log('Current application-user response contract tests passed.');

async function verifyOpenApi() {
  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: 1 },
    prisma: { $disconnect: async () => {} },
  });

  try {
    await app.ready();
    const document = app.swagger();
    const operation = document.paths['/api/me'].get;
    assert.equal(operation.operationId, 'getCurrentUser');

    const schema = resolveSchema(
      document,
      operation.responses['200'].content['application/json'].schema,
    );
    assert.ok(schema.properties?.user);
    assert.ok(schema.properties?.auth);

    const userSchema = resolveSchema(document, schema.properties.user);
    for (const property of [
      'id',
      'displayName',
      'authProvider',
      'authSubject',
      'email',
      'timeZone',
      'onboardingDisposition',
      'onboardingDispositionReason',
      'onboardingDispositionAt',
      'defaultProgressAccountId',
      'createdAt',
      'updatedAt',
    ]) {
      assert.ok(userSchema.properties?.[property], `Expected current-user property ${property}`);
    }

    const authSchema = resolveSchema(document, schema.properties.auth);
    for (const property of ['userId', 'provider', 'externalSubject']) {
      assert.ok(authSchema.properties?.[property], `Expected auth-summary property ${property}`);
    }
  } finally {
    await app.close();
  }
}

async function verifyHttpBoundary() {
  const suffix = randomUUID();
  const onboardingDispositionAt = new Date('2026-09-02T12:30:00.000Z');
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Current-user contract HTTP user',
      authProvider: 'test',
      authSubject: `current-user-contract-${suffix}`,
      email: `current-user-${suffix}@example.test`,
      timeZone: 'Europe/Copenhagen',
      onboardingDisposition: 'PENDING',
      onboardingDispositionReason: 'CONTRACT_TEST',
      onboardingDispositionAt,
    },
  });

  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: user.id },
  });

  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    assert.equal(response.statusCode, 200, response.body);

    const payload = currentAppUserResponseSchema.parse(response.json());
    assert.equal(payload.user.id, user.id);
    assert.equal(payload.user.displayName, 'Current-user contract HTTP user');
    assert.equal(payload.user.authProvider, 'dev');
    assert.equal(payload.user.authSubject, 'dev-single-user');
    assert.equal(payload.user.email, user.email);
    assert.equal(payload.user.timeZone, 'Europe/Copenhagen');
    assert.equal(payload.user.onboardingDispositionReason, 'CONTRACT_TEST');
    assert.equal(payload.user.onboardingDispositionAt, onboardingDispositionAt.toISOString());
    assert.equal(payload.user.defaultProgressAccountId, null);
    assert.equal(typeof payload.user.createdAt, 'string');
    assert.equal(typeof payload.user.updatedAt, 'string');
    assert.deepEqual(payload.auth, {
      userId: user.id,
      provider: 'dev',
      externalSubject: 'dev-single-user',
    });
  } finally {
    await app.close();
    await prisma.appUser.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

function resolveSchema(document, schema) {
  if (!schema?.$ref) return schema;
  return schema.$ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((value, segment) => value?.[segment], document);
}
