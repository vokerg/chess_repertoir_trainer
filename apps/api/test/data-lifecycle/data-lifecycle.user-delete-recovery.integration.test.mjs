import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  createDeletedIdentityGuard,
} from '../../dist/modules/data-lifecycle/deleted-identity.guard.js';
import {
  LifecycleHmacKeyring,
} from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';
import {
  createUserDataLifecycleService,
} from '../../dist/modules/data-lifecycle/data-lifecycle.user.service.js';
import {
  createUserDataLifecycleWorker,
} from '../../dist/modules/data-lifecycle/data-lifecycle.user.worker.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const auditKeyring = new LifecycleHmacKeyring([
  { version: 1, secret: `user-delete-recovery-audit-${suffix}` },
]);
const identityKeyring = new LifecycleHmacKeyring([
  { version: 1, secret: `user-delete-recovery-identity-${suffix}` },
]);
const deletedIdentityGuard = createDeletedIdentityGuard(prisma, identityKeyring);
const service = createUserDataLifecycleService({
  auditKeyring,
  deletedIdentityGuard,
});
const workerConfig = {
  pollIntervalMs: 1,
  heartbeatIntervalMs: 1_000,
  staleAfterMs: 5_000,
  staleRecoveryIntervalMs: 5_000,
  shutdownTimeoutMs: 5_000,
  gameBatchLimit: 25,
};
const logger = { info() {}, warn() {}, error() {} };
const operationIds = [];
const userIds = [];

function freshWorker(lichessRevoker) {
  return createUserDataLifecycleWorker({
    deletedIdentityGuard,
    lichessRevoker,
    logger,
    config: workerConfig,
  });
}

async function runFreshWorker(lichessRevoker) {
  return freshWorker(lichessRevoker).runOnce();
}

async function readOperation(operationId) {
  return prisma.dataLifecycleOperation.findUniqueOrThrow({
    where: { id: operationId },
    select: {
      status: true,
      terminalResult: true,
      firstDestructiveCommitAt: true,
      checkpointJson: true,
      receiptTokenHash: true,
    },
  });
}

