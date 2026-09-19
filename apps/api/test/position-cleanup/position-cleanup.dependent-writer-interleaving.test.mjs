import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import {
  findOrCreatePositionByFen,
  upsertPositionAnalysis,
} from '../../dist/modules/analysis/analysis.repository.prisma.js';
import { upsertOpeningExplorerCache } from '../../dist/modules/opening-explorer/opening-explorer.repository.prisma.js';
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
const targetFen = `position-cleanup-dependent-writer-target-${suffix}`;
const analysisFen = '8/8/8/8/8/8/4K3/7k w - - 0 1';
const openingFen = '8/8/8/8/8/8/3K4/7k w - - 0 1';
const normalizedOpeningFen = normalizeFenForPosition(openingFen);
let targetPositionId;
let analysisPositionId;
let releaseBlocker;
let blockerPromise;
let cleanupPromise;
let openingWriterPromise;

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
    requestedBy: 'test:dependent-writer-lock-graph',
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

  const targetPosition = await prisma.position.create({
    data: {
      normalizedFen: targetFen,
      positionKey: new Uint8Array(positionKeyForNormalizedFen(targetFen)),
    },
  });
  targetPositionId = targetPosition.id;

  const analysisPosition = await findOrCreatePositionByFen(analysisFen);
  analysisPositionId = analysisPosition.id;

  const run = await prepareExecuteRun(targetPosition.id);

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

  const analysisWrite = await settleWithin(
    upsertPositionAnalysis(analysisPosition.id, {
      fen: analysisFen,
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 12,
      lines: [],
    }),
    'analysis writer while cleanup waits for the position lock',
  );
  assert.equal(analysisWrite.positionId, analysisPosition.id);
  assert.equal(
    (await tableLockCount('ImportedGamePosition', 'ShareRowExclusiveLock', false)) >= 1,
    true,
    'cleanup must still be waiting when the independent analysis write completes',
  );

  openingWriterPromise = upsertOpeningExplorerCache({
    normalizedFen: normalizedOpeningFen,
    source: 'LICHESS_MASTERS',
    profileVersion: 1,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 15,
    payload: {
      opening: null,
      games: { total: 0, whiteWins: 0, draws: 0, blackWins: 0 },
      moves: [],
      topGames: [],
    },
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  });

  await sleep(50);
  assert.equal(
    (await tableLockCount('ImportedGamePly', 'ShareRowExclusiveLock', true)) >= 1,
    true,
    'cleanup must retain its first canonical lock while the opening writer is concurrent',
  );

  releaseBlocker();
  releaseBlocker = undefined;
  await blockerPromise;
  blockerPromise = undefined;

  const [cleanupDidWork, openingWrite] = await settleWithin(
    Promise.all([cleanupPromise, openingWriterPromise]),
    'cleanup and opening-explorer writer to complete without deadlock',
  );
  cleanupPromise = undefined;
  openingWriterPromise = undefined;
  assert.equal(cleanupDidWork, true);
  assert.equal(openingWrite.normalizedFen, normalizedOpeningFen);

  const afterDelete = await service.status(run.id);
  assert.equal(afterDelete.positionsDeleted, 1);
  assert.equal(await prisma.position.count({ where: { id: targetPosition.id } }), 0);
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId: analysisPosition.id } }), 1);
  assert.equal(
    await prisma.mastersExplorerCache.count({ where: { positionId: openingWrite.positionId } }),
    1,
  );

  assert.equal(await worker.runOnce(), true);
  const completed = await service.status(run.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.terminalResult, 'EXECUTED');

  console.log('Position cleanup dependent-writer lock-graph tests passed.');
} finally {
  releaseBlocker?.();
  if (blockerPromise) await blockerPromise.catch(() => {});
  if (cleanupPromise) await cleanupPromise.catch(() => {});
  if (openingWriterPromise) await openingWriterPromise.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  await prisma.mastersExplorerCache.deleteMany({
    where: { position: { normalizedFen: normalizedOpeningFen } },
  }).catch(() => {});
  await prisma.positionAnalysis.deleteMany({
    where: { positionId: analysisPositionId ?? -1 },
  }).catch(() => {});
  await prisma.position.deleteMany({
    where: {
      OR: [
        { normalizedFen: targetFen },
        { normalizedFen: normalizeFenForPosition(analysisFen) },
        { normalizedFen: normalizedOpeningFen },
      ],
    },
  }).catch(() => {});
  await cleanupClient.$disconnect();
  await blockerClient.$disconnect();
}
