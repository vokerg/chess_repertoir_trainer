import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  AccountImportClaimLostError,
  AccountImportCoverageGapError,
  AccountImportWriteBatchTooLargeError,
  createAccountImportRepository,
} from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import {
  createAccountImportProviderCommitRepository,
} from '../../dist/modules/account-imports/account-import.provider-commit.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const userIds = [];
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
const requestedFrom = new Date('2026-08-01T00:00:00.000Z');
const requestedTo = new Date('2026-09-01T00:00:00.000Z');
const lifecycleRepository = createAccountImportRepository(prisma);

try {
  const primary = await createUserAccount('primary');
  const fenced = await createUserAccount('fenced');
  userIds.push(primary.userId, fenced.userId);

  const run = await createRunningRun(primary, 'primary');
  const repository = createAccountImportProviderCommitRepository(
    prisma,
    { async assertAllowed() {} },
    { maxWriteBatchSize: 2 },
  );

  await assert.rejects(
    repository.persistBatch({
      userId: primary.userId,
      importRunId: run.id,
      workKey: run.workKey,
      games: [normalizedGame('a'), normalizedGame('b'), normalizedGame('c')],
      gamesSeenDelta: 3,
      gamesSkippedOutOfScopeDelta: 0,
      gamesFailedDelta: 0,
    }),
    AccountImportWriteBatchTooLargeError,
  );

  assert.deepEqual(
    await repository.persistBatch({
      userId: primary.userId,
      importRunId: run.id,
      workKey: run.workKey,
      games: [normalizedGame('a'), normalizedGame('b')],
      gamesSeenDelta: 2,
      gamesSkippedOutOfScopeDelta: 0,
      gamesFailedDelta: 0,
    }),
    { attempted: 2, inserted: 2, duplicate: 0 },
  );
  assert.deepEqual(
    await repository.persistBatch({
      userId: primary.userId,
      importRunId: run.id,
      workKey: run.workKey,
      games: [normalizedGame('a'), normalizedGame('b')],
      gamesSeenDelta: 2,
      gamesSkippedOutOfScopeDelta: 0,
      gamesFailedDelta: 0,
    }),
    { attempted: 2, inserted: 0, duplicate: 2 },
    'overlap/restart replay is duplicate-safe while retaining exact execution counters',
  );
  await repository.persistBatch({
    userId: primary.userId,
    importRunId: run.id,
    workKey: run.workKey,
    games: [],
    gamesSeenDelta: 2,
    gamesSkippedOutOfScopeDelta: 1,
    gamesFailedDelta: 1,
  });

  const afterBatches = await prisma.importRun.findUniqueOrThrow({ where: { id: run.id } });
  assert.equal(afterBatches.gamesSeen, 6);
  assert.equal(afterBatches.gamesMatchedScope, 4);
  assert.equal(afterBatches.gamesImported, 2);
  assert.equal(afterBatches.gamesDuplicate, 2);
  assert.equal(afterBatches.gamesSkipped, 1);
  assert.equal(afterBatches.gamesSkippedOutOfScope, 1);
  assert.equal(afterBatches.gamesFailed, 1);
  assert.equal(await prisma.importedGame.count({ where: { accountId: primary.accountId } }), 2);

  await repository.completeWindow({
    userId: primary.userId,
    importRunId: run.id,
    workKey: run.workKey,
    coveredFrom: requestedFrom,
    coveredThrough: requestedTo,
    windowsTotal: 1,
    windowsCompleted: 1,
    checkpoint: {
      provider: 'CHESS_COM',
      completedMonth: '2026-08',
    },
  });
  const [completedWindowRun, coverage] = await Promise.all([
    prisma.importRun.findUniqueOrThrow({ where: { id: run.id } }),
    prisma.accountImportCoverage.findFirstOrThrow({ where: { accountId: primary.accountId } }),
  ]);
  assert.equal(completedWindowRun.windowsTotal, 1);
  assert.equal(completedWindowRun.windowsCompleted, 1);
  assert.deepEqual(completedWindowRun.checkpointJson, {
    provider: 'CHESS_COM',
    completedMonth: '2026-08',
  });
  assert.equal(coverage.coveredFrom?.toISOString(), requestedFrom.toISOString());
  assert.equal(coverage.coveredThrough?.toISOString(), requestedTo.toISOString());

  await assert.rejects(
    repository.completeWindow({
      userId: primary.userId,
      importRunId: run.id,
      workKey: run.workKey,
      coveredFrom: new Date('2026-06-01T00:00:00.000Z'),
      coveredThrough: new Date('2026-07-01T00:00:00.000Z'),
      windowsTotal: 1,
      windowsCompleted: 1,
      checkpoint: { provider: 'CHESS_COM', completedMonth: '2026-06' },
    }),
    /requested range/,
  );

  await assert.rejects(
    repository.persistBatch({
      userId: primary.userId,
      importRunId: run.id,
      workKey: 'stale-work-key',
      games: [],
      gamesSeenDelta: 1,
      gamesSkippedOutOfScopeDelta: 1,
      gamesFailedDelta: 0,
    }),
    AccountImportClaimLostError,
  );

  const fencedRun = await createRunningRun(fenced, 'fenced');
  const fencedRepository = createAccountImportProviderCommitRepository(prisma, {
    async assertAllowed() {
      throw new Error('lifecycle-fenced');
    },
  });
  await assert.rejects(
    fencedRepository.persistBatch({
      userId: fenced.userId,
      importRunId: fencedRun.id,
      workKey: fencedRun.workKey,
      games: [normalizedGame('fenced-game')],
      gamesSeenDelta: 1,
      gamesSkippedOutOfScopeDelta: 0,
      gamesFailedDelta: 0,
    }),
    /lifecycle-fenced/,
  );
  assert.equal(await prisma.importedGame.count({ where: { accountId: fenced.accountId } }), 0);
  assert.equal((await prisma.importRun.findUniqueOrThrow({ where: { id: fencedRun.id } })).gamesSeen, 0);

  await assert.rejects(
    fencedRepository.completeWindow({
      userId: fenced.userId,
      importRunId: fencedRun.id,
      workKey: fencedRun.workKey,
      coveredFrom: requestedFrom,
      coveredThrough: requestedTo,
      windowsTotal: 1,
      windowsCompleted: 1,
      checkpoint: { provider: 'CHESS_COM', completedMonth: '2026-08' },
    }),
    /lifecycle-fenced/,
  );
  assert.equal(await prisma.accountImportCoverage.count({ where: { accountId: fenced.accountId } }), 0);
  const afterFence = await prisma.importRun.findUniqueOrThrow({ where: { id: fencedRun.id } });
  assert.equal(afterFence.windowsCompleted, 0);
  assert.equal(afterFence.checkpointJson, null);

  const gap = await createUserAccount('gap');
  userIds.push(gap.userId);
  const gapRun = await createRunningRun(gap, 'gap', {
    requestedFrom: new Date('2026-06-01T00:00:00.000Z'),
    requestedTo,
  });
  await repository.completeWindow({
    userId: gap.userId,
    importRunId: gapRun.id,
    workKey: gapRun.workKey,
    coveredFrom: new Date('2026-08-01T00:00:00.000Z'),
    coveredThrough: requestedTo,
    windowsTotal: 3,
    windowsCompleted: 1,
    checkpoint: { provider: 'CHESS_COM', completedMonth: '2026-08' },
  });
  await assert.rejects(
    repository.completeWindow({
      userId: gap.userId,
      importRunId: gapRun.id,
      workKey: gapRun.workKey,
      coveredFrom: new Date('2026-06-01T00:00:00.000Z'),
      coveredThrough: new Date('2026-07-01T00:00:00.000Z'),
      windowsTotal: 3,
      windowsCompleted: 2,
      checkpoint: { provider: 'CHESS_COM', completedMonth: '2026-06' },
    }),
    AccountImportCoverageGapError,
  );
  const gapState = await prisma.importRun.findUniqueOrThrow({ where: { id: gapRun.id } });
  assert.equal(gapState.windowsCompleted, 1, 'failed gap commit rolls back checkpoint advancement');
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function createUserAccount(label) {
  const user = await prisma.appUser.create({ data: { displayName: `ONB-014 ${label} ${suffix}` } });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'CHESS_COM',
      username: `onb014-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

async function createRunningRun(owner, label, overrides = {}) {
  const created = await lifecycleRepository.createRun({
    userId: owner.userId,
    accountId: owner.accountId,
    mode: 'INCREMENTAL_FORWARD',
    source: 'USER_ACTION',
    scope,
    requestedFrom: overrides.requestedFrom ?? requestedFrom,
    requestedTo: overrides.requestedTo ?? requestedTo,
    priority: 100,
    windowsTotal: null,
  });
  const workKey = `account-import-onb014-${label}-${suffix}`;
  await prisma.importRun.update({
    where: { id: created.id },
    data: {
      status: 'RUNNING',
      workKey,
      claimedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });
  return { id: created.id, workKey };
}

function normalizedGame(providerGameId) {
  return {
    providerGameId,
    providerUrl: `https://www.chess.com/game/live/${providerGameId}`,
    pgn: '[Event "ONB-014"]\n\n1. e4 e5 *',
    rated: true,
    variant: 'chess',
    speedCategory: 'blitz',
    timeControlRaw: '300+0',
    timeControlInitial: 300,
    timeControlIncrement: 0,
    endedAt: new Date('2026-08-10T12:00:00.000Z'),
    whiteUsername: 'Alice',
    blackUsername: 'Bob',
    userColor: 'WHITE',
    opponentUsername: 'Bob',
    result: '1-0',
    resultForUser: 'WIN',
  };
}
