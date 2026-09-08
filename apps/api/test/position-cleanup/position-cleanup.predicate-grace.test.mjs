import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupService, POSITION_CLEANUP_EXECUTE_CONFIRMATION } from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';
import { isPositionCleanupTerminal } from '../../dist/modules/position-cleanup/position-cleanup.types.js';

const prisma = prismaModule.default;
const nowMs = Date.parse('2026-09-07T04:00:00.000Z');
const cutoff = new Date(nowMs - 30 * 24 * 60 * 60_000);
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_GRACE_DAYS: '30',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '10',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '10',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config, now: () => nowMs });
const worker = createPositionCleanupWorker({ config, now: () => nowMs, logger: { info() {}, warn() {}, error() {} } });
const suffix = randomUUID();
const positionIds = [];

async function createPosition(label) {
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-grace-${label}-${suffix}`,
    },
  });
  positionIds.push(position.id);
  return position;
}

async function insertCandidate(positionId, firstObservedOrphanAt) {
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (${positionId}, ${firstObservedOrphanAt}, ${firstObservedOrphanAt})
  `;
}

async function targetRun(runId, firstPositionId, lastPositionId) {
  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "reconcileUpperBound" = ${lastPositionId},
        "positionUpperBound" = ${lastPositionId},
        "reconcileAfterPositionId" = ${firstPositionId - 1},
        "observeAfterPositionId" = ${firstPositionId - 1}
    WHERE "id" = ${runId}
  `;
}

async function runToTerminal(runId) {
  for (let step = 0; step < 30; step += 1) {
    const current = await service.status(runId);
    if (isPositionCleanupTerminal(current.status)) return current;
    assert.equal(await worker.runOnce(), true);
  }
  throw new Error(`Cleanup run ${runId} did not become terminal.`);
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const boundary = await createPosition('boundary');
  const tooNew = await createPosition('too-new');
  const analysisOnly = await createPosition('analysis-only');
  const cacheOnly = await createPosition('cache-only');
  const firstPositionId = boundary.id;
  const lastPositionId = cacheOnly.id;

  await prisma.positionAnalysis.create({
    data: {
      positionId: analysisOnly.id,
      bestMoveUci: 'e2e4',
      bestScoreCpWhite: 12,
      lines: [],
    },
  });
  await prisma.mastersExplorerCache.create({
    data: {
      positionId: cacheOnly.id,
      source: 'TEST',
      profileVersion: 1,
      sinceYear: 2000,
      untilYear: 2026,
      movesLimit: 10,
      topGamesLimit: 5,
      payload: {},
      fetchedAt: new Date(nowMs),
      expiresAt: new Date(nowMs + 60_000),
    },
  });

  await insertCandidate(boundary.id, cutoff);
  await insertCandidate(tooNew.id, new Date(cutoff.getTime() + 1));
  await insertCandidate(analysisOnly.id, new Date(cutoff.getTime() - 1));
  await insertCandidate(cacheOnly.id, new Date(cutoff.getTime() - 1));

  const dryRun = await service.create({ mode: 'DRY_RUN', requestedBy: 'test:predicate-grace-dry' });
  assert.equal(dryRun.graceCutoff.getTime(), cutoff.getTime());
  await targetRun(dryRun.id, firstPositionId, lastPositionId);
  const dryCompleted = await runToTerminal(dryRun.id);

  assert.equal(dryCompleted.status, 'COMPLETED');
  assert.equal(dryCompleted.terminalResult, 'OBSERVATIONAL');
  assert.equal(dryCompleted.eligibleObserved, 3, 'cutoff equality and older candidates must be dry-run eligible');
  assert.equal(dryCompleted.positionsDeleted, 0);
  assert.ok(dryCompleted.observationStartedAt instanceof Date);
  assert.ok(dryCompleted.observationCompletedAt instanceof Date);
  assert.equal(await prisma.position.count({ where: { id: { in: positionIds } } }), 4);

  const executeRun = await service.create({
    mode: 'EXECUTE',
    requestedBy: 'test:predicate-grace-execute',
    confirmation: POSITION_CLEANUP_EXECUTE_CONFIRMATION,
  });
  assert.equal(executeRun.graceCutoff.getTime(), cutoff.getTime());
  await targetRun(executeRun.id, firstPositionId, lastPositionId);
  const executeCompleted = await runToTerminal(executeRun.id);

  assert.equal(
    executeCompleted.status,
    'COMPLETED',
    `execute failed with errorCode=${executeCompleted.errorCode ?? 'none'}`,
  );
  assert.equal(executeCompleted.terminalResult, 'EXECUTED');
  assert.equal(executeCompleted.positionsDeleted, dryCompleted.eligibleObserved, 'execute must apply the same accepted grace/reference predicate as dry-run');
  assert.equal(executeCompleted.positionsDeleted, 3);
  assert.equal(executeCompleted.analysisRowsDeleted, 1);
  assert.equal(executeCompleted.cacheRowsDeleted, 1);

  assert.equal(await prisma.position.count({ where: { id: boundary.id } }), 0, 'candidate exactly at cutoff is eligible');
  assert.equal(await prisma.position.count({ where: { id: analysisOnly.id } }), 0, 'analysis-only position receives normal grace then cascades');
  assert.equal(await prisma.position.count({ where: { id: cacheOnly.id } }), 0, 'opening-cache-only position receives normal grace then cascades');
  assert.equal(await prisma.position.count({ where: { id: tooNew.id } }), 1, 'candidate one millisecond newer than cutoff is not eligible');
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId: analysisOnly.id } }), 0);
  assert.equal(await prisma.mastersExplorerCache.count({ where: { positionId: cacheOnly.id } }), 0);

  const [remainingCandidate] = await prisma.$queryRaw`
    SELECT "positionId", "firstObservedOrphanAt"
    FROM "PositionCleanupCandidate"
    WHERE "positionId" = ${tooNew.id}
  `;
  assert.equal(remainingCandidate?.positionId, tooNew.id);
  assert.equal(remainingCandidate?.firstObservedOrphanAt.getTime(), cutoff.getTime() + 1);

  console.log('Position cleanup predicate/grace tests passed.');
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (positionIds.length > 0) {
    await prisma.position.deleteMany({ where: { id: { in: positionIds } } }).catch(() => {});
  }
}
