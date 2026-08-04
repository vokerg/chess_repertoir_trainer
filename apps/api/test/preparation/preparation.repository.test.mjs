import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  DEFAULT_PREPARATION_CONFIG,
  readPreparationConfig,
} from '../../dist/modules/preparation/preparation.config.js';
import {
  createPreparationRepository,
} from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const userIds = [];
const repository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);

try {
  assert.deepEqual(readPreparationConfig({}), DEFAULT_PREPARATION_CONFIG);
  assert.throws(
    () => readPreparationConfig({ PREPARATION_FIRST_INDEX_BATCH_SIZE: '0' }),
    /positive integer/,
  );

  const primary = await createUserAccount('primary');
  const intruder = await createUserAccount('intruder');
  userIds.push(primary.userId, intruder.userId);

  await createGames(primary, 60);
  const primaryGames = await prisma.importedGame.findMany({
    where: { userId: primary.userId },
    orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
  });

  await assert.rejects(
    repository.createRun({
      userId: intruder.userId,
      purpose: 'ONBOARDING',
      recipeVersion: 1,
      recipe: {},
      targets: [targetInput(primary.accountId, 'i')],
    }),
    /not owned/,
    'target creation is ownership isolated',
  );
  assert.equal(
    await prisma.dataPreparationRun.count({ where: { userId: intruder.userId } }),
    0,
    'an invalid target cannot leave a parent run behind',
  );

  const primaryRun = await repository.createRun({
    userId: primary.userId,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: primary.accountId, range: 'RECENT' },
    targets: [targetInput(primary.accountId, 'a')],
  });
  assert.equal(primaryRun.targets.length, 1);

  await assert.rejects(
    repository.createRun({
      userId: primary.userId,
      purpose: 'EXPANSION',
      recipeVersion: 1,
      recipe: {},
      targets: [targetInput(primary.accountId, 'b')],
    }),
    isUniqueConstraintViolation,
    'the partial unique index rejects a second non-terminal run for one user',
  );

  const sameParentAdmissions = await Promise.all([
    admitIndex(primary, primaryRun),
    admitIndex(primary, primaryRun),
  ]);
  const createdAdmissions = sameParentAdmissions.filter((result) => result.outcome === 'CREATED');
  const blockedAdmissions = sameParentAdmissions.filter((result) => result.outcome === 'BLOCKED');
  assert.equal(createdAdmissions.length, 1, 'same-parent creators admit one active stage batch');
  assert.equal(blockedAdmissions.length, 1);
  assert.equal(blockedAdmissions[0].reason, 'ACTIVE_STAGE_BATCH');

  const indexAdmission = createdAdmissions[0];
  assert.equal(indexAdmission.importedGameIds.length, 50);
  assert.deepEqual(
    indexAdmission.importedGameIds,
    primaryGames.slice(0, 50).map((game) => game.id),
    'candidate selection is bounded and newest-first',
  );

  await assert.rejects(
    prisma.dataPreparationBatch.create({
      data: {
        preparationRunId: primaryRun.run.id,
        targetId: primaryRun.targets[0].id,
        stage: 'INDEX',
        lane: 'INDEX_CONTINUATION',
        ordinal: 99,
        status: 'QUEUED',
        plannedLimit: 1,
        totalTasks: 0,
      },
    }),
    isUniqueConstraintViolation,
    'the partial unique index independently rejects a second active stage batch',
  );

  const indexJob = await prisma.jobRun.findUniqueOrThrow({
    where: { id: indexAdmission.jobRunId },
    include: { tasks: { orderBy: { ordinal: 'asc' } } },
  });
  assert.equal(indexJob.source, 'ONBOARDING');
  assert.equal(indexJob.kind, 'INDEX_GAMES');
  assert.equal(indexJob.priority, 200);
  assert.equal(indexJob.totalTasks, 50);
  assert.equal(indexJob.tasks.length, 50);

  const settledAt = new Date();
  await prisma.jobTask.updateMany({
    where: { jobRunId: indexAdmission.jobRunId },
    data: { status: 'COMPLETED', settledAt },
  });
  await prisma.jobRun.update({
    where: { id: indexAdmission.jobRunId },
    data: {
      status: 'COMPLETED',
      startedAt: new Date(settledAt.getTime() - 1000),
      completedAt: settledAt,
    },
  });

  const settledBatch = await prisma.dataPreparationBatch.findUniqueOrThrow({
    where: { id: indexAdmission.batchId },
  });
  assert.equal(settledBatch.status, 'COMPLETED');
  assert.equal(settledBatch.totalTasks, 50);
  assert.equal(settledBatch.completedTasks, 50);
  assert.ok(settledBatch.startedAt);
  assert.ok(settledBatch.firstSettledAt);
  assert.ok(settledBatch.settledAt);

  await prisma.jobRun.delete({ where: { id: indexAdmission.jobRunId } });
  const retainedBatch = await prisma.dataPreparationBatch.findUniqueOrThrow({
    where: { id: indexAdmission.batchId },
  });
  assert.equal(retainedBatch.jobRunId, null);
  assert.equal(retainedBatch.completedTasks, 50, 'retention deletion preserves terminal evidence');
  assert.equal(retainedBatch.totalTasks, 50, 'the immutable denominator survives child deletion');

  await prisma.importedGame.updateMany({
    where: { userId: primary.userId },
    data: { plyIndexedAt: new Date(), plyIndexError: null },
  });

  const directGameId = primaryGames[0].id;
  const directJob = await prisma.jobRun.create({
    data: {
      userId: primary.userId,
      kind: 'ANALYSE_GAMES',
      source: 'USER_ACTION',
      priority: 300,
      status: 'QUEUED',
      totalTasks: 1,
      force: false,
      tasks: {
        create: [{ importedGameId: directGameId, ordinal: 0, status: 'QUEUED' }],
      },
    },
  });

  const analysisAdmission = await repository.admitNextBatch({
    userId: primary.userId,
    preparationRunId: primaryRun.run.id,
    targetId: primaryRun.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'FIRST_ANALYSIS',
  });
  assert.equal(analysisAdmission.outcome, 'CREATED');
  assert.equal(analysisAdmission.importedGameIds.length, 3);
  assert.ok(!analysisAdmission.importedGameIds.includes(directGameId));

  const analysisJob = await prisma.jobRun.findUniqueOrThrow({
    where: { id: analysisAdmission.jobRunId },
  });
  assert.equal(analysisJob.priority, 190);
  assert.ok(analysisJob.priority < directJob.priority, 'direct-user work remains higher priority');
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

function admitIndex(owner, run) {
  return repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
}

function targetInput(accountId, hashCharacter) {
  return {
    accountId,
    ordinal: 0,
    scopeVersion: 1,
    scopeHash: hashCharacter.repeat(64),
    scope: {
      rated: 'ANY',
      speedCategories: ['BLITZ', 'RAPID'],
      variants: ['STANDARD'],
    },
    requestedFrom: new Date('2025-01-01T00:00:00.000Z'),
    requestedTo: new Date('2027-01-01T00:00:00.000Z'),
  };
}

async function createUserAccount(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Preparation ${label}`,
      authProvider: 'test',
      authSubject: `preparation-${label}-${suffix}`,
    },
  });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

async function createGames(owner, count) {
  await prisma.importedGame.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `preparation-${owner.accountId}-${index}-${suffix}`,
      pgn: '1. e4 e5',
      rated: index % 2 === 0,
      variant: 'standard',
      speedCategory: index % 3 === 0 ? 'rapid' : 'blitz',
      endedAt: new Date(Date.UTC(2026, 0, 1, 0, index, 0)),
    })),
  });
}

function isUniqueConstraintViolation(error) {
  return error?.code === 'P2002'
    || (error?.code === 'P2010' && error?.meta?.code === '23505');
}
