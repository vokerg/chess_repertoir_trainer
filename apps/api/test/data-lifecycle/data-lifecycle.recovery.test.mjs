import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';
import { resumeDataLifecycleNeedsAttention } from '../../dist/modules/data-lifecycle/data-lifecycle.recovery.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const suffix = randomUUID();
let userId;
let operationId;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

const counts = {
  accounts: 1,
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

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle recovery test',
      authProvider: 'lifecycle-recovery-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `recovery-${suffix}`,
    },
  });

  const preview = await repository.createPreview({
    action: 'PURGE_ACCOUNT_DATA',
    actorUserId: user.id,
    targetUserId: user.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: { resourceType: 'ACCOUNT', userId: user.id, accountId: account.id },
    previewCounts: counts,
    previewHash: hash(`preview:${suffix}`),
    previewTokenHash: hash(`token:${suffix}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'RECOVER TEST DATA',
  });
  operationId = preview.id;

  await repository.startExecution({
    operationId: preview.id,
    targetUserId: user.id,
    previewTokenHash: hash(`token:${suffix}`),
    previewHash: hash(`preview:${suffix}`),
    idempotencyKeyHash: hash(`idempotency:${suffix}`),
  });
  const firstWorkKey = `recovery-first-${suffix}`;
  const claimed = await repository.claimNext(firstWorkKey);
  assert.equal(claimed?.id, preview.id);
  await repository.advanceClaimed(preview.id, firstWorkKey, 'WAITING_FOR_DRAIN');
  await repository.advanceClaimed(preview.id, firstWorkKey, 'EXECUTING');
  await repository.runDestructiveTransaction(
    {
      operationId: preview.id,
      targetUserId: user.id,
      workKey: firstWorkKey,
      checkpoint: {
        batch: 3,
        cursor: 'preserve-me',
      },
    },
    async () => {},
  );
  await repository.failClaimed(preview.id, firstWorkKey, 'TEST_PARTIAL_FAILURE');

  const attention = await repository.getForTargetUser(user.id, preview.id);
  assert.equal(attention?.status, 'NEEDS_ATTENTION');
  assert.deepEqual(attention?.checkpoint, { batch: 3, cursor: 'preserve-me' });
  const firstCommitAt = attention?.firstDestructiveCommitAt;
  assert.ok(firstCommitAt instanceof Date);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.id, releasedAt: null },
    }),
    1,
  );

  const resumed = await resumeDataLifecycleNeedsAttention(user.id, preview.id, prisma);
  assert.equal(resumed.status, 'WAITING_FOR_DRAIN');
  assert.deepEqual(resumed.checkpoint, { batch: 3, cursor: 'preserve-me' });
  assert.equal(resumed.firstDestructiveCommitAt.getTime(), firstCommitAt.getTime());
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.id, releasedAt: null },
    }),
    1,
  );

  const secondWorkKey = `recovery-second-${suffix}`;
  const reclaimed = await repository.claimNext(secondWorkKey);
  assert.equal(reclaimed?.id, preview.id);
  assert.equal(reclaimed?.status, 'WAITING_FOR_DRAIN');
  assert.deepEqual(reclaimed?.checkpoint, { batch: 3, cursor: 'preserve-me' });
  assert.equal(reclaimed?.firstDestructiveCommitAt?.getTime(), firstCommitAt.getTime());

  // The resumed operation stays forward-only. A second failure remains
  // NEEDS_ATTENTION and does not clear the fence or destructive checkpoint.
  await repository.failClaimed(preview.id, secondWorkKey, 'TEST_SECOND_FAILURE');
  const secondAttention = await repository.getForTargetUser(user.id, preview.id);
  assert.equal(secondAttention?.status, 'NEEDS_ATTENTION');
  assert.deepEqual(secondAttention?.checkpoint, { batch: 3, cursor: 'preserve-me' });
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: preview.id, releasedAt: null },
    }),
    1,
  );

  console.log('Data lifecycle recovery tests passed.');
} finally {
  if (operationId) {
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
