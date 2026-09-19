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
const userIds = [];

try {
  await proveConfiguredTaskCap();
  await proveDefaultTwoHundredTaskCapWithLargeCandidateSet();
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function proveConfiguredTaskCap() {
  const repository = createPreparationRepository(prisma, {
    ...DEFAULT_PREPARATION_CONFIG,
    maxNonTerminalBatches: 4,
    maxQueuedTasks: 50,
  });
  const owners = await Promise.all([
    createOwner('configured-first'),
    createOwner('configured-second'),
  ]);

  try {
    await createGames(owners[0], 50, 'configured-first');
    await createGames(owners[1], 1, 'configured-second');

    const firstRun = await createRun(repository, owners[0], 'a');
    const secondRun = await createRun(repository, owners[1], 'b');

    const firstAdmission = await admitFirstIndex(repository, owners[0], firstRun);
    assert.equal(firstAdmission.outcome, 'CREATED');
    assert.equal(firstAdmission.importedGameIds.length, 50);

    const secondAdmission = await admitFirstIndex(repository, owners[1], secondRun);
    assert.deepEqual(
      secondAdmission,
      { outcome: 'BLOCKED', reason: 'GLOBAL_TASK_CAPACITY' },
      'serialized admission re-counts queued tasks before creating another child job',
    );

    assert.equal(await queuedOnboardingTaskCount(), 50);
  } finally {
    await cleanupOwners(owners);
  }
}

async function proveDefaultTwoHundredTaskCapWithLargeCandidateSet() {
  const repository = createPreparationRepository(prisma, {
    ...DEFAULT_PREPARATION_CONFIG,
    // Isolate the documented 200-task ceiling from the independent four-batch ceiling.
    maxNonTerminalBatches: 5,
  });
  const owners = [];
  for (const label of [
    'default-large',
    'default-second',
    'default-third',
    'default-fourth',
    'default-blocked',
  ]) {
    owners.push(await createOwner(label));
  }

  try {
    const gameCounts = [250, 50, 50, 50, 1];
    for (let index = 0; index < owners.length; index += 1) {
      await createGames(owners[index], gameCounts[index], `default-${index}`);
    }

    const runs = [];
    for (let index = 0; index < owners.length; index += 1) {
      runs.push(await createRun(repository, owners[index], String(index + 1)));
    }

    for (let index = 0; index < 4; index += 1) {
      const admission = await admitFirstIndex(repository, owners[index], runs[index]);
      assert.equal(admission.outcome, 'CREATED');
      assert.equal(
        admission.importedGameIds.length,
        50,
        'each admission remains bounded to the documented 50-game index wave',
      );
    }

    assert.equal(
      await queuedOnboardingTaskCount(),
      DEFAULT_PREPARATION_CONFIG.maxQueuedTasks,
      'four bounded waves reach exactly the documented default 200-task ceiling',
    );

    const blocked = await admitFirstIndex(repository, owners[4], runs[4]);
    assert.deepEqual(
      blocked,
      { outcome: 'BLOCKED', reason: 'GLOBAL_TASK_CAPACITY' },
      'a fifth parent cannot exceed the default 200 queued-task ceiling',
    );
    assert.equal(
      await queuedOnboardingTaskCount(),
      DEFAULT_PREPARATION_CONFIG.maxQueuedTasks,
      'blocked admission creates no excess tasks',
    );
  } finally {
    await cleanupOwners(owners);
  }
}

function admitFirstIndex(repository, owner, run) {
  return repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
}

function queuedOnboardingTaskCount() {
  return prisma.jobTask.count({
    where: {
      status: 'QUEUED',
      jobRun: { source: 'ONBOARDING' },
    },
  });
}

async function createOwner(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Preparation task cap ${label}`,
      authProvider: 'test',
      authSubject: `preparation-task-cap-${label}-${suffix}`,
    },
  });
  userIds.push(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-task-cap-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

function createRun(repository, owner, hashCharacter) {
  return repository.createRun({
    userId: owner.userId,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: owner.accountId },
    targets: [{
      accountId: owner.accountId,
      ordinal: 0,
      scopeVersion: 1,
      scopeHash: hashCharacter.repeat(64),
      scope: {
        rated: 'ANY',
        speedCategories: ['BLITZ'],
        variants: ['STANDARD'],
      },
      requestedFrom: new Date('2025-01-01T00:00:00.000Z'),
      requestedTo: new Date('2027-01-01T00:00:00.000Z'),
    }],
  });
}

function createGames(owner, count, label) {
  return prisma.importedGame.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `preparation-task-cap-${label}-${index}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date(Date.UTC(2026, 0, 1, 0, index, 0)),
    })),
  });
}

async function cleanupOwners(owners) {
  const ids = owners.map((owner) => owner.userId);
  await prisma.appUser.deleteMany({ where: { id: { in: ids } } });
  for (const id of ids) {
    const index = userIds.indexOf(id);
    if (index >= 0) userIds.splice(index, 1);
  }
}
