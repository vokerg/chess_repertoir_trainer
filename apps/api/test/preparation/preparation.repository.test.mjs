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

const boundedConfig = {
  ...DEFAULT_PREPARATION_CONFIG,
  maxNonTerminalBatches: 1,
  maxQueuedTasks: 50,
  maxQueuedAnalysisTasks: 3,
};
const repository = createPreparationRepository(prisma, boundedConfig);

try {
  assert.deepEqual(readPreparationConfig({}), DEFAULT_PREPARATION_CONFIG);
  assert.throws(
    () => readPreparationConfig({ PREPARATION_FIRST_INDEX_BATCH_SIZE: '0' }),
    /positive integer/,
  );

  const primary = await createUserAccount('primary');
  const secondary = await createUserAccount('secondary');
  userIds.push(primary.userId, secondary.userId);

  const primaryGames = await createGames(primary, 60, { indexed: false });
  const secondaryGames = await createGames(secondary, 10, { indexed: false });

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
    /unique|constraint/i,
    'the partial unique index rejects a second non-terminal run for one user',
  );

  await assert.rejects(
    repository.createRun({
      userId: secondary.userId,
      purpose: 'ONBOARDING',
      recipeVersion: 1,
      recipe: {},
      targets: [targetInput(primary.accountId, 'c')],
    }),
    /not owned/,
    'target creation is ownership isolated',
  );

  const secondaryRun = await repository.createRun({
    userId: secondary.userId,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: secondary.accountId, range: 'RECENT' },
    targets: [targetInput(secondary.accountId, 'd')],
  });

  const sameParentAdmissions = await Promise.all([
    repository.admitNextBatch({
      userId: primary.userId,
      preparationRunId: primaryRun.run.id,
      targetId: primaryRun.targets[0].id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
    }),
    repository.admitNextBatch({
      userId: primary.userId,
      preparationRunId: primaryRun.run.id,
      targetId: primaryRun.targets[0].id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
    }),
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
    primaryGames.slice(-50).reverse().map((game) => game.id),
    'candidate selection is bounded and newest-first',
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

  const crossParentBlocked = await repository.admitNextBatch({
    userId: secondary.userId,
    preparationRunId: secondaryRun.run.id,
    targetId: secondaryRun.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.deepEqual(
    crossParentBlocked,
    { outcome: 'BLOCKED', reason: 'GLOBAL_BATCH_CAPACITY' },
    'different parents cannot exceed the serialized global batch cap',
  );

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
    where: { id: { in: primaryGames.map((game) => game.id) } },
    data: { plyIndexedAt: new Date(), plyIndexError: null },
  });

  const directGameId = primaryGames.at(-1).id;
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

  await prisma.importedGame.updateMany({
    where: { id: { in: secondaryGames.map((game) => game.id) } },
    data: { plyIndexedAt: new Date(), plyIndexError: null },
  });
  const analysisCapacityBlocked = await repository.admitNextBatch({
    userId: secondary.userId,
    preparationRunId: secondaryRun.run.id,
    targetId: secondaryRun.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'FIRST_ANALYSIS',
  });
  assert.deepEqual(
    analysisCapacityBlocked,
    { outcome: 'BLOCKED', reason: 'GLOBAL_BATCH_CAPACITY' },
  );

  await prisma.jobTask.updateMany({
    where: { jobRunId: analysisAdmission.jobRunId },
    data: { status: 'COMPLETED', settledAt: new Date() },
  });
  await prisma.jobRun.update({
    where: { id: analysisAdmission.jobRunId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  const analysisCapRepository = createPreparationRepository(prisma, {
    ...boundedConfig,
    maxNonTerminalBatches: 4,
  });
  const analysisCapBlocked = await analysisCapRepository.admitNextBatch({
    userId: secondary.userId,
    preparationRunId: secondaryRun.run.id,
    targetId: secondaryRun.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'FIRST_ANALYSIS',
  });
  assert.equal(analysisCapBlocked.outcome, 'CREATED');
  assert.equal(analysisCapBlocked.importedGameIds.length, 3);

  const secondAnalysisAttempt = await analysisCapRepository.admitNextBatch({
    userId: primary.userId,
    preparationRunId: primaryRun.run.id,
    targetId: primaryRun.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'ANALYSIS_TAIL',
  });
  assert.deepEqual(
    secondAnalysisAttempt,
    { outcome: 'BLOCKED', reason: 'GLOBAL_ANALYSIS_CAPACITY' },
    'analysis task admission is separately capped after the global lock',
  );
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
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

async function createGames(owner, count, { indexed }) {
  const games = [];
  for (let index = 0; index < count; index += 1) {
    games.push(await prisma.importedGame.create({
      data: {
        userId: owner.userId,
        accountId: owner.accountId,
        provider: 'LICHESS',
        providerGameId: `preparation-${owner.accountId}-${index}-${suffix}`,
        pgn: '1. e4 e5',
        rated: index % 2 === 0,
        variant: 'STANDARD',
        speedCategory: index % 3 === 0 ? 'RAPID' : 'BLITZ',
        endedAt: new Date(Date.UTC(2026, 0, 1, 0, index, 0)),
        plyIndexedAt: indexed ? new Date() : null,
      },
    }));
  }
  return games;
}
