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
const repository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const suffix = randomUUID();
const userIds = [];

try {
  await proveIndexScopeAndRetrySelection();
  await proveAnalysisRetrySelection();
  await proveCancelledLeaseExclusion();
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function proveIndexScopeAndRetrySelection() {
  const owner = await createOwner('index');
  const games = await Promise.all([
    createGame(owner, 'clean-null', {
      variant: null,
      speedCategory: 'blitz',
    }),
    createGame(owner, 'clean-chess', {
      variant: 'chess',
      speedCategory: 'rapid',
    }),
    createGame(owner, 'failed-standard', {
      variant: 'standard',
      speedCategory: 'blitz',
      plyIndexError: 'Prior index failure.',
    }),
    createGame(owner, 'wrong-variant', {
      variant: 'atomic',
      speedCategory: 'blitz',
    }),
    createGame(owner, 'wrong-speed', {
      variant: 'standard',
      speedCategory: 'bullet',
    }),
  ]);
  const run = await createRun(owner, 'a');

  const first = await repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.equal(first.outcome, 'CREATED');
  assert.deepEqual(
    new Set(first.importedGameIds),
    new Set([games[0].id, games[1].id]),
    'uppercase scope values match production lowercase speeds and standard variant aliases',
  );
  await settleAdmission(first);

  const retry = await repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'RETRY',
  });
  assert.equal(retry.outcome, 'CREATED');
  assert.deepEqual(
    retry.importedGameIds,
    [games[2].id],
    'index retry selects failed evidence only and does not absorb untouched backlog',
  );
}

async function proveAnalysisRetrySelection() {
  const owner = await createOwner('analysis');
  const games = await Promise.all([
    createGame(owner, 'not-analysed', {
      variant: 'standard',
      speedCategory: 'blitz',
      plyIndexedAt: new Date(),
      latestAnalysisStatus: null,
    }),
    createGame(owner, 'analysis-failed', {
      variant: 'standard',
      speedCategory: 'blitz',
      plyIndexedAt: new Date(),
      latestAnalysisStatus: 'FAILED',
    }),
    createGame(owner, 'analysis-complete', {
      variant: 'standard',
      speedCategory: 'blitz',
      plyIndexedAt: new Date(),
      latestAnalysisStatus: 'COMPLETED',
    }),
  ]);
  const run = await createRun(owner, 'b');

  const first = await repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'FIRST_ANALYSIS',
  });
  assert.equal(first.outcome, 'CREATED');
  assert.deepEqual(first.importedGameIds, [games[0].id]);
  await settleAdmission(first);

  const retry = await repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'RETRY',
  });
  assert.equal(retry.outcome, 'CREATED');
  assert.deepEqual(
    retry.importedGameIds,
    [games[1].id],
    'analysis retry selects failed evidence only',
  );
}

async function proveCancelledLeaseExclusion() {
  const owner = await createOwner('cancelled-lease');
  const game = await createGame(owner, 'leased', {
    variant: 'standard',
    speedCategory: 'blitz',
  });
  const run = await createRun(owner, 'c');
  const settledAt = new Date();

  await prisma.jobRun.create({
    data: {
      userId: owner.userId,
      kind: 'INDEX_GAMES',
      source: 'USER_ACTION',
      priority: 400,
      status: 'CANCELLED',
      totalTasks: 1,
      force: false,
      completedAt: settledAt,
      tasks: {
        create: [{
          importedGameId: game.id,
          ordinal: 0,
          status: 'CANCELLED',
          workKey: `GAME_WORK:${suffix}`,
          settledAt,
        }],
      },
    },
  });

  const admission = await repository.admitNextBatch({
    userId: owner.userId,
    preparationRunId: run.run.id,
    targetId: run.targets[0].id,
    stage: 'INDEX',
    lane: 'FIRST_INDEX',
  });
  assert.deepEqual(
    admission,
    { outcome: 'BLOCKED', reason: 'NO_ELIGIBLE_GAMES' },
    'a cancelled executor lease remains an active-game fence until acknowledgement',
  );
}

async function settleAdmission(admission) {
  const settledAt = new Date();
  await prisma.jobTask.updateMany({
    where: { jobRunId: admission.jobRunId },
    data: { status: 'COMPLETED', settledAt },
  });
  await prisma.jobRun.update({
    where: { id: admission.jobRunId },
    data: { status: 'COMPLETED', completedAt: settledAt },
  });
}

async function createOwner(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Preparation selection ${label}`,
      authProvider: 'test',
      authSubject: `preparation-selection-${label}-${suffix}`,
    },
  });
  userIds.push(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-selection-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

function createRun(owner, hashCharacter) {
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
        speedCategories: ['BLITZ', 'RAPID'],
        variants: ['STANDARD'],
      },
      requestedFrom: new Date('2025-01-01T00:00:00.000Z'),
      requestedTo: new Date('2027-01-01T00:00:00.000Z'),
    }],
  });
}

function createGame(owner, label, overrides) {
  return prisma.importedGame.create({
    data: {
      userId: owner.userId,
      accountId: owner.accountId,
      provider: 'LICHESS',
      providerGameId: `preparation-selection-${label}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    },
  });
}
