import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createAccountImportRepository(prisma);
const suffix = randomUUID();
const createdAccountIds = [];
let createdDevUserId;
let otherUserId;

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  const devUser = existingDevUser ?? await prisma.appUser.create({
    data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
  });
  if (!existingDevUser) createdDevUserId = devUser.id;
  const userId = devUser.id;

  const ownAccount = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `onb-012-http-${suffix}` },
  });
  createdAccountIds.push(ownAccount.id);

  const otherUser = await prisma.appUser.create({
    data: {
      displayName: 'ONB-012 foreign user',
      authProvider: 'test',
      authSubject: `onb-012-http-foreign-${suffix}`,
    },
  });
  otherUserId = otherUser.id;
  const otherAccount = await prisma.externalAccount.create({
    data: {
      userId: otherUser.id,
      provider: 'LICHESS',
      username: `onb-012-http-foreign-${suffix}`,
    },
  });

  const foreignRun = await repository.createRun(runInput(otherUser.id, otherAccount.id));

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId } });
  try {
    await app.ready();

    const create = await app.inject({
      method: 'POST',
      url: '/api/me/account-imports',
      payload: {
        accountId: ownAccount.id,
        mode: 'BOUNDED_INITIAL',
        scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
        requestedFrom: '2026-05-01T00:00:00.000Z',
        requestedTo: '2026-08-01T00:00:00.000Z',
      },
    });
    assert.equal(create.statusCode, 202);
    const created = create.json().importRun;
    assert.equal(created.accountId, ownAccount.id);
    assert.equal(created.source, 'USER_ACTION');
    assert.equal(created.status, 'QUEUED');
    assert.equal(typeof created.startedAt, 'string', 'persisted import start compatibility is preserved');
    assert.equal(created.priority, 100);
    assert.deepEqual(created.games, {
      seen: 0,
      matchedScope: 0,
      imported: 0,
      duplicate: 0,
      updated: 0,
      skipped: 0,
      skippedOutOfScope: 0,
      failed: 0,
    });

    const duplicateCreate = await app.inject({
      method: 'POST',
      url: '/api/me/account-imports',
      payload: {
        accountId: ownAccount.id,
        mode: 'BOUNDED_INITIAL',
        scope: { variant: 'STANDARD', speeds: ['BLITZ'], rated: 'BOTH' },
        requestedFrom: '2026-06-01T00:00:00.000Z',
        requestedTo: '2026-08-01T00:00:00.000Z',
      },
    });
    assert.equal(duplicateCreate.statusCode, 409);
    assert.equal(duplicateCreate.json().code, 'ACCOUNT_IMPORT_ACTIVE');

    const list = await app.inject({ method: 'GET', url: '/api/me/account-imports?limit=10' });
    assert.equal(list.statusCode, 200);
    assert.deepEqual(list.json().items.map((run) => run.id), [created.id]);

    const foreignDetail = await app.inject({
      method: 'GET',
      url: `/api/me/account-imports/${foreignRun.id}`,
    });
    assert.equal(foreignDetail.statusCode, 404, 'account import detail is ownership scoped');

    const pause = await app.inject({
      method: 'POST',
      url: `/api/me/account-imports/${created.id}/pause`,
    });
    assert.equal(pause.statusCode, 200);
    assert.equal(pause.json().importRun.status, 'PAUSED');

    const resume = await app.inject({
      method: 'POST',
      url: `/api/me/account-imports/${created.id}/resume`,
    });
    assert.equal(resume.statusCode, 200);
    assert.equal(resume.json().importRun.status, 'QUEUED');

    const cancel = await app.inject({
      method: 'POST',
      url: `/api/me/account-imports/${created.id}/cancel`,
    });
    assert.equal(cancel.statusCode, 200);
    assert.equal(cancel.json().importRun.status, 'CANCELLED');

    const retry = await app.inject({
      method: 'POST',
      url: `/api/me/account-imports/${created.id}/retry`,
    });
    assert.equal(retry.statusCode, 202);
    const retryRun = retry.json().importRun;
    assert.equal(retryRun.retryOfImportRunId, created.id);
    assert.equal(retryRun.status, 'QUEUED');
    assert.deepEqual(retryRun.scope, created.scope);
    assert.equal(retryRun.requestedFrom, created.requestedFrom);
    assert.equal(retryRun.requestedTo, created.requestedTo);

    const activeList = await app.inject({
      method: 'GET',
      url: '/api/me/account-imports?active=true&limit=10',
    });
    assert.equal(activeList.statusCode, 200);
    assert.deepEqual(activeList.json().items.map((run) => run.id), [retryRun.id]);

    const invalidRetry = await app.inject({
      method: 'POST',
      url: `/api/me/account-imports/${retryRun.id}/retry`,
    });
    assert.equal(invalidRetry.statusCode, 409);
    assert.equal(invalidRetry.json().code, 'ACCOUNT_IMPORT_INVALID_STATE');
  } finally {
    await app.close();
  }
} finally {
  if (createdAccountIds.length > 0) {
    await prisma.externalAccount.deleteMany({ where: { id: { in: createdAccountIds } } });
  }
  if (otherUserId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: otherUserId } });
  }
  if (createdDevUserId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: createdDevUserId } });
  }
  await prisma.$disconnect();
}

function runInput(userId, accountId) {
  return {
    userId,
    accountId,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: new Date('2026-05-01T00:00:00.000Z'),
    requestedTo: new Date('2026-08-01T00:00:00.000Z'),
    priority: 100,
    windowsTotal: null,
  };
}
