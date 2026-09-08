import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { replacePlyRowsForGame } from '../../dist/modules/imported-games/ply-index.repository.prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupRepository } from '../../dist/modules/position-cleanup/position-cleanup.repository.prisma.js';
import { createPositionCleanupService, POSITION_CLEANUP_EXECUTE_CONFIRMATION } from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
const cleanupClient = new PrismaClient();
const blockerClient = new PrismaClient();
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '10',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '10',
  POSITION_CLEANUP_LOCK_TIMEOUT_MS: '5000',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '10000',
});
const service = createPositionCleanupService({ config });
const cleanupRepository = createPositionCleanupRepository(cleanupClient);
const worker = createPositionCleanupWorker({
  config,
  repository: cleanupRepository,
  logger: { info() {}, warn() {}, error() {} },
});
const suffix = randomUUID();
const normalizedFens = [];
let userId;
let pauseTriggerInstalled = false;
let analysisHoldFunctionInstalled = false;
let writerFirstPromise;
let cleanupFirstPromise;
let cleanupFirstWriterPromise;
let analysisHoldPromise;

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

async function createFixture(label) {
  const account = await prisma.externalAccount.findFirst({ where: { userId } });
  assert.ok(account);
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-reindex-${label}-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const normalizedFen = `position-cleanup-reindex-${label}-${suffix}`;
  normalizedFens.push(normalizedFen);
  const positionKey = positionKeyForNormalizedFen(normalizedFen);
  const position = await prisma.position.create({
    data: {
      normalizedFen,
      positionKey: new Uint8Array(positionKey),
    },
  });
  return { game, position, normalizedFen, positionKey };
}

