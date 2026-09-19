import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupService } from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';
import { POSITION_CLEANUP_TABLE_LOCK_ORDER, isPositionCleanupTerminal } from '../../dist/modules/position-cleanup/position-cleanup.types.js';

const prisma = prismaModule.default;
const lockClient = new PrismaClient();
const lockBlockerClient = new PrismaClient();
const suffix = randomUUID();
const prefix = `position-cleanup-benchmark-${suffix}-`;
const fixtureSize = 5000;
const pageSize = 500;
const profileSizes = [10, 500, 5000];
const positionIds = [];
const workerEvents = [];
let userId;

const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_GRACE_DAYS: '30',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: String(pageSize),
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '100',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config });
const worker = createPositionCleanupWorker({
  config,
  logger: {
    info(context, message) { workerEvents.push({ level: 'info', context, message }); },
    warn(context, message) { workerEvents.push({ level: 'warn', context, message }); },
    error(context, message) { workerEvents.push({ level: 'error', context, message }); },
  },
});

function percentile(values, percentileValue) {
  assert.ok(values.length > 0);
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * ordered.length) - 1),
  );
  return ordered[index];
}

function assertCompletedProfile(completed, totalRows) {
  if (completed.status !== 'COMPLETED') {
    const diagnostic = {
      totalRows,
      run: {
        id: completed.id,
        mode: completed.mode,
        status: completed.status,
        phase: completed.phase,
        terminalResult: completed.terminalResult,
        errorCode: completed.errorCode,
        positionsInspected: completed.positionsInspected,
        candidatesInspected: completed.candidatesInspected,
        eligibleObserved: completed.eligibleObserved,
        observeAfterPositionId: completed.observeAfterPositionId,
        evaluateAfterPositionId: completed.evaluateAfterPositionId,
      },
      workerEvents,
    };
    console.error('POSITION_CLEANUP_BENCHMARK_FAILURE', JSON.stringify(diagnostic));
  }
  assert.equal(
    completed.status,
    'COMPLETED',
    `bounded profile ${totalRows} did not complete; status=${completed.status}, phase=${completed.phase}, errorCode=${completed.errorCode ?? 'none'}`,
  );
}

