import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupRepository } from '../../dist/modules/position-cleanup/position-cleanup.repository.prisma.js';
import { createPositionCleanupService } from '../../dist/modules/position-cleanup/position-cleanup.service.js';

const prisma = prismaModule.default;
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const repositoryA = createPositionCleanupRepository(clientA);
const repositoryB = createPositionCleanupRepository(clientB);
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '1',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '1',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config, repository: repositoryA });
const suffix = randomUUID();
const positionIds = [];

function workKey(label) {
  return `POSITION_CLEANUP:TEST:${label}:${randomUUID()}`;
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  for (const label of ['first', 'second']) {
    const position = await prisma.position.create({
      data: {
        positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
        normalizedFen: `position-cleanup-recovery-${label}-${suffix}`,
      },
    });
    positionIds.push(position.id);
  }
  const [firstPositionId, secondPositionId] = positionIds;
  assert.ok(firstPositionId && secondPositionId && firstPositionId < secondPositionId);

  const run = await service.create({
    mode: 'DRY_RUN',
    requestedBy: 'test:lifecycle-recovery',
  });
  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "reconcileUpperBound" = 0,
        "positionUpperBound" = ${secondPositionId},
        "observeAfterPositionId" = ${firstPositionId - 1}
    WHERE "id" = ${run.id}
  `;

  const reconcileKey = workKey('RECONCILE');
  assert.equal((await repositoryA.claimNext(reconcileKey))?.id, run.id);
  const reconcile = await repositoryA.reconcileBatch(run.id, reconcileKey);
  assert.equal(reconcile.completedPhase, true);
  assert.equal(await repositoryA.releaseClaim(run.id, reconcileKey), true);

  const crashedKey = workKey('CRASHED');
  assert.equal((await repositoryA.claimNext(crashedKey))?.id, run.id);
  const firstBatch = await repositoryA.observeBatch(run.id, crashedKey);
  assert.equal(firstBatch.inspected, 1);
  assert.equal(firstBatch.matched, 1);
  assert.equal(firstBatch.checkpoint, firstPositionId);

  const afterFirstBatch = await repositoryA.getRun(run.id);
  assert.equal(afterFirstBatch?.observeAfterPositionId, firstPositionId);
  assert.equal(afterFirstBatch?.positionsInspected, 1);
  assert.equal(afterFirstBatch?.orphansObserved, 1);
  assert.equal(afterFirstBatch?.workKey, crashedKey);

  // Simulate a worker dying after its atomic batch commit but before claim release.
  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "heartbeatAt" = NOW() - INTERVAL '10 minutes'
    WHERE "id" = ${run.id}
  `;
  const staleBefore = new Date(Date.now() - 60_000);
  assert.equal(await repositoryB.recoverStaleClaims(staleBefore), 1);

  const recovered = await repositoryB.getRun(run.id);
  assert.equal(recovered?.status, 'RUNNING');
  assert.equal(recovered?.phase, 'OBSERVE');
  assert.equal(recovered?.workKey, null);
  assert.equal(recovered?.staleRecoveryCount, 1);
  assert.equal(recovered?.observeAfterPositionId, firstPositionId);
  assert.equal(recovered?.positionsInspected, 1);
  assert.equal(recovered?.orphansObserved, 1);
  assert.equal(await repositoryA.heartbeat(run.id, crashedKey), false, 'stale work key must stay fenced out');

  const resumedKey = workKey('RESUMED');
  assert.equal((await repositoryB.claimNext(resumedKey))?.id, run.id);
  assert.equal(await repositoryA.claimNext(workKey('DUPLICATE')), null, 'one live cleanup claim must remain global');
  const secondBatch = await repositoryB.observeBatch(run.id, resumedKey);
  assert.equal(secondBatch.inspected, 1);
  assert.equal(secondBatch.matched, 1);
  assert.equal(secondBatch.checkpoint, secondPositionId);
  assert.equal(await repositoryB.releaseClaim(run.id, resumedKey), true);

  const finishObserveKey = workKey('FINISH-OBSERVE');
  assert.equal((await repositoryB.claimNext(finishObserveKey))?.id, run.id);
  const finishObserve = await repositoryB.observeBatch(run.id, finishObserveKey);
  assert.equal(finishObserve.completedPhase, true);
  assert.equal(await repositoryB.releaseClaim(run.id, finishObserveKey), true);

  const beforeCancel = await repositoryB.getRun(run.id);
  assert.equal(beforeCancel?.phase, 'EVALUATE');
  assert.equal(beforeCancel?.positionsInspected, 2);
  assert.equal(beforeCancel?.orphansObserved, 2);

  const cancelRequested = await service.cancel(run.id);
  assert.ok(cancelRequested.cancelRequestedAt instanceof Date);
  const cancelKey = workKey('CANCEL');
  assert.equal((await repositoryB.claimNext(cancelKey))?.id, run.id);
  assert.equal(await repositoryB.settleCancellation(run.id, cancelKey), true);

  const cancelled = await repositoryB.getRun(run.id);
  assert.equal(cancelled?.status, 'CANCELLED');
  assert.equal(cancelled?.phase, 'DONE');
  assert.equal(cancelled?.terminalResult, 'CANCELLED');
  assert.equal(cancelled?.workKey, null);
  assert.equal(cancelled?.positionsInspected, 2, 'restart must not double-count the committed first page');
  assert.equal(cancelled?.orphansObserved, 2, 'restart must not skip the second page');
  assert.equal(cancelled?.staleRecoveryCount, 1);

  console.log('Position cleanup lifecycle recovery tests passed.');
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (positionIds.length > 0) {
    await prisma.position.deleteMany({ where: { id: { in: positionIds } } }).catch(() => {});
  }
  await clientA.$disconnect();
  await clientB.$disconnect();
}
