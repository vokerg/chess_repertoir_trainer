import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountGameDataLifecycleService } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.service.js';
import { createAccountGameDataLifecycleWorker } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.worker.service.js';
import { AccountGameDataLifecycleCoordinatorRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.coordinator.repository.prisma.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const auditKeyring = new LifecycleHmacKeyring([{ version: 1, secret: `stop-boundary-${suffix}` }]);
const service = createAccountGameDataLifecycleService({ auditKeyring });
const operationIds = [];
let userId;

let secondBatchReachedResolve;
const secondBatchReached = new Promise((resolve) => { secondBatchReachedResolve = resolve; });
let releaseSecondBatchResolve;
const releaseSecondBatch = new Promise((resolve) => { releaseSecondBatchResolve = resolve; });
let blockedSecondBatch = false;

const coordinatorRepository = {
  ...AccountGameDataLifecycleCoordinatorRepository,
  async nextGameBatch(scope, afterGameId, limit) {
    const gameIds = await AccountGameDataLifecycleCoordinatorRepository.nextGameBatch(
      scope,
      afterGameId,
      limit,
    );
    if (!blockedSecondBatch && afterGameId !== null && gameIds.length > 0) {
      blockedSecondBatch = true;
      secondBatchReachedResolve();
      await releaseSecondBatch;
    }
    return gameIds;
  },
};

const worker = createAccountGameDataLifecycleWorker({
  coordinatorRepository,
  auditKeyring,
  logger: { info() {}, warn() {}, error() {} },
  config: {
    pollIntervalMs: 1,
    heartbeatIntervalMs: 60_000,
    staleAfterMs: 60_000,
    staleRecoveryIntervalMs: 60_000,
    shutdownTimeoutMs: 5_000,
    gameBatchLimit: 1,
  },
});

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-020 stop boundary race',
      authProvider: 'onb-020-stop-boundary',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `stop-${suffix}` },
  });
  const firstGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `first-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const secondGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `second-${suffix}`,
      pgn: '1. d4 d5',
    },
  });

  const preview = await service.preview(userId, {
    action: 'PURGE_ACCOUNT_DATA',
    accountId: account.id,
  });
  operationIds.push(preview.operationId);
  const credentials = {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `stop-boundary-${suffix}`,
  };
  const started = await service.execute(userId, preview.operationId, credentials);
  assert.equal(started.status, 'FENCING');

  assert.equal(await worker.runOnce(), true);
  assert.equal((await service.get(userId, preview.operationId)).status, 'WAITING_FOR_DRAIN');
  assert.equal(await worker.runOnce(), true);
  assert.equal((await service.get(userId, preview.operationId)).status, 'EXECUTING');

  assert.equal(await worker.runOnce(), true);
  const afterFirstBatch = await service.get(userId, preview.operationId);
  assert.equal(afterFirstBatch.status, 'EXECUTING');
  assert.ok(afterFirstBatch.firstDestructiveCommitAt);
  assert.equal(afterFirstBatch.checkpoint?.phase, 'PURGE_GAMES');
  assert.equal(afterFirstBatch.checkpoint?.afterGameId, firstGame.id);
  assert.equal(await prisma.importedGame.count({ where: { accountId: account.id } }), 1);
  assert.equal(await prisma.importedGame.count({ where: { id: secondGame.id } }), 1);

  const racingBatch = worker.runOnce();
  await secondBatchReached;

  const stopped = await service.requestStop(userId, preview.operationId);
  assert.equal(stopped.status, 'EXECUTING');
  assert.equal(stopped.stopRequest, 'STOP_AFTER_BATCH');

  releaseSecondBatchResolve();
  assert.equal(await racingBatch, true);

  const settled = await service.get(userId, preview.operationId);
  assert.equal(settled.status, 'NEEDS_ATTENTION');
  assert.equal(settled.stopRequest, 'STOP_AFTER_BATCH');
  assert.equal(settled.errorCode, 'DATA_LIFECYCLE_STOPPED_AFTER_BATCH');
  assert.equal(settled.checkpoint?.afterGameId, firstGame.id);
  assert.equal(await prisma.importedGame.count({ where: { accountId: account.id } }), 1);
  assert.equal(await prisma.importedGame.count({ where: { id: secondGame.id } }), 1);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.operationId, releasedAt: null },
    }),
    1,
  );

  console.log('Account/game lifecycle stop-boundary race test passed.');
} finally {
  releaseSecondBatchResolve?.();
  if (operationIds.length > 0) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userId !== undefined) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
