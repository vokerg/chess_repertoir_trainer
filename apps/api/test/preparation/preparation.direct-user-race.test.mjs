import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  DEFAULT_PREPARATION_CONFIG,
} from '../../dist/modules/preparation/preparation.config.js';
import {
  createPreparationRepository,
} from '../../dist/modules/preparation/preparation.repository.prisma.js';
import {
  JobRunRepository,
} from '../../dist/modules/jobs/job-run.repository.prisma.js';
import {
  createJobWorkerRepository,
} from '../../dist/modules/jobs/job-worker.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const userIds = [];

try {
  await proveDirectJobCanWinAdmissionRace();
  await proveDirectJobPreemptsSafeQueuedDuplicate();
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function proveDirectJobCanWinAdmissionRace() {
  const owner = await createOwner('direct-wins');
  const game = await createGame(owner, 'direct-wins');
  const gate = createGate();
  const repository = createPreparationRepository(
    prisma,
    DEFAULT_PREPARATION_CONFIG,
    {
      async assertAllowed() {
        gate.enter();
        await gate.waitForRelease();
      },
    },
  );
  const run = await createRun(repository, owner, 'a');

  const admissionPromise = repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });

  await gate.waitUntilEntered();
  const direct = await JobRunRepository.createQueued({
    userId: owner.userId,
    kind: 'INDEX_GAMES',
    source: 'USER_ACTION',
    priority: 400,
    force: false,
    importedGameIds: [game.id],
  });
  assert.ok(direct);
  gate.release();

  assert.deepEqual(
    await admissionPromise,
    { outcome: 'BLOCKED', reason: 'NO_ELIGIBLE_GAMES' },
    'a direct job committed during preparation admission wins candidate selection',
  );
  await cleanupOwner(owner);
}

async function proveDirectJobPreemptsSafeQueuedDuplicate() {
  const owner = await createOwner('preparation-wins');
  const game = await createGame(owner, 'preparation-wins');
  const repository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
  const run = await createRun(repository, owner, 'b');

  const admission = await repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.equal(admission.outcome, 'CREATED');

  const direct = await JobRunRepository.createQueued({
    userId: owner.userId,
    kind: 'INDEX_GAMES',
    source: 'USER_ACTION',
    priority: 400,
    force: false,
    importedGameIds: [game.id],
  });
  assert.ok(direct);
  assert.equal(
    await prisma.jobTask.count({
      where: {
        importedGameId: game.id,
        status: 'QUEUED',
      },
    }),
    2,
    'a late direct action may leave one harmless queued duplicate',
  );

  const workerRepository = createJobWorkerRepository(prisma);
  const claimed = await workerRepository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
  });
  assert.ok(claimed);
  assert.equal(
    claimed.jobRunId,
    direct.jobRun.id,
    'the worker claims higher-priority direct work before preparation',
  );
  assert.equal(
    await prisma.jobTask.count({
      where: {
        jobRunId: admission.jobRunId,
        importedGameId: game.id,
        status: 'QUEUED',
      },
    }),
    1,
    'the lower-priority preparation duplicate remains fenced and queued',
  );
}

function createGate() {
  let enterResolve;
  let releaseResolve;
  const entered = new Promise((resolve) => { enterResolve = resolve; });
  const released = new Promise((resolve) => { releaseResolve = resolve; });
  return {
    enter: () => enterResolve(),
    waitUntilEntered: () => entered,
    waitForRelease: () => released,
    release: () => releaseResolve(),
  };
}

async function createOwner(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Preparation direct race ${label}`,
      authProvider: 'test',
      authSubject: `preparation-direct-race-${label}-${suffix}`,
    },
  });
  userIds.push(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-direct-race-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

function createGame(owner, label) {
  return prisma.importedGame.create({
    data: {
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `preparation-direct-race-${label}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });
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

async function cleanupOwner(owner) {
  await prisma.appUser.delete({ where: { id: owner.userId } });
  const index = userIds.indexOf(owner.userId);
  if (index >= 0) userIds.splice(index, 1);
}
