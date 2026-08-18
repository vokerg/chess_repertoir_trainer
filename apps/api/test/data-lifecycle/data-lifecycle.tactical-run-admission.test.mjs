import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

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
      displayName: 'Lifecycle tactical admission test',
      authProvider: 'lifecycle-tactical-test',
      authSubject: `subject-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `tactical-${suffix}`,
    },
  });
  const thresholdsHash = hash(`thresholds:${suffix}`);
  const admittedRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId: user.id,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash,
    },
  });

  const operation = await repository.createPreview({
    action: 'PURGE_ACCOUNT_DATA',
    actorUserId: user.id,
    targetUserId: user.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: {
      resourceType: 'ACCOUNT',
      userId: user.id,
      accountId: account.id,
    },
    previewCounts: counts,
    previewHash: hash(`preview:${suffix}`),
    previewTokenHash: hash(`token:${suffix}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'PURGE TEST ACCOUNT',
  });
  operationId = operation.id;
  await repository.startExecution({
    operationId: operation.id,
    targetUserId: user.id,
    previewTokenHash: hash(`token:${suffix}`),
    previewHash: hash(`preview:${suffix}`),
    idempotencyKeyHash: hash(`idempotency:${suffix}`),
  });

  // Tactical runs are user-scoped admission records. A descendant ACCOUNT
  // fence therefore blocks starting another run for the same user.
  await assert.rejects(
    prisma.tacticalDetectionRun.create({
      data: {
        userId: user.id,
        from: new Date(Date.now() - 60_000),
        to: new Date(),
        thresholds: {},
        thresholdsHash,
      },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // An already-admitted run must still be able to settle while destructive
  // execution waits for in-flight work to drain.
  const settled = await prisma.tacticalDetectionRun.update({
    where: { id: admittedRun.id },
    data: {
      gamesScanned: 0,
      detectionsMade: 0,
      completedAt: new Date(),
    },
  });
  assert.ok(settled.completedAt);

  console.log('Data lifecycle tactical run admission tests passed.');
} finally {
  if (operationId) {
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
