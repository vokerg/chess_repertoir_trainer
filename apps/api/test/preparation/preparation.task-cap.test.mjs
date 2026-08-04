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
const repository = createPreparationRepository(prisma, {
  ...DEFAULT_PREPARATION_CONFIG,
  maxNonTerminalBatches: 4,
  maxQueuedTasks: 50,
});

try {
  const first = await createOwner('first');
  const second = await createOwner('second');
  userIds.push(first.userId, second.userId);

  await createGames(first, 50);
  await createGames(second, 1);

  const firstRun = await createRun(first, 'a');
  const secondRun = await createRun(second, 'b');

  const firstAdmission = await repository.admitNextBatch({
    userId: first.userId,
    preparationRunId: firstRun.run.id,
    targetId: firstRun.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.equal(firstAdmission.outcome, 'CREATED');
  assert.equal(firstAdmission.importedGameIds.length, 50);

  const secondAdmission = await repository.admitNextBatch({
    userId: second.userId,
    preparationRunId: secondRun.run.id,
    targetId: secondRun.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.deepEqual(
    secondAdmission,
    { outcome: 'BLOCKED', reason: 'GLOBAL_TASK_CAPACITY' },
    'serialized admission re-counts queued tasks before creating another child job',
  );

  assert.equal(
    await prisma.jobTask.count({
      where: {
        status: 'QUEUED',
        jobRun: { source: 'ONBOARDING' },
      },
    }),
    50,
  );
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function createOwner(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Preparation task cap ${label}`,
      authProvider: 'test',
      authSubject: `preparation-task-cap-${label}-${suffix}`,
    },
  });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-task-cap-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

async function createRun(owner, hashCharacter) {
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

async function createGames(owner, count) {
  for (let index = 0; index < count; index += 1) {
    await prisma.importedGame.create({
      data: {
        userId: owner.userId,
        accountId: owner.accountId,
        provider: 'LICHESS',
        providerGameId: `preparation-task-cap-${owner.accountId}-${index}-${suffix}`,
        pgn: '1. e4 e5',
        rated: true,
        variant: 'STANDARD',
        speedCategory: 'BLITZ',
        endedAt: new Date(Date.UTC(2026, 0, 1, 0, index, 0)),
      },
    });
  }
}
