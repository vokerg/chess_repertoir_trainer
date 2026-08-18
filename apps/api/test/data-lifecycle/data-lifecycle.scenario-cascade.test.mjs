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

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle scenario cascade test',
      authProvider: 'lifecycle-scenario-cascade-test',
      authSubject: `subject-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `scenario-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `scenario-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const thresholdsHash = hash(`thresholds:${suffix}`);
  const detectionRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId: user.id,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash,
    },
  });
  const detection = await prisma.tacticalDetection.create({
    data: {
      runId: detectionRun.id,
      userId: user.id,
      importedGameId: game.id,
      kind: 'MISSED_SHOT',
      thresholdsHash,
      triggerPlyNumber: 1,
      moveUci: 'e2e4',
    },
  });
  const session = await prisma.scenarioTrainingSession.create({
    data: {
      userId: user.id,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TACTICAL_DETECTION',
      sourceId: detection.id,
      tacticalDetectionId: detection.id,
      importedGameId: game.id,
      userColor: 'WHITE',
      startFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      challengePlyNumber: 1,
      contextPlies: [],
    },
  });

  const operation = await repository.createPreview({
    action: 'UNANALYSE_GAMES',
    actorUserId: user.id,
    targetUserId: user.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: {
      resourceType: 'GAME',
      userId: user.id,
      accountId: account.id,
      gameIds: [game.id],
    },
    previewCounts: {
      accounts: 1,
      games: 1,
      plies: 0,
      analysisRuns: 0,
      aiReviews: 0,
      tacticalDetections: 1,
      scenarioSessions: 1,
      importRuns: 0,
      jobRuns: 0,
      preparationRuns: 0,
    },
    previewHash: hash(`preview:${suffix}`),
    previewTokenHash: hash(`token:${suffix}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'UNANALYSE TEST GAME',
  });
  operationId = operation.id;
  await repository.startExecution({
    operationId: operation.id,
    targetUserId: user.id,
    previewTokenHash: hash(`token:${suffix}`),
    previewHash: hash(`preview:${suffix}`),
    idempotencyKeyHash: hash(`idempotency:${suffix}`),
  });

  const workKey = `scenario-cascade-${suffix}`;
  const claimed = await repository.claimNext(workKey);
  assert.equal(claimed?.id, operation.id);
  await repository.advanceClaimed(operation.id, workKey, 'WAITING_FOR_DRAIN');
  await repository.advanceClaimed(operation.id, workKey, 'EXECUTING');

  await repository.runDestructiveTransaction(
    {
      operationId: operation.id,
      targetUserId: user.id,
      workKey,
      checkpoint: { phase: 'TACTICAL_DERIVATIONS_REMOVED' },
    },
    async (tx) => {
      await tx.tacticalDetection.delete({ where: { id: detection.id } });
    },
  );

  const retainedSession = await prisma.scenarioTrainingSession.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      userId: true,
      importedGameId: true,
      tacticalDetectionId: true,
      sourceId: true,
    },
  });
  assert.equal(retainedSession.userId, user.id);
  assert.equal(retainedSession.importedGameId, game.id);
  assert.equal(retainedSession.tacticalDetectionId, null);
  assert.equal(retainedSession.sourceId, detection.id);

  const after = await repository.getForTargetUser(user.id, operation.id);
  assert.equal(after?.firstDestructiveCommitAt instanceof Date, true);
  assert.deepEqual(after?.checkpoint, { phase: 'TACTICAL_DERIVATIONS_REMOVED' });
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId: operation.id, releasedAt: null },
    }),
    1,
  );

  // Remove the test lifecycle operation/fence, then verify both FK cascade
  // shapes used by retained scenario snapshots:
  //   1. ImportedGame deletion SET NULLs the retained importedGameId; and
  //   2. AppUser deletion subsequently CASCADE deletes the detached session.
  await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
  await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
  await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  operationId = undefined;

  await prisma.importedGame.delete({ where: { id: game.id } });
  const detachedSession = await prisma.scenarioTrainingSession.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      userId: true,
      importedGameId: true,
      tacticalDetectionId: true,
      sourceId: true,
    },
  });
  assert.equal(detachedSession.userId, user.id);
  assert.equal(detachedSession.importedGameId, null);
  assert.equal(detachedSession.tacticalDetectionId, null);
  assert.equal(detachedSession.sourceId, detection.id);

  const deletedUser = await prisma.appUser.deleteMany({ where: { id: user.id } });
  assert.equal(deletedUser.count, 1);
  userId = undefined;
  assert.equal(
    await prisma.scenarioTrainingSession.count({ where: { id: session.id } }),
    0,
  );

  console.log('Data lifecycle retained scenario cascade tests passed.');
} finally {
  if (operationId) {
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}