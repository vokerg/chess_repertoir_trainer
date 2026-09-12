import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
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
const repository = createPositionCleanupRepository(cleanupClient);
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '1',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '1',
  POSITION_CLEANUP_LOCK_TIMEOUT_MS: '100',
  POSITION_CLEANUP_POLL_INTERVAL_MS: '1',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config, repository });
const worker = createPositionCleanupWorker({
  config,
  repository,
  logger: { info() {}, warn() {}, error() {} },
});
const suffix = randomUUID();
let positionId;
let releaseBlocker;
let blockerPromise;
let thirdAttemptPromise;

const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

async function waitFor(predicate, description) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await predicate()) return;
    await sleep(5);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function waitingCleanupLockCount() {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "count"
    FROM pg_locks AS locks
    JOIN pg_class AS relation ON relation.oid = locks.relation
    WHERE relation.relname = 'ImportedGamePly'
      AND locks.mode = 'ShareRowExclusiveLock'
      AND locks.granted = false
  `;
  return rows[0]?.count ?? 0;
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-timeout-cancel-${suffix}`,
    },
  });
  positionId = position.id;

  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (
      ${position.id}, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'
    )
  `;

  const run = await service.create({
    mode: 'EXECUTE',
    requestedBy: 'test:timeout-cancellation-race',
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  });

  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "phase" = 'EVALUATE',
        "reconcileUpperBound" = 0,
        "positionUpperBound" = ${position.id},
        "evaluationUpperBound" = ${position.id},
        "evaluateAfterPositionId" = 0
    WHERE "id" = ${run.id}
  `;

  let markBlockerReady;
  const blockerReady = new Promise((resolve) => { markBlockerReady = resolve; });
  const blockerRelease = new Promise((resolve) => { releaseBlocker = resolve; });
  blockerPromise = blockerClient.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      'LOCK TABLE "ImportedGamePly" IN SHARE ROW EXCLUSIVE MODE',
    );
    markBlockerReady();
    await blockerRelease;
  });
  await blockerReady;

  assert.equal(await worker.runOnce(), true);
  let current = await service.status(run.id);
  assert.equal(current.status, 'RUNNING');
  assert.equal(current.retryCount, 1);
  assert.equal(current.lockTimeoutStreak, 1);
  assert.equal(current.evaluateAfterPositionId, 0);

  assert.equal(await worker.runOnce(), true);
  current = await service.status(run.id);
  assert.equal(current.status, 'RUNNING');
  assert.equal(current.retryCount, 2);
  assert.equal(current.lockTimeoutStreak, 2);
  assert.equal(current.evaluateAfterPositionId, 0);

  thirdAttemptPromise = worker.runOnce();
  await waitFor(
    async () => (await waitingCleanupLockCount()) >= 1,
    'third cleanup attempt to wait on the ply table lock',
  );

  const cancellation = await service.cancel(run.id);
  assert.ok(cancellation.cancelRequestedAt instanceof Date);

  assert.equal(await thirdAttemptPromise, true);
  thirdAttemptPromise = undefined;

  const cancelled = await service.status(run.id);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.phase, 'DONE');
  assert.equal(cancelled.terminalResult, 'CANCELLED');
  assert.equal(cancelled.retryCount, 2, 'cancellation must win before the third timeout is accounted');
  assert.equal(cancelled.lockTimeoutStreak, 2);
  assert.equal(cancelled.evaluateAfterPositionId, 0);
  assert.equal(cancelled.positionsDeleted, 0);
  assert.equal(await prisma.position.count({ where: { id: position.id } }), 1);
  assert.equal(
    await prisma.positionCleanupCandidate.count({ where: { positionId: position.id } }),
    1,
  );

  console.log('Position cleanup lock-timeout cancellation race tests passed.');
} finally {
  releaseBlocker?.();
  if (blockerPromise) await blockerPromise.catch(() => {});
  if (thirdAttemptPromise) await thirdAttemptPromise.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (positionId) await prisma.position.delete({ where: { id: positionId } }).catch(() => {});
  await cleanupClient.$disconnect();
  await blockerClient.$disconnect();
}
