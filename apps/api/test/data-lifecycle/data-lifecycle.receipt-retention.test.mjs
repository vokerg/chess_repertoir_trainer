import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';
import { createDeletedIdentityGuard } from '../../dist/modules/data-lifecycle/deleted-identity.guard.js';
import {
  LifecycleHmacKeyring,
  hashOpaqueLifecycleToken,
} from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const identityGuard = createDeletedIdentityGuard(prisma, new LifecycleHmacKeyring([]));
const suffix = randomUUID();
const operationIds = [];

const counts = {
  accounts: 0,
  games: 0,
  plies: 0,
  analysisRuns: 0,
  aiReviews: 0,
  tacticalDetections: 0,
  scenarioSessions: 0,
  importRuns: 0,
  jobRuns: 0,
  preparationRuns: 0,
};

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function createTerminalOperation(label, receiptToken, receiptExpiresAt) {
  const targetUserId = 2_000_000_000 - operationIds.length;
  const operation = await prisma.dataLifecycleOperation.create({
    data: {
      action: 'DELETE_APP_USER',
      status: 'CANCELLED',
      actorUserId: null,
      targetUserId,
      actorKeyVersion: 1,
      actorKeyHash: hash(`actor:${label}:${suffix}`),
      targetKeyVersion: 1,
      targetKeyHash: hash(`target:${label}:${suffix}`),
      scopeResourceType: 'USER',
      scopeJson: { resourceType: 'USER', userId: targetUserId },
      previewCountsJson: counts,
      previewHash: hash(`preview:${label}:${suffix}`),
      previewTokenHash: hash(`preview-token:${label}:${suffix}`),
      previewExpiresAt: new Date('2020-01-02T00:00:00.000Z'),
      confirmationPhrase: 'RETENTION TEST',
      warningCodes: [],
      stopRequest: 'CANCEL',
      stopRequestedAt: new Date('2020-01-01T00:00:00.000Z'),
      terminalResult: 'CANCELLED_BEFORE_MUTATION',
      receiptTokenHash: receiptToken === null ? null : hashOpaqueLifecycleToken(receiptToken),
      receiptExpiresAt,
      completedAt: new Date('2020-01-01T00:00:00.000Z'),
      createdAt: new Date('2019-12-31T00:00:00.000Z'),
    },
  });
  operationIds.push(operation.id);
  return operation;
}

try {
  const indefiniteToken = `indefinite-${suffix}`;
  const indefinite = await createTerminalOperation('indefinite', indefiniteToken, null);
  const expired = await createTerminalOperation(
    'expired',
    `expired-${suffix}`,
    new Date('2020-06-01T00:00:00.000Z'),
  );
  const noReceipt = await createTerminalOperation('no-receipt', null, null);

  await repository.deleteTerminalOperationsBefore(new Date('2021-01-01T00:00:00.000Z'));

  assert.ok(
    await prisma.dataLifecycleOperation.findUnique({ where: { id: indefinite.id } }),
    'an unexpired receipt with no expiry must keep its operation resolvable',
  );
  assert.equal(
    await prisma.dataLifecycleOperation.findUnique({ where: { id: expired.id } }),
    null,
    'an expired receipt must not prevent ordinary terminal-operation retention',
  );
  assert.equal(
    await prisma.dataLifecycleOperation.findUnique({ where: { id: noReceipt.id } }),
    null,
    'an operation without a receipt must remain eligible for ordinary retention',
  );
  assert.equal(
    (await identityGuard.findOperationByReceipt(indefiniteToken))?.operationId,
    indefinite.id,
    'receipt lookup and retention must agree on a null expiry being still valid',
  );

  console.log('Data lifecycle receipt retention tests passed.');
} finally {
  await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
  await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId: { in: operationIds } } });
  await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  await prisma.$disconnect();
}
