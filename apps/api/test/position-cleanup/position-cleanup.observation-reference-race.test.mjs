import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupRepository } from '../../dist/modules/position-cleanup/position-cleanup.repository.prisma.js';
import { createPositionCleanupService } from '../../dist/modules/position-cleanup/position-cleanup.service.js';

const prisma = prismaModule.default;
const observerClient = new PrismaClient();
const writerClient = new PrismaClient();
const observerRepository = createPositionCleanupRepository(observerClient);
const suffix = randomUUID();
const advisoryKey = 260412;
let releaseGate;
const gateRelease = new Promise((resolve) => { releaseGate = resolve; });
let userId;
let positionId;
let pauseTriggerInstalled = false;

const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '1',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '1',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config, repository: observerRepository });

const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

async function waitFor(predicate, description) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await predicate()) return;
    await sleep(10);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function createTargetedRun() {
  const run = await service.create({ mode: 'DRY_RUN', requestedBy: 'test:observation-reference-race' });
  await observerClient.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "reconcileUpperBound" = 0,
        "positionUpperBound" = ${positionId},
        "observeAfterPositionId" = ${positionId - 1}
    WHERE "id" = ${run.id}
  `;
  const reconcileKey = `POSITION_CLEANUP:TEST:RECONCILE:${randomUUID()}`;
  assert.equal((await observerRepository.claimNext(reconcileKey))?.id, run.id);
  const reconcile = await observerRepository.reconcileBatch(run.id, reconcileKey);
  assert.equal(reconcile.completedPhase, true);
  assert.equal(await observerRepository.releaseClaim(run.id, reconcileKey), true);
  return run;
}

async function cancelRun(runId) {
  await observerRepository.requestCancel(runId);
  const cancelKey = `POSITION_CLEANUP:TEST:CANCEL:${randomUUID()}`;
  assert.equal((await observerRepository.claimNext(cancelKey))?.id, runId);
  assert.equal(await observerRepository.settleCancellation(runId, cancelKey), true);
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position cleanup race ${suffix}`,
      authProvider: 'position-cleanup-race-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `position-cleanup-race-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-race-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-race-${suffix}`,
    },
  });
  positionId = position.id;

  await observerClient.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION position_cleanup_test_pause_candidate()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      PERFORM pg_advisory_xact_lock(${advisoryKey});
      RETURN NEW;
    END;
    $$
  `);
  await observerClient.$executeRawUnsafe(`
    CREATE TRIGGER "PositionCleanupCandidate_test_pause_insert"
    BEFORE INSERT ON "PositionCleanupCandidate"
    FOR EACH ROW
    EXECUTE FUNCTION position_cleanup_test_pause_candidate()
  `);
  pauseTriggerInstalled = true;

  let gateReadyResolve;
  const gateReady = new Promise((resolve) => { gateReadyResolve = resolve; });
  const gatePromise = prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${advisoryKey})`;
    gateReadyResolve();
    await gateRelease;
  });
  await gateReady;

  const firstRun = await createTargetedRun();
  const observeKey = `POSITION_CLEANUP:TEST:OBSERVE:${randomUUID()}`;
  assert.equal((await observerRepository.claimNext(observeKey))?.id, firstRun.id);
  const observePromise = observerRepository.observeBatch(firstRun.id, observeKey);

  await waitFor(async () => {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count"
      FROM pg_locks
      WHERE "locktype" = 'advisory'
        AND "granted" = false
    `;
    return (rows[0]?.count ?? 0) >= 1;
  }, 'the observer to hold its Position row lock and pause in candidate insertion');

  const writerPromise = writerClient.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe("SET LOCAL application_name = 'position-cleanup-race-writer'");
    return transaction.importedGamePly.create({
      data: {
        importedGameId: game.id,
        positionId,
        plyNumber: 1,
        moveUci: 'e2e4',
      },
    });
  });

  await waitFor(async () => {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count"
      FROM pg_stat_activity
      WHERE "application_name" = 'position-cleanup-race-writer'
        AND "wait_event_type" = 'Lock'
    `;
    return (rows[0]?.count ?? 0) === 1;
  }, 'the concurrent ply writer to wait on the observed Position row');

  releaseGate();
  await gatePromise;
  const observed = await observePromise;
  assert.equal(observed.inspected, 1);
  assert.equal(observed.matched, 1);
  assert.equal(await observerRepository.releaseClaim(firstRun.id, observeKey), true);
  await writerPromise;

  assert.equal(
    await prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count"
      FROM "PositionCleanupCandidate"
      WHERE "positionId" = ${positionId}
    `.then((rows) => rows[0]?.count ?? 0),
    0,
    'the concurrent reference must reset the candidate after observation commits',
  );

  await cancelRun(firstRun.id);
  await prisma.importedGamePly.delete({
    where: { importedGameId_plyNumber: { importedGameId: game.id, plyNumber: 1 } },
  });
  const [{ dereferencedAt }] = await prisma.$queryRaw`SELECT clock_timestamp() AS "dereferencedAt"`;

  const secondRun = await createTargetedRun();
  const secondObserveKey = `POSITION_CLEANUP:TEST:OBSERVE:${randomUUID()}`;
  assert.equal((await observerRepository.claimNext(secondObserveKey))?.id, secondRun.id);
  const secondObservation = await observerRepository.observeBatch(secondRun.id, secondObserveKey);
  assert.equal(secondObservation.matched, 1);
  assert.equal(await observerRepository.releaseClaim(secondRun.id, secondObserveKey), true);

  const [candidate] = await prisma.$queryRaw`
    SELECT "firstObservedOrphanAt"
    FROM "PositionCleanupCandidate"
    WHERE "positionId" = ${positionId}
  `;
  assert.ok(candidate?.firstObservedOrphanAt instanceof Date);
  assert.equal(
    candidate.firstObservedOrphanAt >= dereferencedAt,
    true,
    'dereferencing after a transient reference must start a new grace clock',
  );

  await cancelRun(secondRun.id);
  console.log('Position cleanup observation/reference race tests passed.');
} finally {
  releaseGate?.();
  if (pauseTriggerInstalled) {
    await observerClient.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS "PositionCleanupCandidate_test_pause_insert" ON "PositionCleanupCandidate"',
    ).catch(() => {});
    await observerClient.$executeRawUnsafe(
      'DROP FUNCTION IF EXISTS position_cleanup_test_pause_candidate()',
    ).catch(() => {});
  }
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  if (positionId) await prisma.position.delete({ where: { id: positionId } }).catch(() => {});
  await observerClient.$disconnect();
  await writerClient.$disconnect();
}