async function runProfile(firstPositionId, lastPositionId, totalRows) {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;
  workerEvents.length = 0;

  const run = await service.create({
    mode: 'DRY_RUN',
    requestedBy: `test:bounded-performance:${totalRows}`,
  });
  await prisma.$executeRaw`
    UPDATE "PositionCleanupRun"
    SET "reconcileUpperBound" = 0,
        "positionUpperBound" = ${lastPositionId},
        "observeAfterPositionId" = ${firstPositionId - 1}
    WHERE "id" = ${run.id}
  `;

  let previous = await service.status(run.id);
  const transactionDurationsMs = [];
  const observationPageSizes = [];
  const evaluationPageSizes = [];
  let agedCandidates = null;

  for (let step = 0; step < 80; step += 1) {
    if (isPositionCleanupTerminal(previous.status)) break;

    if (previous.phase === 'EVALUATE' && agedCandidates === null) {
      agedCandidates = await prisma.$executeRaw`
        UPDATE "PositionCleanupCandidate"
        SET "firstObservedOrphanAt" = ${new Date(Date.now() - 31 * 24 * 60 * 60_000)},
            "lastObservedOrphanAt" = GREATEST(
              "lastObservedOrphanAt",
              ${new Date(Date.now() - 31 * 24 * 60 * 60_000)}
            )
        WHERE "positionId" BETWEEN ${firstPositionId} AND ${lastPositionId}
          AND MOD("positionId" - ${firstPositionId}, 101) = 1
      `;
    }

    const startedAt = performance.now();
    assert.equal(await worker.runOnce(), true);
    const elapsedMs = performance.now() - startedAt;
    const current = await service.status(run.id);

    if (previous.phase === 'OBSERVE') {
      const inspected = current.positionsInspected - previous.positionsInspected;
      if (inspected > 0) {
        observationPageSizes.push(inspected);
        transactionDurationsMs.push(elapsedMs);
        assert.equal(inspected <= pageSize, true, 'observation must never inspect beyond the accepted input page');
      }
    }
    if (previous.phase === 'EVALUATE') {
      const inspected = current.candidatesInspected - previous.candidatesInspected;
      if (inspected > 0) {
        evaluationPageSizes.push(inspected);
        transactionDurationsMs.push(elapsedMs);
        assert.equal(inspected <= pageSize, true, 'evaluation must never inspect beyond the accepted input page');
      }
    }
    previous = current;
  }

  const completed = await service.status(run.id);
  assertCompletedProfile(completed, totalRows);
  assert.equal(completed.terminalResult, 'OBSERVATIONAL');
  assert.equal(completed.positionsInspected, totalRows);
  assert.equal(
    observationPageSizes.length,
    Math.ceil(totalRows / pageSize),
    'observation page count must derive from bounded input rows rather than matching-orphan count',
  );
  assert.equal(evaluationPageSizes.every((size) => size <= pageSize), true);
  assert.equal(completed.eligibleObserved, agedCandidates ?? 0);

  return {
    totalRows,
    observationPages: observationPageSizes.length,
    evaluationPages: evaluationPageSizes.length,
    eligibleObserved: completed.eligibleObserved,
    transactionP50Ms: Number(percentile(transactionDurationsMs, 50).toFixed(2)),
    transactionP90Ms: Number(percentile(transactionDurationsMs, 90).toFixed(2)),
  };
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position cleanup benchmark ${suffix}`,
      authProvider: 'position-cleanup-benchmark-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'TEST',
      username: `position-cleanup-benchmark-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-benchmark-${suffix}`,
      pgn: '1. e4 e5',
    },
  });

  await prisma.$executeRaw`
    INSERT INTO "ImportedGamePosition" ("positionKey", "normalizedFen")
    SELECT
      decode(md5(${prefix} || series::text), 'hex'),
      ${prefix} || series::text
    FROM generate_series(1, ${fixtureSize}) AS series
  `;
  const positions = await prisma.position.findMany({
    where: { normalizedFen: { startsWith: prefix } },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  assert.equal(positions.length, fixtureSize);
  positionIds.push(...positions.map((position) => position.id));

  const referencedPositions = positions.filter((_, index) => (index + 1) % 10 !== 0);
  const referenceWriteBatchSize = 500;
  for (let offset = 0; offset < referencedPositions.length; offset += referenceWriteBatchSize) {
    const batch = referencedPositions.slice(offset, offset + referenceWriteBatchSize);
    await prisma.importedGamePly.createMany({
      data: batch.map((position, index) => ({
        importedGameId: game.id,
        positionId: position.id,
        plyNumber: offset + index + 1,
        moveUci: 'e2e4',
      })),
    });
  }
  assert.equal(referencedPositions.length, 4500, 'benchmark fixture should leave only 10% of positions orphaned');

  const plans = await prisma.$queryRaw`
    EXPLAIN (FORMAT JSON)
    WITH input AS MATERIALIZED (
      SELECT "id"
      FROM "ImportedGamePosition"
      WHERE "id" > ${positionIds[0] - 1}
        AND "id" <= ${positionIds[positionIds.length - 1]}
      ORDER BY "id" ASC
      LIMIT ${pageSize}
    )
    SELECT COUNT(*)
    FROM input
    WHERE NOT EXISTS (
      SELECT 1
      FROM "ImportedGamePly" AS ply
      WHERE ply."positionId" = input."id"
    )
  `;
  const planText = JSON.stringify(plans);
  assert.match(planText, /"Node Type":"Limit"/, 'query plan must retain a Limit node before orphan filtering');

  const profileResults = [];
  for (const totalRows of profileSizes) {
    profileResults.push(await runProfile(
      positionIds[0],
      positionIds[totalRows - 1],
      totalRows,
    ));
  }

  const transactionP90Ms = Math.max(...profileResults.map((profile) => profile.transactionP90Ms));
  assert.equal(
    transactionP90Ms < 1000,
    true,
    `representative bounded transaction p90 must remain below 1000ms; observed ${transactionP90Ms}ms`,
  );

  const candidatePlans = await prisma.$queryRaw`
    EXPLAIN (FORMAT JSON)
    WITH input AS MATERIALIZED (
      SELECT "positionId", "firstObservedOrphanAt"
      FROM "PositionCleanupCandidate"
      WHERE "positionId" > ${positionIds[0] - 1}
        AND "positionId" <= ${positionIds[positionIds.length - 1]}
      ORDER BY "positionId" ASC
      LIMIT ${pageSize}
    )
    SELECT COUNT(*)
    FROM input
    WHERE "firstObservedOrphanAt" <= ${new Date(Date.now() - 30 * 24 * 60 * 60_000)}
      AND NOT EXISTS (
        SELECT 1
        FROM "ImportedGamePly" AS ply
        WHERE ply."positionId" = input."positionId"
      )
  `;
  const candidatePlanText = JSON.stringify(candidatePlans);
  assert.match(
    candidatePlanText,
    /"Node Type":"Limit"/,
    'candidate query plan must retain a Limit node before grace/reference filtering',
  );

  const lockDurationsMs = [];
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const startedAt = performance.now();
    await lockClient.$transaction(async (transaction) => {
      for (const table of POSITION_CLEANUP_TABLE_LOCK_ORDER) {
        await transaction.$executeRawUnsafe(
          `LOCK TABLE "${table}" IN SHARE ROW EXCLUSIVE MODE`,
        );
      }
    });
    lockDurationsMs.push(performance.now() - startedAt);
  }
  const lockP50Ms = Number(percentile(lockDurationsMs, 50).toFixed(2));
  const lockP90Ms = Number(percentile(lockDurationsMs, 90).toFixed(2));

  const lockWaitDurationsMs = [];
  for (let iteration = 0; iteration < 10; iteration += 1) {
    let releaseBlocker;
    let markBlockerReady;
    const blockerReady = new Promise((resolve) => { markBlockerReady = resolve; });
    const blockerRelease = new Promise((resolve) => { releaseBlocker = resolve; });
    const blocker = lockBlockerClient.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('LOCK TABLE "ImportedGamePly" IN ROW EXCLUSIVE MODE');
      markBlockerReady();
      await blockerRelease;
    });
    await blockerReady;

    const startedAt = performance.now();
    const waiter = lockClient.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe(
        "SET LOCAL application_name = 'position-cleanup-benchmark-waiter'",
      );
      for (const table of POSITION_CLEANUP_TABLE_LOCK_ORDER) {
        await transaction.$executeRawUnsafe(
          `LOCK TABLE "${table}" IN SHARE ROW EXCLUSIVE MODE`,
        );
      }
    });
    let waiterBlocked = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS "count"
        FROM pg_stat_activity
        WHERE "application_name" = 'position-cleanup-benchmark-waiter'
          AND "wait_event_type" = 'Lock'
      `;
      if ((rows[0]?.count ?? 0) === 1) {
        waiterBlocked = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(waiterBlocked, true, 'benchmark waiter must reach a real PostgreSQL lock wait');
    // Keep the observed lock hold short enough for the shared remote database
    // while still proving that the waiter reached PostgreSQL lock contention.
    await new Promise((resolve) => setTimeout(resolve, 5));
    releaseBlocker();
    await blocker;
    await waiter;
    lockWaitDurationsMs.push(performance.now() - startedAt);
  }
  const lockWaitP50Ms = Number(percentile(lockWaitDurationsMs, 50).toFixed(2));
  const lockWaitP90Ms = Number(percentile(lockWaitDurationsMs, 90).toFixed(2));
  assert.equal(
    lockWaitP90Ms < 250,
    true,
    `representative canonical lock-wait p90 must remain below 250ms; observed ${lockWaitP90Ms}ms`,
  );

  console.log('POSITION_CLEANUP_BENCHMARK', JSON.stringify({
    fixtureRows: fixtureSize,
    referencedRows: referencedPositions.length,
    pageSize,
    profiles: profileResults,
    transactionP90Ms,
    lockP50Ms,
    lockP90Ms,
    lockWaitP50Ms,
    lockWaitP90Ms,
    queryPlanContainsPreFilterLimit: true,
    candidateQueryPlanContainsPreFilterLimit: true,
  }));
  console.log('Position cleanup bounded performance tests passed.');
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  if (positionIds.length > 0) {
    await prisma.position.deleteMany({ where: { id: { in: positionIds } } }).catch(() => {});
  }
  await lockClient.$disconnect();
  await lockBlockerClient.$disconnect();
}