async function insertOldCandidate(positionId) {
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (${positionId}, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days')
    ON CONFLICT ("positionId") DO UPDATE SET
      "firstObservedOrphanAt" = EXCLUDED."firstObservedOrphanAt",
      "lastObservedOrphanAt" = EXCLUDED."lastObservedOrphanAt"
  `;
}

async function prepareExecuteRun(positionId, label) {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;
  await insertOldCandidate(positionId);
  const run = await service.create({
    mode: 'EXECUTE',
    requestedBy: `test:reindex-${label}`,
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
    if (current.phase === 'EVALUATE') {
      await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;
      await insertOldCandidate(positionId);
      return service.status(run.id);
    }
    assert.equal(['QUEUED', 'RUNNING'].includes(current.status), true);
    assert.equal(await worker.runOnce(), true);
  }
  throw new Error(`Cleanup run ${run.id} did not reach EVALUATE.`);
}

async function finishRun(runId) {
  for (let step = 0; step < 10; step += 1) {
    const current = await service.status(runId);
    if (current.status === 'COMPLETED') return current;
    assert.equal(await worker.runOnce(), true);
  }
  throw new Error(`Cleanup run ${runId} did not complete.`);
}

async function reindex(game, normalizedFen, positionKey) {
  return replacePlyRowsForGame(game.id, [{
    importedGameId: game.id,
    plyNumber: 1,
    moveUci: 'e2e4',
    normalizedFen,
    positionKey,
  }]);
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position cleanup reindex ${suffix}`,
      authProvider: 'position-cleanup-reindex-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'TEST',
      username: `position-cleanup-reindex-${suffix}`,
    },
  });

  // Writer-first: a test-only AFTER INSERT trigger sleeps after the production
  // candidate-reset trigger has run but before the writer transaction commits. Cleanup
  // must wait behind the writer's ordinary RowExclusive lock, then see the committed
  // reference and leave the Position intact.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION position_cleanup_test_pause_reindex()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_sleep(2.0);
      RETURN NULL;
    END;
    $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER "zz_PositionCleanup_test_pause_reindex"
    AFTER INSERT ON "ImportedGamePly"
    FOR EACH STATEMENT
    EXECUTE FUNCTION position_cleanup_test_pause_reindex()
  `);
  pauseTriggerInstalled = true;

  const writerFirst = await createFixture('writer-first');
  const writerFirstRun = await prepareExecuteRun(writerFirst.position.id, 'writer-first');
  writerFirstPromise = reindex(
    writerFirst.game,
    writerFirst.normalizedFen,
    writerFirst.positionKey,
  );

  await waitFor(
    async () => (await tableLockCount('ImportedGamePly', 'RowExclusiveLock', true)) >= 1,
    'writer-first reindex to hold its normal ply writer lock',
  );

  const writerFirstCleanupPromise = worker.runOnce();
  await waitFor(
    async () => (await tableLockCount('ImportedGamePly', 'ShareRowExclusiveLock', false)) >= 1,
    'cleanup to wait behind the existing reindex writer',
  );

  const writerFirstResult = await writerFirstPromise;
  writerFirstPromise = undefined;
  assert.equal(writerFirstResult.pliesIndexed, 1);
  assert.equal(await writerFirstCleanupPromise, true);
  const writerFirstCompleted = await service.status(writerFirstRun.id);
  assert.equal(writerFirstCompleted.status, 'COMPLETED');
  assert.equal(writerFirstCompleted.positionsDeleted, 0);
  assert.equal(await prisma.position.count({ where: { id: writerFirst.position.id } }), 1);
  assert.equal(await prisma.importedGamePly.count({ where: { importedGameId: writerFirst.game.id } }), 1);

  await prisma.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS "zz_PositionCleanup_test_pause_reindex" ON "ImportedGamePly"',
  );
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS position_cleanup_test_pause_reindex()');
  pauseTriggerInstalled = false;

  // Cleanup-first: a single database statement obtains an AccessExclusive analysis lock
  // and sleeps. Cleanup acquires the first two canonical locks before waiting on analysis;
  // production reindex then waits at its normal ply write boundary. When the database-side
  // gate returns, cleanup deletes the old orphan and reindex resumes without a retry loop,
  // recreating and referencing the shared Position.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION position_cleanup_test_hold_analysis_lock()
    RETURNS VOID
    LANGUAGE plpgsql
    AS $$
    BEGIN
      LOCK TABLE "PositionAnalysis" IN ACCESS EXCLUSIVE MODE;
      PERFORM pg_sleep(2.0);
    END;
    $$
  `);
  analysisHoldFunctionInstalled = true;

  const cleanupFirst = await createFixture('cleanup-first');
  const cleanupFirstRun = await prepareExecuteRun(cleanupFirst.position.id, 'cleanup-first');

  analysisHoldPromise = blockerClient.$executeRawUnsafe(
    'SELECT position_cleanup_test_hold_analysis_lock()',
  );
  await waitFor(
    async () => (await tableLockCount('PositionAnalysis', 'AccessExclusiveLock', true)) >= 1,
    'analysis lock gate to become active',
  );

  cleanupFirstPromise = worker.runOnce();
  await waitFor(async () => (
    (await tableLockCount('ImportedGamePly', 'ShareRowExclusiveLock', true)) >= 1
    && (await tableLockCount('ImportedGamePosition', 'ShareRowExclusiveLock', true)) >= 1
  ), 'cleanup to acquire the first two canonical table locks');

  cleanupFirstWriterPromise = reindex(
    cleanupFirst.game,
    cleanupFirst.normalizedFen,
    cleanupFirst.positionKey,
  );
  await waitFor(
    async () => (await tableLockCount('ImportedGamePly', 'RowExclusiveLock', false)) >= 1,
    'production reindex to wait behind cleanup',
  );

  await analysisHoldPromise;
  analysisHoldPromise = undefined;

  assert.equal(await cleanupFirstPromise, true);
  cleanupFirstPromise = undefined;
  const afterDeleteBatch = await service.status(cleanupFirstRun.id);
  assert.equal(afterDeleteBatch.positionsDeleted, 1);
  assert.equal(await prisma.position.count({ where: { id: cleanupFirst.position.id } }), 0);

  const cleanupFirstWriter = await cleanupFirstWriterPromise;
  cleanupFirstWriterPromise = undefined;
  assert.equal(cleanupFirstWriter.pliesIndexed, 1);
  const replacementPly = await prisma.importedGamePly.findUnique({
    where: {
      importedGameId_plyNumber: {
        importedGameId: cleanupFirst.game.id,
        plyNumber: 1,
      },
    },
    include: { position: true },
  });
  assert.ok(replacementPly);
  assert.notEqual(replacementPly.positionId, cleanupFirst.position.id, 'reindex should recreate the deleted shared Position');
  assert.equal(replacementPly.position.normalizedFen, cleanupFirst.normalizedFen);

  const cleanupFirstCompleted = await finishRun(cleanupFirstRun.id);
  assert.equal(cleanupFirstCompleted.status, 'COMPLETED');
  assert.equal(cleanupFirstCompleted.positionsDeleted, 1);

  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS position_cleanup_test_hold_analysis_lock()');
  analysisHoldFunctionInstalled = false;

  console.log('Position cleanup reindex interleaving tests passed.');
} finally {
  if (writerFirstPromise) await writerFirstPromise.catch(() => {});
  if (analysisHoldPromise) await analysisHoldPromise.catch(() => {});
  if (cleanupFirstPromise) await cleanupFirstPromise.catch(() => {});
  if (cleanupFirstWriterPromise) await cleanupFirstWriterPromise.catch(() => {});
  if (pauseTriggerInstalled) {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS "zz_PositionCleanup_test_pause_reindex" ON "ImportedGamePly"',
    ).catch(() => {});
    await prisma.$executeRawUnsafe(
      'DROP FUNCTION IF EXISTS position_cleanup_test_pause_reindex()',
    ).catch(() => {});
  }
  if (analysisHoldFunctionInstalled) {
    await prisma.$executeRawUnsafe(
      'DROP FUNCTION IF EXISTS position_cleanup_test_hold_analysis_lock()',
    ).catch(() => {});
  }
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  for (const normalizedFen of normalizedFens) {
    await prisma.position.deleteMany({ where: { normalizedFen } }).catch(() => {});
  }
  await cleanupClient.$disconnect();
  await blockerClient.$disconnect();
}
