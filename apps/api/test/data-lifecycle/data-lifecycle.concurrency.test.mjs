import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import {
  createDataLifecycleRepository,
  DataLifecycleConflictError,
} from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const repositoryA = createDataLifecycleRepository(clientA);
const repositoryB = createDataLifecycleRepository(clientB);
const suffix = randomUUID();
const operationIds = [];
const userIds = [];

const counts = {
  accounts: 2,
  games: 2,
  plies: 0,
  analysisRuns: 0,
  aiReviews: 0,
  tacticalDetections: 0,
  scenarioSessions: 0,
  importRuns: 0,
  jobRuns: 0,
  preparationRuns: 0,
};

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fixture(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Lifecycle concurrent ${label}`,
      authProvider: 'lifecycle-concurrency-test',
      authSubject: `${label}-${suffix}`,
    },
  });
  userIds.push(user.id);
  const accountA = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `${label}-a-${suffix}`,
    },
  });
  const accountB = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `${label}-b-${suffix}`,
    },
  });
  const gameA = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: accountA.id,
      provider: 'TEST',
      providerGameId: `${label}-a-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const gameB = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: accountB.id,
      provider: 'TEST',
      providerGameId: `${label}-b-${suffix}`,
      pgn: '1. d4 d5',
    },
  });
  return { user, accountA, accountB, gameA, gameB };
}

async function createPreview(repository, fixtureData, resourceType, variant, token) {
  let action;
  let scope;
  if (resourceType === 'USER') {
    action = 'DELETE_APP_USER';
    scope = { resourceType: 'USER', userId: fixtureData.user.id };
  } else if (resourceType === 'ACCOUNT') {
    const account = variant === 2 ? fixtureData.accountB : fixtureData.accountA;
    action = 'PURGE_ACCOUNT_DATA';
    scope = {
      resourceType: 'ACCOUNT',
      userId: fixtureData.user.id,
      accountId: account.id,
    };
  } else {
    const account = variant === 2 ? fixtureData.accountB : fixtureData.accountA;
    const game = variant === 2 ? fixtureData.gameB : fixtureData.gameA;
    action = 'UNINDEX_GAMES';
    scope = {
      resourceType: 'GAME',
      userId: fixtureData.user.id,
      accountId: account.id,
      gameIds: [game.id],
    };
  }

  const operation = await repository.createPreview({
    action,
    actorUserId: fixtureData.user.id,
    targetUserId: fixtureData.user.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${token}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${token}`),
    scope,
    previewCounts: counts,
    previewHash: hash(`preview:${token}`),
    previewTokenHash: hash(`token:${token}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'CONCURRENT TEST',
  });
  operationIds.push(operation.id);
  return operation;
}

function execute(repository, operation, token, idempotencyToken = token) {
  return repository.startExecution({
    operationId: operation.id,
    targetUserId: operation.targetUserId,
    previewTokenHash: hash(`token:${token}`),
    previewHash: hash(`preview:${token}`),
    idempotencyKeyHash: hash(`idempotency:${idempotencyToken}`),
  });
}

async function assertConcurrentConflict(leftType, rightType) {
  const label = `${leftType.toLowerCase()}-${rightType.toLowerCase()}`;
  const data = await fixture(label);
  const left = await createPreview(repositoryA, data, leftType, 1, `${label}-left`);
  const rightVariant = leftType === rightType ? 2 : 1;
  const right = await createPreview(repositoryB, data, rightType, rightVariant, `${label}-right`);

  const settled = await Promise.allSettled([
    execute(repositoryA, left, `${label}-left`),
    execute(repositoryB, right, `${label}-right`),
  ]);
  const fulfilled = settled.filter((result) => result.status === 'fulfilled');
  const rejected = settled.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1, `${label}: exactly one concurrent creator must win`);
  assert.equal(rejected.length, 1, `${label}: exactly one concurrent creator must conflict`);
  assert.ok(
    rejected[0].reason instanceof DataLifecycleConflictError,
    `${label}: loser must observe lifecycle conflict`,
  );
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: {
        ownerUserId: data.user.id,
        releasedAt: null,
      },
    }),
    1,
    `${label}: only one live fence may remain for the user`,
  );
}

try {
  for (const [left, right] of [
    ['USER', 'USER'],
    ['USER', 'ACCOUNT'],
    ['USER', 'GAME'],
    ['ACCOUNT', 'ACCOUNT'],
    ['ACCOUNT', 'GAME'],
    ['GAME', 'GAME'],
  ]) {
    await assertConcurrentConflict(left, right);
  }

  {
    const data = await fixture('preview-race');
    const [first, second] = await Promise.all([
      createPreview(repositoryA, data, 'GAME', 1, 'preview-race-first'),
      createPreview(repositoryB, data, 'GAME', 2, 'preview-race-second'),
    ]);
    assert.notEqual(first.id, second.id);
    assert.equal(first.status, 'PREVIEWED');
    assert.equal(second.status, 'PREVIEWED');
  }

  {
    const data = await fixture('idempotency-race');
    const operation = await createPreview(
      repositoryA,
      data,
      'ACCOUNT',
      1,
      'idempotency-race-preview',
    );
    const settled = await Promise.allSettled([
      execute(repositoryA, operation, 'idempotency-race-preview', 'same-key'),
      execute(repositoryB, operation, 'idempotency-race-preview', 'same-key'),
    ]);
    assert.equal(settled.every((result) => result.status === 'fulfilled'), true);
    const values = settled.map((result) => result.value);
    assert.equal(values[0].id, operation.id);
    assert.equal(values[1].id, operation.id);
    assert.equal(values[0].idempotencyKeyHash, values[1].idempotencyKeyHash);
    assert.equal(
      await prisma.dataLifecycleResourceFence.count({
        where: { operationId: operation.id, releasedAt: null },
      }),
      1,
    );
  }

  console.log('Data lifecycle concurrency tests passed.');
} finally {
  if (operationIds.length > 0) {
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await clientA.$disconnect();
  await clientB.$disconnect();
  await prisma.$disconnect();
}
