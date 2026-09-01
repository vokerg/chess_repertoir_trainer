import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountGameDataLifecycleService } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.service.js';
import { createAccountGameDataLifecycleWorker } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.worker.service.js';
import { AccountGameDataLifecycleExecutionRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game-execution.repository.prisma.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const auditKeyring = new LifecycleHmacKeyring([{ version: 1, secret: `verification-stop-${suffix}` }]);
const service = createAccountGameDataLifecycleService({ auditKeyring });
const operationIds = [];
let userId;

let verificationReachedResolve;
const verificationReached = new Promise((resolve) => { verificationReachedResolve = resolve; });
let releaseVerificationResolve;
const releaseVerification = new Promise((resolve) => { releaseVerificationResolve = resolve; });
let blockedVerification = false;

const executionRepository = {
  ...AccountGameDataLifecycleExecutionRepository,
  async verifyUnanalysed(scope) {
    const verification = await AccountGameDataLifecycleExecutionRepository.verifyUnanalysed(scope);
    if (!blockedVerification) {
      blockedVerification = true;
      verificationReachedResolve();
      await releaseVerification;
    }
    return verification;
  },
};

const worker = createAccountGameDataLifecycleWorker({
  executionRepository,
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
      displayName: 'ONB-020 verification stop race',
      authProvider: 'onb-020-verification-stop',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `verify-stop-${suffix}` },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `verify-stop-game-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    },
  });
  await prisma.importedGamePly.create({
    data: {
      importedGameId: game.id,
      positionId: position.id,
      plyNumber: 1,
      moveUci: 'e2e4',
      scoreLossCp: 50,
      classificationCode: 3,
    },
  });

  const preview = await service.preview(userId, {
    action: 'UNANALYSE_GAMES',
    accountId: account.id,
    gameIds: [game.id],
  });
  operationIds.push(preview.operationId);
  const started = await service.execute(userId, preview.operationId, {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `verification-stop-${suffix}`,
  });
  assert.equal(started.status, 'FENCING');

  assert.equal(await worker.runOnce(), true);
  assert.equal((await service.get(userId, preview.operationId)).status, 'WAITING_FOR_DRAIN');
  assert.equal(await worker.runOnce(), true);
  assert.equal((await service.get(userId, preview.operationId)).status, 'EXECUTING');
  assert.equal(await worker.runOnce(), true);

  const afterDestructiveBatch = await service.get(userId, preview.operationId);
  assert.equal(afterDestructiveBatch.status, 'EXECUTING');
  assert.ok(afterDestructiveBatch.firstDestructiveCommitAt);
  assert.equal(afterDestructiveBatch.checkpoint?.phase, 'UNANALYSE');

  assert.equal(await worker.runOnce(), true);
  assert.equal((await service.get(userId, preview.operationId)).status, 'VERIFYING');

  const racingVerification = worker.runOnce();
  await verificationReached;

  const stopped = await service.requestStop(userId, preview.operationId);
  assert.equal(stopped.status, 'VERIFYING');
  assert.equal(stopped.stopRequest, 'STOP_AFTER_BATCH');

  releaseVerificationResolve();
  assert.equal(await racingVerification, true);

  const settled = await service.get(userId, preview.operationId);
  assert.equal(settled.status, 'NEEDS_ATTENTION');
  assert.equal(settled.stopRequest, 'STOP_AFTER_BATCH');
  assert.equal(settled.errorCode, 'DATA_LIFECYCLE_STOPPED_AFTER_BATCH');
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.operationId, releasedAt: null },
    }),
    1,
    'a stop that wins before completion must retain the lifecycle fence',
  );

  const storedGame = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
  assert.equal(storedGame.id, game.id);
  const storedPly = await prisma.importedGamePly.findUniqueOrThrow({
    where: { importedGameId_plyNumber: { importedGameId: game.id, plyNumber: 1 } },
  });
  assert.equal(storedPly.scoreLossCp, null);
  assert.equal(storedPly.classificationCode, null);

  console.log('Account/game lifecycle verification-stop race test passed.');
} finally {
  releaseVerificationResolve?.();
  if (operationIds.length > 0) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userId !== undefined) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.position.deleteMany({ where: { id: position.id } }).catch(() => {});
  await prisma.$disconnect();
}
