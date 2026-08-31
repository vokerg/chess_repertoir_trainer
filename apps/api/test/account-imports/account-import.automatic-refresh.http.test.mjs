import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };
const canonical = canonicalizeAccountImportScope(scope);
const HOUR = 60 * 60 * 1_000;
const MINUTE = 60 * 1_000;
let createdDevUserId;
let foreignUserId;

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  const devUser = existingDevUser ?? await prisma.appUser.create({
    data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
  });
  if (!existingDevUser) createdDevUserId = devUser.id;

  const stale = await createCoveredAccount(devUser.id, 'LICHESS', 'stale', 25);
  const concurrent = await createCoveredAccount(devUser.id, 'CHESS_COM', 'concurrent', 25);
  const fresh = await createCoveredAccount(devUser.id, 'LICHESS', 'fresh', 23);
  const inactive = await createCoveredAccount(devUser.id, 'LICHESS', 'inactive', 25, false);
  const noCoverage = await prisma.externalAccount.create({
    data: {
      userId: devUser.id,
      provider: 'LICHESS',
      username: `onb-025-no-coverage-${suffix}`,
    },
  });
  const throttled = await createCoveredAccount(devUser.id, 'LICHESS', 'throttled', 25);
  await createAutomaticFailure(devUser.id, throttled.account.id, 5 * MINUTE);

  const foreignUser = await prisma.appUser.create({
    data: {
      displayName: 'ONB-025 foreign user',
      authProvider: 'test',
      authSubject: `onb-025-foreign-${suffix}`,
    },
  });
  foreignUserId = foreignUser.id;
  const foreign = await createCoveredAccount(foreignUser.id, 'LICHESS', 'foreign', 25);

  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: devUser.id },
  });
  try {
    await app.ready();

    const first = await app.inject({
      method: 'POST',
      url: '/api/me/account-imports/automatic-refresh',
    });
    assert.equal(first.statusCode, 200, first.body);
    const firstItems = new Map(first.json().items.map((item) => [item.accountId, item]));

    assert.equal(firstItems.get(stale.account.id)?.status, 'accepted');
    assert.equal(firstItems.get(stale.account.id)?.importRun.mode, 'INCREMENTAL_FORWARD');
    assert.equal(firstItems.get(stale.account.id)?.importRun.source, 'ACCOUNT_REFRESH');
    assert.equal(firstItems.get(stale.account.id)?.importRun.priority, 10);
    assert.equal(firstItems.get(fresh.account.id)?.status, 'fresh');
    assert.equal(firstItems.get(noCoverage.id)?.status, 'failed');
    assert.equal(firstItems.get(noCoverage.id)?.code, 'ACCOUNT_IMPORT_INVALID_RANGE');
    assert.equal(firstItems.get(throttled.account.id)?.status, 'failed');
    assert.equal(firstItems.get(throttled.account.id)?.code, 'ACCOUNT_IMPORT_RETRY_THROTTLED');
    assert.equal(firstItems.has(inactive.account.id), false, 'inactive accounts are not evaluated');
    assert.equal(firstItems.has(foreign.account.id), false, 'foreign accounts are ownership scoped');

    const staleAgain = await app.inject({
      method: 'POST',
      url: '/api/me/account-imports/automatic-refresh',
    });
    const staleAgainItem = staleAgain.json().items.find((item) => item.accountId === stale.account.id);
    assert.equal(staleAgainItem?.status, 'alreadyActive');
    assert.equal(staleAgainItem?.importRun.id, firstItems.get(stale.account.id)?.importRun.id);

    await prisma.importRun.deleteMany({
      where: { accountId: concurrent.account.id, status: { not: 'COMPLETED' } },
    });
    const [left, right] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/me/account-imports/automatic-refresh' }),
      app.inject({ method: 'POST', url: '/api/me/account-imports/automatic-refresh' }),
    ]);
    const concurrentStatuses = [left, right]
      .map((response) => response.json().items.find((item) => item.accountId === concurrent.account.id)?.status)
      .sort();
    assert.deepEqual(
      concurrentStatuses,
      ['accepted', 'alreadyActive'],
      'concurrent bootstrap requests share the database-enforced non-terminal run',
    );

    const openapi = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(openapi.statusCode, 200);
    const operation = openapi.json().paths['/api/me/account-imports/automatic-refresh']?.post;
    assert.equal(operation?.operationId, 'refreshStaleExternalAccounts');
    assert.ok(operation?.responses?.['200']);
  } finally {
    await app.close();
  }
} finally {
  if (foreignUserId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: foreignUserId } });
  }
  if (createdDevUserId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: createdDevUserId } });
  } else {
    const devUser = await prisma.appUser.findUnique({
      where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
    });
    if (devUser) {
      await prisma.externalAccount.deleteMany({
        where: { userId: devUser.id, username: { contains: suffix } },
      });
    }
  }
  await prisma.$disconnect();
}

console.log('Automatic account refresh HTTP integration tests passed.');

async function createCoveredAccount(userId, provider, label, completedHoursAgo, isActive = true) {
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider,
      username: `onb-025-${label}-${suffix}`,
      isActive,
    },
  });
  const completedAt = new Date(Date.now() - completedHoursAgo * HOUR);
  const requestedTo = new Date(completedAt.getTime() - HOUR);
  const requestedFrom = new Date(requestedTo.getTime() - 24 * HOUR);
  const coverageCreatedAt = new Date(requestedFrom.getTime() - HOUR);
  const run = await prisma.importRun.create({
    data: {
      userId,
      accountId: account.id,
      provider,
      mode: 'INCREMENTAL_FORWARD',
      source: 'ACCOUNT_REFRESH',
      status: 'COMPLETED',
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      requestedFrom,
      requestedTo,
      priority: 100,
      completedAt,
      createdAt: coverageCreatedAt,
    },
  });
  await prisma.accountImportCoverage.create({
    data: {
      accountId: account.id,
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      coveredFrom: requestedFrom,
      coveredThrough: requestedTo,
      lastCompletedImportRunId: run.id,
      createdAt: coverageCreatedAt,
    },
  });
  return { account, run };
}

async function createAutomaticFailure(userId, accountId, ageMs) {
  const account = await prisma.externalAccount.findUniqueOrThrow({ where: { id: accountId } });
  const completedAt = new Date(Date.now() - ageMs);
  return prisma.importRun.create({
    data: {
      userId,
      accountId,
      provider: account.provider,
      mode: 'INCREMENTAL_FORWARD',
      source: 'ACCOUNT_REFRESH',
      status: 'FAILED',
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      requestedFrom: new Date(completedAt.getTime() - HOUR),
      requestedTo: completedAt,
      priority: 10,
      completedAt,
      errorCode: 'PROVIDER_TEMPORARY',
      error: 'Temporary provider failure.',
    },
  });
}