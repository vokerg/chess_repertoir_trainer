import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { replacePlyRowsForGame } from '../../dist/modules/imported-games/ply-index.repository.prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupService, POSITION_CLEANUP_EXECUTE_CONFIRMATION } from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
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
const worker = createPositionCleanupWorker({ config, logger: { info() {}, warn() {}, error() {} } });
const suffix = randomUUID();
const pauseAdvisoryKey = 260413;
const originalPositionIds = [];
const normalizedFens = [];
let userId;
let pauseTriggerInstalled = false;
let releasePauseGate;
let pauseGatePromise;
let releaseAnalysisBlocker;
let analysisBlockerPromise;

const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

async function waitFor(predicate, description) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
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
  originalPositionIds.push(position.id);
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

  // Writer-first: pause the production reindex transaction after its ply INSERT and
  // cleanup-reset trigger. Cleanup must wait for the ordinary writer to commit, then
  // observe that the candidate was reset and leave the referenced Position intact.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION position_cleanup_test_pause_reindex()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_advisory_xact_lock(${pauseAdvisoryKey});
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

  let pauseGateReadyResolve;
  const pauseGateReady = new Promise((resolve) => { pauseGateReadyResolve = resolve; });
  const pauseGateRelease = new Promise((resolve) => { releasePauseGate = resolve; });
  pauseGatePromise = blockerClient.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${pauseAdvisoryKey})`;
    pauseGateReadyResolve();
    await pauseGateRelease;
  });
  await pauseGateReady;

  const writerFirst = await createFixture('writer-first');
  const writerFirstRun = await prepareExecuteRun(writerFirst.position.id, 'writer-first');
  const writerFirstPromise = reindex(
    writerFirst.game,
    writerFirst.normalizedFen,
    writerFirst.positionKey,
  );

  await waitFor(async () => {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count"
      FROM pg_locks
      WHERE "locktype" = 'advisory'
        AND "granted" = false
    `;
    return (rows[0]?.count ?? 0) >= 1;
  }, 'writer-first reindex to pause after reference insertion');

  const writerFirstCleanupPromise = worker.runOnce();
  await waitFor(
    async () => (await tableLockCount('ImportedGamePly', 'ShareRowExclusiveLock', false)) >= 1,
    'cleanup to wait behind the existing reindex writer',
  );

  releasePauseGate();
  await pauseGatePromise;
  pauseGatePromise = undefined;
  const writerFirstResult = await writerFirstPromise;
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

  // Cleanup-first: hold cleanup after it has acquired the first two canonical table
  // locks. Production reindex then waits at its normal ImportedGamePly write boundary.
  // Cleanup deletes the old orphan; reindex resumes and recreates the same keyed Position
  // before adding its reference, with no writer retry loop or deadlock handling.
  const cleanupFirst = await createFixture('cleanup-first');
  const cleanupFirstRun = await prepareExecuteRun(cleanupFirst.position.id, 'cleanup-first');

  let analysisBlockerReadyResolve;
  const analysisBlockerReady = new Promise((resolve) => { analysisBlockerReadyResolve = resolve; });
  const analysisBlockerRelease = new Promise((resolve) => { releaseAnalysisBlocker = resolve; });
  analysisBlockerPromise = blockerClient.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe('LOCK TABLE "PositionAnalysis" IN ACCESS EXCLUSIVE MODE');
    analysisBlockerReadyResolve();
    await analysisBlockerRelease;
  });
  await analysisBlockerReady;

  const cleanupFirstPromise = worker.runOnce();
  await waitFor(async () => (
    (await tableLockCount('ImportedGamePly', 'ShareRowExclusiveLock', true)) >= 1
    && (await tableLockCount('ImportedGamePosition', 'ShareRowExclusiveLock', true)) >= 1
  ), 'cleanup to acquire the first two canonical table locks');

  const cleanupFirstWriterPromise = reindex(
    cleanupFirst.game,
    cleanupFirst.normalizedFen,
    cleanupFirst.positionKey,
  );
  await waitFor(
    async () => (await tableLockCount('ImportedGamePly', 'RowExclusiveLock', false)) >= 1,
    'production reindex to wait behind cleanup',
  );

  releaseAnalysisBlocker();
  await analysisBlockerPromise;
  analysisBlockerPromise = undefined;

  assert.equal(await cleanupFirstPromise, true);
  const afterDeleteBatch = await service.status(cleanupFirstRun.id);
  assert.equal(afterDeleteBatch.positionsDeleted, 1);
  assert.equal(await prisma.position.count({ where: { id: cleanupFirst.position.id } }), 0);

  const cleanupFirstWriter = await cleanupFirstWriterPromise;
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

  console.log('Position cleanup reindex interleaving tests passed.');
} finally {
  releasePauseGate?.();
  releaseAnalysisBlocker?.();
  if (pauseGatePromise) await pauseGatePromise.catch(() => {});
  if (analysisBlockerPromise) await analysisBlockerPromise.catch(() => {});
  if (pauseTriggerInstalled) {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS "zz_PositionCleanup_test_pause_reindex" ON "ImportedGamePly"',
    ).catch(() => {});
    await prisma.$executeRawUnsafe(
      'DROP FUNCTION IF EXISTS position_cleanup_test_pause_reindex()',
    ).catch(() => {});
  }
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  for (const normalizedFen of normalizedFens) {
    await prisma.position.deleteMany({ where: { normalizedFen } }).catch(() => {});
  }
  await blockerClient.$disconnect();
}