try {
  const resumableUser = await prisma.appUser.create({
    data: {
      displayName: 'ONB-021 resumable deletion',
      authProvider: 'onb-021-recovery',
      authSubject: `subject-${suffix}`,
    },
  });
  userIds.push(resumableUser.id);
  await prisma.course.createMany({
    data: Array.from({ length: 30 }, (_, index) => ({
      userId: resumableUser.id,
      name: `Bounded deletion course ${index + 1}`,
    })),
  });

  const preview = await service.preview(resumableUser.id, { action: 'DELETE_APP_USER' });
  operationIds.push(preview.operationId);
  const credentials = {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `recovery-${suffix}`,
  };
  const firstExecute = await service.execute(resumableUser.id, preview.operationId, credentials);
  assert.ok(firstExecute.receiptToken);

  const failingRevoker = {
    async revokeUpstreamForUser() {
      throw new Error('ONB_021_FORCED_REVOCATION_FAILURE');
    },
  };
  const successfulRevoker = {
    async revokeUpstreamForUser() {
      return { attempted: false, revoked: false };
    },
  };

  let reachedCourses = false;
  for (let step = 0; step < 60; step += 1) {
    const operation = await readOperation(preview.operationId);
    if (operation.status === 'EXECUTING' && operation.checkpointJson?.phase === 'COURSES') {
      reachedCourses = true;
      break;
    }
    assert.ok(
      !['FAILED', 'CANCELLED', 'EXPIRED', 'NEEDS_ATTENTION'].includes(operation.status),
      `unexpected pre-course status ${operation.status}`,
    );
    assert.equal(await runFreshWorker(failingRevoker), true);
  }
  assert.equal(reachedCourses, true, 'worker should persistently advance to the bounded course phase');
  assert.equal(await prisma.course.count({ where: { userId: resumableUser.id } }), 30);

  assert.equal(await runFreshWorker(failingRevoker), true);
  assert.equal(
    await prisma.course.count({ where: { userId: resumableUser.id } }),
    5,
    'one residual transaction must delete no more than gameBatchLimit rows',
  );
  const afterFirstBatch = await readOperation(preview.operationId);
  assert.ok(afterFirstBatch.firstDestructiveCommitAt);

  let needsAttention = false;
  for (let step = 0; step < 20; step += 1) {
    const operation = await readOperation(preview.operationId);
    if (operation.status === 'NEEDS_ATTENTION') {
      needsAttention = true;
      break;
    }
    assert.equal(await runFreshWorker(failingRevoker), true);
  }
  assert.equal(needsAttention, true, 'a post-mutation failure should require explicit resume');
  const failedAfterMutation = await readOperation(preview.operationId);
  assert.equal(failedAfterMutation.terminalResult, 'NEEDS_ATTENTION');
  assert.ok(failedAfterMutation.firstDestructiveCommitAt);
  assert.equal(await prisma.appUser.count({ where: { id: resumableUser.id } }), 1);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.operationId, resourceType: 'USER', releasedAt: null },
    }),
    1,
    'partial deletion must retain the USER fence',
  );

  const resumed = await service.execute(resumableUser.id, preview.operationId, credentials);
  assert.equal(resumed.status, 'EXECUTING');
  assert.equal(resumed.receiptToken, firstExecute.receiptToken);

  for (let step = 0; step < 40; step += 1) {
    const status = await service.getByReceipt(firstExecute.receiptToken);
    if (status?.status === 'COMPLETED') break;
    assert.ok(status);
    assert.ok(
      !['FAILED', 'CANCELLED', 'EXPIRED', 'NEEDS_ATTENTION'].includes(status.status),
      `unexpected resumed status ${status.status}`,
    );
    assert.equal(await runFreshWorker(successfulRevoker), true);
  }
  const completed = await service.getByReceipt(firstExecute.receiptToken);
  assert.equal(completed?.status, 'COMPLETED');
  assert.equal(await prisma.appUser.count({ where: { id: resumableUser.id } }), 0);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.operationId, releasedAt: null },
    }),
    0,
  );

  const blockedUser = await prisma.appUser.create({
    data: {
      displayName: 'ONB-021 legacy drain blocker',
      authProvider: 'onb-021-legacy-blocker',
      authSubject: `legacy-${suffix}`,
    },
  });
  userIds.push(blockedUser.id);
  const blockedAccount = await prisma.externalAccount.create({
    data: {
      userId: blockedUser.id,
      provider: 'LICHESS',
      username: `legacy-${suffix}`,
    },
  });
  await prisma.importRun.create({
    data: {
      userId: blockedUser.id,
      accountId: blockedAccount.id,
      provider: 'LICHESS',
      mode: 'LEGACY_SYNC',
      status: 'RUNNING',
      workKey: `legacy-work-${suffix}`,
    },
  });

  const blockedPreview = await service.preview(blockedUser.id, { action: 'DELETE_APP_USER' });
  operationIds.push(blockedPreview.operationId);
  const blockedExecute = await service.execute(blockedUser.id, blockedPreview.operationId, {
    previewToken: blockedPreview.previewToken,
    confirmationPhrase: blockedPreview.confirmationPhrase,
    idempotencyKey: `legacy-blocked-${suffix}`,
  });
  assert.ok(blockedExecute.receiptToken);

  assert.equal(await runFreshWorker(successfulRevoker), true);
  assert.equal((await readOperation(blockedPreview.operationId)).status, 'WAITING_FOR_DRAIN');
  assert.equal(await runFreshWorker(successfulRevoker), true);

  const failedBeforeMutation = await readOperation(blockedPreview.operationId);
  assert.equal(failedBeforeMutation.status, 'FAILED');
  assert.equal(failedBeforeMutation.terminalResult, 'FAILED_BEFORE_MUTATION');
  assert.equal(failedBeforeMutation.firstDestructiveCommitAt, null);
  assert.equal(await prisma.appUser.count({ where: { id: blockedUser.id } }), 1);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: blockedPreview.operationId, releasedAt: null },
    }),
    0,
    'pre-mutation failure must release its fence',
  );

  console.log('Whole-user deletion restart, bounded batch, and failure-boundary tests passed.');
} finally {
  for (const operationId of operationIds) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  for (const userId of userIds) {
    await prisma.oAuthLoginState.deleteMany({ where: { userId } });
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
