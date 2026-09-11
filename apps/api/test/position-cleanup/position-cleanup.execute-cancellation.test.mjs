import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import {
  createPositionCleanupService,
  POSITION_CLEANUP_EXECUTE_CONFIRMATION,
} from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '10',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '1',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config });
const worker = createPositionCleanupWorker({
  config,
  logger: { info() {}, warn() {}, error() {} },
});
const suffix = randomUUID();
const positionIds = [];

async function createPosition(label) {
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-cancel-${label}-${suffix}`,
    },
  });
  positionIds.push(position.id);
  return position;
}

async function insertOldCandidate(positionId) {
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (
      ${positionId}, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'
    )
  `;
}

async function runUntilEvaluate(runId) {
  for (let step = 0; step < 20; step += 1) {
    const current = await service.status(runId);
    if (current.phase === 'EVALUATE') return current;
    assert.equal(['QUEUED', 'RUNNING'].includes(current.status), true);
    assert.equal(await worker.runOnce(), true);
  }
  throw new Error(`Cleanup run ${runId} did not reach EVALUATE.`);
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const first = await createPosition('first');
  const second = await createPosition('second');
  await insertOldCandidate(first.id);
  await insertOldCandidate(second.id);

  const run = await service.create({
    mode: 'EXECUTE',
    requestedBy: 'test:execute-cancellation',
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  });
  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "reconcileUpperBound" = 0,
        "positionUpperBound" = ${second.id},
        "evaluationUpperBound" = ${second.id},
        "observeAfterPositionId" = ${first.id - 1}
    WHERE "id" = ${run.id}
  `;

  await runUntilEvaluate(run.id);

  assert.equal(await worker.runOnce(), true, 'the first delete batch should commit atomically');
  const afterFirstBatch = await service.status(run.id);
  assert.equal(afterFirstBatch.status, 'RUNNING');
  assert.equal(afterFirstBatch.positionsDeleted, 1);
  assert.equal(afterFirstBatch.evaluateAfterPositionId, first.id);
  assert.equal(await prisma.position.count({ where: { id: first.id } }), 0);
  assert.equal(await prisma.position.count({ where: { id: second.id } }), 1);

  const cancelRequested = await service.cancel(run.id);
  assert.ok(cancelRequested.cancelRequestedAt instanceof Date);
  assert.equal(await worker.runOnce(), true, 'cancellation should be acknowledged before another delete batch');

  const cancelled = await service.status(run.id);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.phase, 'DONE');
  assert.equal(cancelled.terminalResult, 'CANCELLED');
  assert.equal(cancelled.positionsDeleted, 1);
  assert.equal(cancelled.evaluateAfterPositionId, first.id);
  assert.equal(await prisma.position.count({ where: { id: second.id } }), 1);
  assert.equal(
    await prisma.positionCleanupCandidate.count({ where: { positionId: second.id } }),
    1,
    'the next eligible candidate must remain untouched after cancellation',
  );

  console.log('Position cleanup execute cancellation tests passed.');
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (positionIds.length > 0) {
    await prisma.position.deleteMany({ where: { id: { in: positionIds } } }).catch(() => {});
  }
}
