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
  { version: 1, secret: `user-delete-cancel-audit-${suffix}` },
]);
const identityKeyring = new LifecycleHmacKeyring([
  { version: 1, secret: `user-delete-cancel-identity-${suffix}` },
]);
const deletedIdentityGuard = createDeletedIdentityGuard(prisma, identityKeyring);
const service = createUserDataLifecycleService({
  auditKeyring,
  deletedIdentityGuard,
});
const worker = createUserDataLifecycleWorker({
  deletedIdentityGuard,
  lichessRevoker: {
    async revokeUpstreamForUser() {
      assert.fail('Lichess revocation must not run before the first empty residual phase.');
    },
  },
  logger: { info() {}, warn() {}, error() {} },
  config: {
    pollIntervalMs: 1,
    heartbeatIntervalMs: 1_000,
    staleAfterMs: 5_000,
    staleRecoveryIntervalMs: 5_000,
    shutdownTimeoutMs: 5_000,
    gameBatchLimit: 25,
  },
});

let userId;
let operationId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-021 empty residual cancellation',
      authProvider: 'onb-021-cancel-noop',
      authSubject: `subject-${suffix}`,
    },
  });
  userId = user.id;

  const preview = await service.preview(user.id, { action: 'DELETE_APP_USER' });
  operationId = preview.operationId;
  const execute = await service.execute(user.id, operationId, {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `delete-user-cancel-${suffix}`,
  });
  assert.ok(execute.receiptToken);

  assert.equal(await worker.runOnce(), true, 'FENCING should advance to drain');
  assert.equal(await worker.runOnce(), true, 'drain should advance to execution');
  assert.equal(await worker.runOnce(), true, 'empty account scan should advance to residual work');
  assert.equal(await worker.runOnce(), true, 'empty residual phase should advance without mutation');

  const beforeStop = await prisma.dataLifecycleOperation.findUniqueOrThrow({
    where: { id: operationId },
    select: {
      status: true,
      firstDestructiveCommitAt: true,
      checkpointJson: true,
    },
  });
  assert.equal(beforeStop.status, 'EXECUTING');
  assert.equal(
    beforeStop.firstDestructiveCommitAt,
    null,
    'an empty residual phase must not create the first destructive commit marker',
  );
  assert.equal(beforeStop.checkpointJson?.phase, 'TRAINING_SESSIONS');

  const stop = await service.requestStopByReceipt(operationId, execute.receiptToken);
  assert.equal(stop.status, 'CANCEL_REQUESTED');
  assert.equal(stop.stopRequest, 'CANCEL');
  assert.equal(stop.firstDestructiveCommitAt, null);

  assert.equal(await worker.runOnce(), true, 'pre-mutation stop should settle as cancellation');
  const cancelled = await prisma.dataLifecycleOperation.findUniqueOrThrow({
    where: { id: operationId },
    select: {
      status: true,
      terminalResult: true,
      firstDestructiveCommitAt: true,
    },
  });
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.terminalResult, 'CANCELLED_BEFORE_MUTATION');
  assert.equal(cancelled.firstDestructiveCommitAt, null);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId, releasedAt: null },
    }),
    0,
  );

  console.log('Whole-user empty residual cancellation semantics passed.');
} finally {
  if (operationId !== undefined) {
    await prisma.dataLifecycleResourceFence.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId !== undefined) {
    await prisma.oAuthLoginState.deleteMany({ where: { userId } });
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
