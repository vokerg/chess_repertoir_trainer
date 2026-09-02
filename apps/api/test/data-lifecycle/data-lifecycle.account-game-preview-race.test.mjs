import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { createAccountGameDataLifecycleService } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.service.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const writer = new PrismaClient();
const suffix = randomUUID();
const keyring = new LifecycleHmacKeyring([{ version: 1, secret: `preview-race-${suffix}` }]);
const service = createAccountGameDataLifecycleService({ auditKeyring: keyring });
let userId;
let operationId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-020 preview fence race',
      authProvider: 'onb-020-preview-race',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preview-race-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `preview-race-${suffix}`,
      pgn: '1. e4 e5',
    },
  });

  const preview = await service.preview(user.id, {
    action: 'UNANALYSE_GAMES',
    accountId: account.id,
    gameIds: [game.id],
  });
  operationId = preview.operationId;
  assert.equal(preview.previewCounts.analysisRuns, 0);

  let releaseWriterLock;
  let writerLockAcquired;
  const writerReady = new Promise((resolve) => { writerLockAcquired = resolve; });
  const releaseWriter = new Promise((resolve) => { releaseWriterLock = resolve; });

  const writerTransaction = writer.$transaction(async (transaction) => {
    await transaction.$queryRawUnsafe(
      'SELECT 1 AS locked FROM pg_advisory_xact_lock(17000259, $1::integer)',
      user.id,
    );
    await transaction.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'COMPLETED',
        positionsTotal: 0,
        positionsDone: 0,
        completedAt: new Date(),
      },
    });
    writerLockAcquired();
    await releaseWriter;
  });
  await writerReady;

  let executeSettled = false;
  const executePromise = service.execute(user.id, operationId, {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `preview-race-${suffix}`,
  }).then(
    (value) => {
      executeSettled = true;
      return { status: 'fulfilled', value };
    },
    (reason) => {
      executeSettled = true;
      return { status: 'rejected', reason };
    },
  );

  await new Promise((resolve) => setTimeout(resolve, 75));
  assert.equal(
    executeSettled,
    false,
    'execution must wait while a pre-fence writer owns the lifecycle user lock',
  );

  releaseWriterLock();
  await writerTransaction;
  const execution = await executePromise;
  assert.equal(execution.status, 'rejected');
  assert.equal(execution.reason?.code, 'DATA_LIFECYCLE_PREVIEW_INVALID');

  const persisted = await prisma.dataLifecycleOperation.findUniqueOrThrow({
    where: { id: operationId },
  });
  assert.equal(persisted.status, 'PREVIEWED');
  assert.equal(persisted.idempotencyKeyHash, null);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId, releasedAt: null },
    }),
    0,
    'a stale preview must be rejected before any lifecycle fence is persisted',
  );
  assert.equal(
    await prisma.gameAnalysisRun.count({ where: { importedGameId: game.id } }),
    1,
    'the writer that acquired the lifecycle lock first commits before the stale preview is rejected',
  );

  console.log('Account/game stale-preview fence race tests passed.');
} finally {
  if (operationId !== undefined) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId !== undefined) await prisma.appUser.deleteMany({ where: { id: userId } });
  await writer.$disconnect();
  await prisma.$disconnect();
}
