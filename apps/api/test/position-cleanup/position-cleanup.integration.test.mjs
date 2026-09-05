import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupService } from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { isPositionCleanupTerminal } from '../../dist/modules/position-cleanup/position-cleanup.types.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const positionIds = [];
let userId;
const silentLogger = { info() {}, warn() {}, error() {} };

async function createPosition(label) {
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-${label}-${suffix}`,
    },
  });
  positionIds.push(position.id);
  return position;
}

async function insertCandidate(positionId, observedAt) {
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (${positionId}, ${observedAt}, ${observedAt})
    ON CONFLICT ("positionId") DO UPDATE SET
      "firstObservedOrphanAt" = EXCLUDED."firstObservedOrphanAt",
      "lastObservedOrphanAt" = EXCLUDED."lastObservedOrphanAt"
  `;
}

async function candidateCount(ids) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "count"
    FROM "PositionCleanupCandidate"
    WHERE "positionId" IN (${Prisma.join(ids)})
  `;
  return rows[0]?.count ?? 0;
}

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position Cleanup ${suffix}`,
      authProvider: 'position-cleanup-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `position-cleanup-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-${suffix}`,
      pgn: '1. e4 e5 2. Nf3 Nc6',
    },
  });

  const oldObservedAt = new Date(Date.now() - 40 * 24 * 60 * 60_000);
  const p1 = await createPosition('insert-1');
  const p2 = await createPosition('insert-2');
  await insertCandidate(p1.id, oldObservedAt);
  await insertCandidate(p2.id, oldObservedAt);

  await prisma.importedGamePly.createMany({
    data: [
      { importedGameId: game.id, positionId: p1.id, plyNumber: 1, moveUci: 'e2e4' },
      { importedGameId: game.id, positionId: p2.id, plyNumber: 2, moveUci: 'e7e5' },
    ],
  });
  assert.equal(await candidateCount([p1.id, p2.id]), 0, 'multi-row INSERT trigger must reset all referenced candidates');

  const p3 = await createPosition('update');
  await insertCandidate(p3.id, oldObservedAt);
  await prisma.importedGamePly.update({
    where: { importedGameId_plyNumber: { importedGameId: game.id, plyNumber: 1 } },
    data: { positionId: p3.id },
  });
  assert.equal(await candidateCount([p3.id]), 0, 'UPDATE transition trigger must reset the new position candidate');

  const p4 = await createPosition('duplicate');
  await insertCandidate(p4.id, oldObservedAt);
  await prisma.importedGamePly.createMany({
    data: [
      { importedGameId: game.id, positionId: p4.id, plyNumber: 3, moveUci: 'g1f3' },
      { importedGameId: game.id, positionId: p4.id, plyNumber: 4, moveUci: 'b8c6' },
    ],
  });
  assert.equal(await candidateCount([p4.id]), 0, 'duplicate transition ids must remain idempotent');

  const p5 = await createPosition('rollback');
  await insertCandidate(p5.id, oldObservedAt);
  await assert.rejects(
    prisma.$transaction(async (transaction) => {
      await transaction.importedGamePly.create({
        data: { importedGameId: game.id, positionId: p5.id, plyNumber: 5, moveUci: 'f1b5' },
      });
      throw new Error('ROLLBACK_TRIGGER_TEST');
    }),
    /ROLLBACK_TRIGGER_TEST/,
  );
  assert.equal(await candidateCount([p5.id]), 1, 'reference write and trigger reset must roll back together');
  assert.equal(
    await prisma.importedGamePly.count({ where: { importedGameId: game.id, plyNumber: 5 } }),
    0,
  );

  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;
  const p6 = await createPosition('dry-run-eligible');
  await insertCandidate(p6.id, oldObservedAt);

  const config = loadPositionCleanupConfig({
    POSITION_CLEANUP_ENABLED: 'true',
    POSITION_CLEANUP_INPUT_PAGE_SIZE: '500',
    POSITION_CLEANUP_DELETE_BATCH_SIZE: '100',
    POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
    POSITION_CLEANUP_STALE_AFTER_MS: '5000',
  });
  const service = createPositionCleanupService({ config });
  const worker = createPositionCleanupWorker({ config, logger: silentLogger });
  const run = await service.create({ mode: 'DRY_RUN', requestedBy: 'test:position-cleanup' });

  for (let step = 0; step < 100; step += 1) {
    const current = await service.status(run.id);
    if (isPositionCleanupTerminal(current.status)) break;
    assert.equal(await worker.runOnce(), true);
  }

  const completed = await service.status(run.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.terminalResult, 'OBSERVATIONAL');
  assert.equal(completed.positionsDeleted, 0);
  assert.equal(completed.eligibleObserved >= 1, true);
  assert.equal(completed.observationStartedAt instanceof Date, true);
  assert.equal(completed.observationCompletedAt instanceof Date, true);
  assert.equal(completed.observationCompletedAt >= completed.observationStartedAt, true);
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  if (positionIds.length > 0) {
    await prisma.position.deleteMany({ where: { id: { in: positionIds } } }).catch(() => {});
  }
}
