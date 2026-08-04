import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  DEFAULT_PREPARATION_CONFIG,
} from '../../dist/modules/preparation/preparation.config.js';
import {
  createPreparationRepository,
} from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const createdUserIds = [];

try {
  await proveGlobalBatchCap();
  await proveGlobalTaskCap();
  await proveGlobalAnalysisCap();
} finally {
  if (createdUserIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
}

async function proveGlobalBatchCap() {
  const repository = createPreparationRepository(prisma, {
    ...DEFAULT_PREPARATION_CONFIG,
    maxNonTerminalBatches: 1,
  });
  const pair = await createPair('batch', 1, false, repository);

  const results = await Promise.all(pair.map(({ owner, run }) => (
    repository.admitNextBatch({
      userId: owner.userId,
      preparationRunId: run.run.id,
      targetId: run.targets[0].id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
    })
  )));

  assertConcurrentOutcomes(results, 'GLOBAL_BATCH_CAPACITY');
  assert.equal(
    await prisma.dataPreparationBatch.count({ where: { status: { in: ['QUEUED', 'RUNNING'] } } }),
    1,
  );
  await cleanupPair(pair);
}

async function proveGlobalTaskCap() {
  const repository = createPreparationRepository(prisma, {
    ...DEFAULT_PREPARATION_CONFIG,
    maxNonTerminalBatches: 4,
    maxQueuedTasks: 50,
  });
  const pair = await createPair('tasks', 50, false, repository);

  const results = await Promise.all(pair.map(({ owner, run }) => (
    repository.admitNextBatch({
      userId: owner.userId,
      preparationRunId: run.run.id,
      targetId: run.targets[0].id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
    })
  )));

  assertConcurrentOutcomes(results, 'GLOBAL_TASK_CAPACITY');
  assert.equal(
    await prisma.jobTask.count({
      where: {
        status: 'QUEUED',
        jobRun: { source: 'ONBOARDING' },
      },
    }),
    50,
  );
  await cleanupPair(pair);
}

async function proveGlobalAnalysisCap() {
  const repository = createPreparationRepository(prisma, {
    ...DEFAULT_PREPARATION_CONFIG,
    maxNonTerminalBatches: 4,
    maxQueuedAnalysisTasks: 3,
  });
  const pair = await createPair('analysis', 3, true, repository);

  const results = await Promise.all(pair.map(({ owner, run }) => (
    repository.admitNextBatch({
      userId: owner.userId,
      preparationRunId: run.run.id,
      targetId: run.targets[0].id,
      stage: 'ANALYSIS',
      lane: 'FIRST_ANALYSIS',
    })
  )));

  assertConcurrentOutcomes(results, 'GLOBAL_ANALYSIS_CAPACITY');
  assert.equal(
    await prisma.jobTask.count({
      where: {
        status: 'QUEUED',
        jobRun: { source: 'ONBOARDING', kind: 'ANALYSE_GAMES' },
      },
    }),
    3,
  );
  await cleanupPair(pair);
}

function assertConcurrentOutcomes(results, blockedReason) {
  const created = results.filter((result) => result.outcome === 'CREATED');
  const blocked = results.filter((result) => result.outcome === 'BLOCKED');
  assert.equal(created.length, 1, 'one different-parent creator obtains serialized capacity');
  assert.equal(blocked.length, 1, 'the competing creator observes the post-lock capacity count');
  assert.equal(blocked[0].reason, blockedReason);
}

async function createPair(label, gameCount, indexed, repository) {
  const owners = await Promise.all([
    createOwner(`${label}-a`),
    createOwner(`${label}-b`),
  ]);

  return Promise.all(owners.map(async (owner, index) => {
    await createGames(owner, gameCount, indexed, `${label}-${index}`);
    const run = await repository.createRun({
      userId: owner.userId,
      purpose: 'ONBOARDING',
      recipeVersion: 1,
      recipe: { accountId: owner.accountId },
      targets: [{
        accountId: owner.accountId,
        ordinal: 0,
        scopeVersion: 1,
        scopeHash: String(index + 1).repeat(64),
        scope: {
          rated: 'ANY',
          speedCategories: ['BLITZ'],
          variants: ['STANDARD'],
        },
        requestedFrom: new Date('2025-01-01T00:00:00.000Z'),
        requestedTo: new Date('2027-01-01T00:00:00.000Z'),
      }],
    });
    return { owner, run };
  }));
}

async function createOwner(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Preparation concurrency ${label}`,
      authProvider: 'test',
      authSubject: `preparation-concurrency-${label}-${suffix}`,
    },
  });
  createdUserIds.push(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-concurrency-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

async function createGames(owner, count, indexed, label) {
  await prisma.importedGame.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `preparation-concurrency-${label}-${index}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date(Date.UTC(2026, 0, 1, 0, index, 0)),
      plyIndexedAt: indexed ? new Date() : null,
    })),
  });
}

async function cleanupPair(pair) {
  const ids = pair.map(({ owner }) => owner.userId);
  await prisma.appUser.deleteMany({ where: { id: { in: ids } } });
  for (const id of ids) {
    const index = createdUserIds.indexOf(id);
    if (index >= 0) createdUserIds.splice(index, 1);
  }
}
