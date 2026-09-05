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
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '4',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '4',
  POSITION_CLEANUP_LOCK_TIMEOUT_MS: '50',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config, repository });
const silentLogger = { info() {}, warn() {}, error() {} };
const worker = createPositionCleanupWorker({ config, repository, logger: silentLogger });
const suffix = randomUUID();
let positionId;
let releaseBlocker;
let blockerPromise;

async function runUntilPhase(runId, phase) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const run = await service.status(runId);
    if (run.phase === phase) return run;
    assert.equal(['QUEUED', 'RUNNING'].includes(run.status), true);
    assert.equal(await worker.runOnce(), true);
  }
  throw new Error(`Timed out advancing cleanup run ${runId} to ${phase}.`);
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-lock-timeout-${suffix}`,
    },
  });
  positionId = position.id;
  await prisma.positionAnalysis.create({
    data: {
      positionId,
      bestMoveUci: 'e2e4',
      bestScoreCpWhite: 10,
      lines: [],
    },
  });
  await prisma.mastersExplorerCache.create({
    data: {
      positionId,
      source: 'TEST',
      profileVersion: 1,
      sinceYear: 2000,
      untilYear: 2026,
      movesLimit: 10,
      topGamesLimit: 5,
      payload: {},
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (
      ${positionId}, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'
    )
  `;

  const created = await service.create({
    mode: 'EXECUTE',
    requestedBy: 'test:execute-lock-timeout',
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  });
  assert.equal(created.initialDeleteBatchSize, 4);
  assert.equal(created.deleteBatchSize, 4);

  await runUntilPhase(created.id, 'EVALUATE');
  const beforeTimeout = await service.status(created.id);
  assert.equal(beforeTimeout.evaluateAfterPositionId, 0);

  let blockerReadyResolve;
  const blockerReady = new Promise((resolve) => { blockerReadyResolve = resolve; });
  const blockerRelease = new Promise((resolve) => { releaseBlocker = resolve; });
  blockerPromise = blockerClient.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      'LOCK TABLE "ImportedGamePly" IN SHARE ROW EXCLUSIVE MODE',
    );
    blockerReadyResolve();
    await blockerRelease;
  });
  await blockerReady;

  assert.equal(await worker.runOnce(), true);
  const afterFirstTimeout = await service.status(created.id);
  assert.equal(afterFirstTimeout.status, 'RUNNING');
  assert.equal(afterFirstTimeout.phase, 'EVALUATE');
  assert.equal(afterFirstTimeout.evaluateAfterPositionId, 0);
  assert.equal(afterFirstTimeout.retryCount, 1);
  assert.equal(afterFirstTimeout.lockTimeoutStreak, 1);
  assert.equal(afterFirstTimeout.initialDeleteBatchSize, 4);
  assert.equal(afterFirstTimeout.deleteBatchSize, 4);
  assert.equal(afterFirstTimeout.errorCode, 'POSITION_CLEANUP_LOCK_TIMEOUT');

  assert.equal(await worker.runOnce(), true);
  const afterSecondTimeout = await service.status(created.id);
  assert.equal(afterSecondTimeout.status, 'RUNNING');
  assert.equal(afterSecondTimeout.phase, 'EVALUATE');
  assert.equal(afterSecondTimeout.evaluateAfterPositionId, 0);
  assert.equal(afterSecondTimeout.retryCount, 2);
  assert.equal(afterSecondTimeout.lockTimeoutStreak, 2);
  assert.equal(afterSecondTimeout.initialDeleteBatchSize, 4);
  assert.equal(afterSecondTimeout.deleteBatchSize, 2);

  releaseBlocker();
  await blockerPromise;
  blockerPromise = undefined;

  assert.equal(await worker.runOnce(), true);
  const afterSuccessfulBatch = await service.status(created.id);
  assert.equal(afterSuccessfulBatch.status, 'RUNNING');
  assert.equal(afterSuccessfulBatch.evaluateAfterPositionId, positionId);
  assert.equal(afterSuccessfulBatch.positionsDeleted, 1);
  assert.equal(afterSuccessfulBatch.analysisRowsDeleted, 1);
  assert.equal(afterSuccessfulBatch.cacheRowsDeleted, 1);
  assert.equal(afterSuccessfulBatch.lockTimeoutStreak, 0);
  assert.equal(afterSuccessfulBatch.initialDeleteBatchSize, 4);
  assert.equal(afterSuccessfulBatch.deleteBatchSize, 2, 'effective batch size must not grow automatically');
  assert.equal(afterSuccessfulBatch.errorCode, null);

  assert.equal(await worker.runOnce(), true);
  const completed = await service.status(created.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.terminalResult, 'EXECUTED');
  assert.equal(completed.retryCount, 2);
  assert.equal(completed.positionsDeleted, 1);
  assert.equal(completed.analysisRowsDeleted, 1);
  assert.equal(completed.cacheRowsDeleted, 1);

  assert.equal(await prisma.position.count({ where: { id: positionId } }), 0);
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId } }), 0);
  assert.equal(await prisma.mastersExplorerCache.count({ where: { positionId } }), 0);
  const candidateRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "count"
    FROM "PositionCleanupCandidate"
    WHERE "positionId" = ${positionId}
  `;
  assert.equal(candidateRows[0]?.count ?? 0, 0);

  console.log('Position cleanup execute lock-timeout tests passed.');
} finally {
  releaseBlocker?.();
  if (blockerPromise) await blockerPromise.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (positionId) await prisma.position.delete({ where: { id: positionId } }).catch(() => {});
  await cleanupClient.$disconnect();
  await blockerClient.$disconnect();
}
