import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { AccountGameDataLifecycleExecutionRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game-execution.repository.prisma.js';
import { createAccountGameDataLifecycleService } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.service.js';
import { createAccountGameDataLifecycleWorker } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.worker.service.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const keyring = new LifecycleHmacKeyring([{ version: 1, secret: `oauth-delete-${suffix}` }]);
const service = createAccountGameDataLifecycleService({ auditKeyring: keyring });
const workerConfig = {
  pollIntervalMs: 1,
  heartbeatIntervalMs: 1_000,
  staleAfterMs: 5_000,
  staleRecoveryIntervalMs: 5_000,
  shutdownTimeoutMs: 5_000,
  gameBatchLimit: 25,
};
const logger = { info() {}, warn() {}, error() {} };
let userId;
let operationId;

function createWorker(overrides = {}) {
  return createAccountGameDataLifecycleWorker({
    auditKeyring: keyring,
    logger,
    config: workerConfig,
    ...overrides,
  });
}

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-020 account deletion OAuth retention',
      authProvider: 'onb-020-account-delete-oauth',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `delete-oauth-${suffix}`,
    },
  });
  const connection = await prisma.lichessConnection.create({
    data: {
      userId: user.id,
      externalAccountId: account.id,
      lichessUserId: `lichess-${suffix}`,
      username: `oauth-${suffix}`,
      scopes: ['challenge:write'],
      accessTokenCiphertext: 'ciphertext',
      accessTokenIv: 'iv',
      accessTokenAuthTag: 'tag',
    },
  });

  const preview = await service.preview(user.id, {
    action: 'DELETE_EXTERNAL_ACCOUNT',
    accountId: account.id,
  });
  operationId = preview.operationId;
  const credentials = {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `delete-oauth-${suffix}`,
  };
  await service.execute(user.id, operationId, credentials);

  let failDeleteOnce = true;
  const failOnceExecutionRepository = {
    ...AccountGameDataLifecycleExecutionRepository,
    async deleteExternalAccount(transaction, scope) {
      if (failDeleteOnce) {
        failDeleteOnce = false;
        throw new Error('TEST_ACCOUNT_DELETE_PHASE_CRASH');
      }
      return AccountGameDataLifecycleExecutionRepository.deleteExternalAccount(transaction, scope);
    },
  };
  const failingWorker = createWorker({ executionRepository: failOnceExecutionRepository });

  let attention;
  for (let step = 0; step < 20; step += 1) {
    const current = await service.get(user.id, operationId);
    if (current.status === 'NEEDS_ATTENTION') {
      attention = current;
      break;
    }
    if (['FAILED', 'CANCELLED', 'EXPIRED', 'COMPLETED'].includes(current.status)) {
      assert.fail(`Account deletion settled unexpectedly as ${current.status}: ${current.errorCode}`);
    }
    assert.equal(await failingWorker.runOnce(), true);
  }

  attention ??= await service.get(user.id, operationId);
  assert.equal(attention.status, 'NEEDS_ATTENTION');
  assert.equal(attention.errorCode, 'TEST_ACCOUNT_DELETE_PHASE_CRASH');
  assert.ok(attention.firstDestructiveCommitAt);
  assert.equal(await prisma.externalAccount.count({ where: { id: account.id } }), 1);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({ where: { operationId, releasedAt: null } }),
    1,
    'failed account deletion retains its lifecycle fence',
  );
  assert.equal(
    await prisma.dataLifecycleAuditEvent.count({
      where: { operationId, eventType: 'ACCOUNT_DELETE_AGGREGATE_SNAPSHOT' },
    }),
    1,
    'the pre-delete audit snapshot is written before the failed delete attempt',
  );

  const resumed = await service.execute(user.id, operationId, credentials);
  assert.equal(resumed.status, 'EXECUTING');
  const resumedWorker = createWorker();
  for (let step = 0; step < 20; step += 1) {
    const operation = await service.get(user.id, operationId);
    if (operation.status === 'COMPLETED') break;
    if (['NEEDS_ATTENTION', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(operation.status)) {
      assert.fail(`Account deletion settled unexpectedly as ${operation.status}: ${operation.errorCode}`);
    }
    assert.equal(await resumedWorker.runOnce(), true);
  }

  const completed = await service.get(user.id, operationId);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(await prisma.externalAccount.count({ where: { id: account.id } }), 0);
  assert.equal(
    await prisma.dataLifecycleAuditEvent.count({
      where: { operationId, eventType: 'ACCOUNT_DELETE_AGGREGATE_SNAPSHOT' },
    }),
    1,
    'resuming ACCOUNT_DELETE must not duplicate its audit snapshot',
  );
  const retained = await prisma.lichessConnection.findUniqueOrThrow({ where: { id: connection.id } });
  assert.equal(retained.userId, user.id);
  assert.equal(retained.externalAccountId, null);
  assert.equal(retained.accessTokenCiphertext, 'ciphertext');

  console.log('Account deletion independent OAuth retention and audit idempotency tests passed.');
} finally {
  if (operationId !== undefined) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId !== undefined) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
