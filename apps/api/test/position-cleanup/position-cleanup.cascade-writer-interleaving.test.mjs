import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { clearPlyRowsForGame } from '../../dist/modules/imported-games/ply-index.repository.prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupRepository } from '../../dist/modules/position-cleanup/position-cleanup.repository.prisma.js';
import {
  createPositionCleanupService,
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
} from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
const cleanupClient = new PrismaClient();
const blockerClient = new PrismaClient();
const cleanupRepository = createPositionCleanupRepository(cleanupClient);
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '10',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '10',
  POSITION_CLEANUP_LOCK_TIMEOUT_MS: '5000',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '10000',
});
const service = createPositionCleanupService({ config });
const worker = createPositionCleanupWorker({
  config,
  repository: cleanupRepository,
  logger: { info() {}, warn() {}, error() {} },
});
const suffix = randomUUID();
const createdPositionIds = [];
let userId;
let releaseBlocker;
let blockerPromise;
let cleanupPromise;
let unindexPromise;
let gameDeletePromise;
let accountDeletePromise;

const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

async function waitFor(predicate, description) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (await predicate()) return;
    await sleep(10);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function tableLockCount(tableName, mode, granted) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "count"
    FROM pg_locks AS locks
    JOIN pg_class AS relation ON relation.oid = locks.relation
    WHERE relation.relname = ${tableName}
      AND locks.mode = ${mode}
      AND locks.granted = ${granted}
  `;
  return rows[0]?.count ?? 0;
}

async function createPosition(label) {
  const normalizedFen = `position-cleanup-cascade-${label}-${suffix}`;
  const position = await prisma.position.create({
    data: {
      normalizedFen,
      positionKey: new Uint8Array(positionKeyForNormalizedFen(normalizedFen)),
    },
  });
  createdPositionIds.push(position.id);
  return position;
}

async function createAccountWithGame(user, label, plyNumber) {
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `position-cleanup-cascade-${label}-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-cascade-${label}-${suffix}`,
      pgn: '1. e4',
    },
  });
  const position = await createPosition(label);
  await prisma.importedGamePly.create({
    data: {
      importedGameId: game.id,
      positionId: position.id,
      plyNumber,
      moveUci: 'e2e4',
    },
  });
  return { account, game, position };
}

async function prepareExecuteRun(positionId) {
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (
      ${positionId}, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'
    )
  `;
  const run = await service.create({
    mode: 'EXECUTE',
    requestedBy: 'test:cascade-writer-lock-graph',
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  });
  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "reconcileUpperBound" = ${positionId},
        "positionUpperBound" = ${positionId},
        "reconcileAfterPositionId" = ${positionId - 1},
        "observeAfterPositionId" = ${positionId - 1}
    WHERE "id" = ${run.id}
  `;
  for (let step = 0; step < 10; step += 1) {
    const current = await service.status(run.id);
    if (current.phase === 'EVALUATE') return current;
    assert.equal(['QUEUED', 'RUNNING'].includes(current.status), true);
    assert.equal(await worker.runOnce(), true);
  }
  throw new Error(`Cleanup run ${run.id} did not reach EVALUATE.`);
}

async function settleWithin(promise, description) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out waiting for ${description}.`)),
          5000,
        );
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position cleanup cascade ${suffix}`,
      authProvider: 'position-cleanup-cascade-test',
      authSubject: suffix,
    },
  });
  userId = user.id;

  const unindexFixture = await createAccountWithGame(user, 'unindex', 1);
  const gameDeleteFixture = await createAccountWithGame(user, 'game-delete', 1);
  const accountDeleteFixture = await createAccountWithGame(user, 'account-delete', 1);
  const cleanupTarget = await createPosition('cleanup-target');
  const run = await prepareExecuteRun(cleanupTarget.id);

  let blockerReadyResolve;
  const blockerReady = new Promise((resolve) => { blockerReadyResolve = resolve; });
  const blockerRelease = new Promise((resolve) => { releaseBlocker = resolve; });
  blockerPromise = blockerClient.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      'LOCK TABLE "ImportedGamePosition" IN ROW EXCLUSIVE MODE',
    );
    blockerReadyResolve();
    await blockerRelease;
  });
  await blockerReady;

  cleanupPromise = worker.runOnce();
  await waitFor(async () => (
    (await tableLockCount('ImportedGamePly', 'ShareRowExclusiveLock', true)) >= 1
      && (await tableLockCount('ImportedGamePosition', 'ShareRowExclusiveLock', false)) >= 1
  ), 'cleanup to hold the ply lock while waiting for the position lock');

  unindexPromise = clearPlyRowsForGame(unindexFixture.game.id);
  gameDeletePromise = prisma.importedGame.delete({ where: { id: gameDeleteFixture.game.id } });
  accountDeletePromise = prisma.externalAccount.delete({ where: { id: accountDeleteFixture.account.id } });

  await waitFor(
    async () => (await tableLockCount('ImportedGamePly', 'RowExclusiveLock', false)) >= 1,
    'cascade/un-index writers to wait behind the cleanup ply lock',
  );

  releaseBlocker();
  releaseBlocker = undefined;
  await blockerPromise;
  blockerPromise = undefined;

  const [cleanupDidWork] = await settleWithin(
    Promise.all([
      cleanupPromise,
      unindexPromise,
      gameDeletePromise,
      accountDeletePromise,
    ]),
    'cleanup, un-index, game-delete, and account-delete writers to complete without deadlock',
  );
  cleanupPromise = undefined;
  unindexPromise = undefined;
  gameDeletePromise = undefined;
  accountDeletePromise = undefined;

  assert.equal(cleanupDidWork, true);
  assert.equal(await prisma.position.count({ where: { id: cleanupTarget.id } }), 0);
  assert.equal(
    await prisma.importedGamePly.count({ where: { importedGameId: unindexFixture.game.id } }),
    0,
  );
  assert.equal(await prisma.importedGame.count({ where: { id: gameDeleteFixture.game.id } }), 0);
  assert.equal(await prisma.externalAccount.count({ where: { id: accountDeleteFixture.account.id } }), 0);

  const afterDelete = await service.status(run.id);
  assert.equal(afterDelete.positionsDeleted, 1);
  assert.equal(await worker.runOnce(), true);
  assert.equal((await service.status(run.id)).status, 'COMPLETED');

  console.log('Position cleanup cascade-writer lock-graph tests passed.');
} finally {
  releaseBlocker?.();
  if (blockerPromise) await blockerPromise.catch(() => {});
  if (cleanupPromise) await cleanupPromise.catch(() => {});
  if (unindexPromise) await unindexPromise.catch(() => {});
  if (gameDeletePromise) await gameDeletePromise.catch(() => {});
  if (accountDeletePromise) await accountDeletePromise.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  if (createdPositionIds.length > 0) {
    await prisma.position.deleteMany({ where: { id: { in: createdPositionIds } } }).catch(() => {});
  }
  await cleanupClient.$disconnect();
  await blockerClient.$disconnect();
}
