import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupService } from '../../dist/modules/position-cleanup/position-cleanup.service.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const prisma = prismaModule.default;
const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_INPUT_PAGE_SIZE: '10',
  POSITION_CLEANUP_DELETE_BATCH_SIZE: '10',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const service = createPositionCleanupService({ config });
const worker = createPositionCleanupWorker({
  config,
  logger: { info() {}, warn() {}, error() {} },
});
const suffix = randomUUID();
const normalizedFen = `position-cleanup-stale-candidate-${suffix}`;
let userId;
let positionId;

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position cleanup reconciliation ${suffix}`,
      authProvider: 'position-cleanup-reconciliation-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `position-cleanup-reconciliation-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-reconciliation-${suffix}`,
      pgn: '1. e4',
    },
  });
  const position = await prisma.position.create({
    data: {
      normalizedFen,
      positionKey: new Uint8Array(positionKeyForNormalizedFen(normalizedFen)),
    },
  });
  positionId = position.id;

  await prisma.importedGamePly.create({
    data: {
      importedGameId: game.id,
      positionId: position.id,
      plyNumber: 1,
      moveUci: 'e2e4',
    },
  });

  // Simulate legacy/adoption state that bypassed the authoritative trigger:
  // a stale candidate exists even though the position is currently referenced.
  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (
      ${position.id}, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'
    )
  `;

  const run = await service.create({
    mode: 'DRY_RUN',
    requestedBy: 'test:stale-candidate-reconciliation',
  });
  assert.equal(run.reconcileUpperBound, position.id);

  assert.equal(await worker.runOnce(), true);
  const afterReconcile = await service.status(run.id);
  assert.equal(afterReconcile.phase, 'RECONCILE');
  assert.equal(afterReconcile.reconcileAfterPositionId, position.id);
  assert.equal(afterReconcile.reconcileCandidatesInspected, 1);
  assert.equal(afterReconcile.candidatesReconciled, 1);
  assert.equal(afterReconcile.candidatesInspected, 0, 'evaluation counters must remain phase-exact');
  assert.equal(
    await prisma.positionCleanupCandidate.count({ where: { positionId: position.id } }),
    0,
    'bounded reconciliation must remove a stale candidate for a referenced position',
  );
  assert.equal(
    await prisma.importedGamePly.count({ where: { positionId: position.id } }),
    1,
    'reconciliation must leave the ownership reference intact',
  );
  assert.equal(
    await prisma.position.count({ where: { id: position.id } }),
    1,
    'reconciliation must never delete the referenced position',
  );

  await assert.rejects(
    prisma.position.delete({ where: { id: position.id } }),
    /Foreign key constraint|foreign key constraint|P2003/,
    'the existing ply foreign key must remain the final deletion backstop',
  );

  await service.cancel(run.id);
  assert.equal(await worker.runOnce(), true);
  const cancelled = await service.status(run.id);
  assert.equal(cancelled.status, 'CANCELLED');

  console.log('Position cleanup stale-candidate reconciliation tests passed.');
} finally {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  if (positionId) await prisma.position.delete({ where: { id: positionId } }).catch(() => {});
}
