import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const suffix = randomUUID();
const userIds = [];
const operationIds = [];

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

const counts = {
  accounts: 1,
  games: 1,
  plies: 0,
  analysisRuns: 1,
  aiReviews: 0,
  tacticalDetections: 1,
  scenarioSessions: 1,
  importRuns: 0,
  jobRuns: 1,
  preparationRuns: 0,
};

function scenarioSessionData(userId, detectionId, importedGameId = null) {
  return {
    userId,
    scenarioType: 'MISSED_OPPORTUNITY',
    sourceType: 'TACTICAL_DETECTION',
    sourceId: detectionId,
    tacticalDetectionId: detectionId,
    importedGameId,
    userColor: 'WHITE',
    startFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    challengePlyNumber: 1,
    contextPlies: [],
  };
}

try {
  const owner = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle scope transition owner',
      authProvider: 'lifecycle-scope-transition-test',
      authSubject: `owner-${suffix}`,
    },
  });
  userIds.push(owner.id);
  const otherUser = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle scope transition other user',
      authProvider: 'lifecycle-scope-transition-test',
      authSubject: `other-${suffix}`,
    },
  });
  userIds.push(otherUser.id);

  const accountA = await prisma.externalAccount.create({
    data: {
      userId: owner.id,
      provider: 'TEST',
      username: `scope-a-${suffix}`,
    },
  });
  const accountB = await prisma.externalAccount.create({
    data: {
      userId: owner.id,
      provider: 'TEST',
      username: `scope-b-${suffix}`,
    },
  });
  const gameA = await prisma.importedGame.create({
    data: {
      userId: owner.id,
      accountId: accountA.id,
      provider: 'TEST',
      providerGameId: `scope-a-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const gameB = await prisma.importedGame.create({
    data: {
      userId: owner.id,
      accountId: accountB.id,
      provider: 'TEST',
      providerGameId: `scope-b-${suffix}`,
      pgn: '1. d4 d5',
    },
  });
  const analysisRun = await prisma.gameAnalysisRun.create({
    data: {
      importedGameId: gameA.id,
      status: 'QUEUED',
    },
  });
  const jobRun = await prisma.jobRun.create({
    data: {
      userId: owner.id,
      kind: 'ANALYSE_GAMES',
      source: 'MAINTENANCE',
      priority: 0,
      status: 'QUEUED',
      totalTasks: 1,
    },
  });
  const jobTask = await prisma.jobTask.create({
    data: {
      jobRunId: jobRun.id,
      importedGameId: gameA.id,
      ordinal: 0,
      status: 'QUEUED',
    },
  });
  const thresholdsHash = hash(`thresholds:${suffix}`);
  const detectionRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId: owner.id,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash,
    },
  });
  const detection = await prisma.tacticalDetection.create({
    data: {
      runId: detectionRun.id,
      userId: owner.id,
      importedGameId: gameA.id,
      kind: 'MISSED_SHOT',
      thresholdsHash,
      triggerPlyNumber: 1,
      moveUci: 'e2e4',
    },
  });
  const detectionOnlySession = await prisma.scenarioTrainingSession.create({
    data: scenarioSessionData(owner.id, detection.id),
  });

  // The direct game snapshot and tactical detection must never disagree about
  // which lifecycle game scope owns a scenario session.
  await assert.rejects(
    prisma.scenarioTrainingSession.create({
      data: scenarioSessionData(owner.id, detection.id, gameB.id),
    }),
    /DATA_LIFECYCLE_SCOPE_MISMATCH/,
  );

  const operation = await repository.createPreview({
    action: 'PURGE_ACCOUNT_DATA',
    actorUserId: owner.id,
    targetUserId: owner.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: {
      resourceType: 'ACCOUNT',
      userId: owner.id,
      accountId: accountA.id,
    },
    previewCounts: counts,
    previewHash: hash(`preview:${suffix}`),
    previewTokenHash: hash(`token:${suffix}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'PURGE TEST ACCOUNT',
  });
  operationIds.push(operation.id);
  await repository.startExecution({
    operationId: operation.id,
    targetUserId: owner.id,
    previewTokenHash: hash(`token:${suffix}`),
    previewHash: hash(`preview:${suffix}`),
    idempotencyKeyHash: hash(`idempotency:${suffix}`),
  });

  // Reparenting a fenced account to another user must check the old owner scope.
  await assert.rejects(
    prisma.externalAccount.update({
      where: { id: accountA.id },
      data: { userId: otherUser.id },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // Reparenting a game out of a fenced account must check the old account scope.
  await assert.rejects(
    prisma.importedGame.update({
      where: { id: gameA.id },
      data: { accountId: accountB.id },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // Child rows cannot be moved away from a fenced game to evade the fence.
  await assert.rejects(
    prisma.gameAnalysisRun.update({
      where: { id: analysisRun.id },
      data: { importedGameId: gameB.id },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // A queued job task cannot be reparented away from the fenced game.
  await assert.rejects(
    prisma.jobTask.update({
      where: { id: jobTask.id },
      data: { importedGameId: gameB.id },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // A nullable direct game link must not let a detection-backed scenario bypass
  // the target account fence.
  await assert.rejects(
    prisma.scenarioTrainingSession.create({
      data: scenarioSessionData(owner.id, detection.id),
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // Attempts inherit lifecycle scope through their session and, when the direct
  // game snapshot is null, through the session's tactical detection.
  await assert.rejects(
    prisma.scenarioTrainingAttempt.create({
      data: {
        sessionId: detectionOnlySession.id,
        attemptNumber: 1,
        fenBefore: '8/8/8/8/8/8/8/K6k w - - 0 1',
        playedMoveUci: 'a1a2',
        fenAfter: '8/8/8/8/8/8/K7/7k b - - 1 1',
        passed: true,
        engineSource: 'TEST',
        engineDepth: 1,
      },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // A scenario snapshot whose game/detection links are already gone remains a
  // user-scoped write, so a descendant account fence still blocks admission.
  await assert.rejects(
    prisma.scenarioTrainingSession.create({
      data: {
        ...scenarioSessionData(owner.id, detection.id),
        sourceId: 0,
        tacticalDetectionId: null,
      },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // Settling already-admitted work is allowed during drain, but re-admitting
  // that task into the queue while the account is fenced is not.
  await prisma.jobTask.update({
    where: { id: jobTask.id },
    data: { status: 'CANCELLED', settledAt: new Date() },
  });
  await assert.rejects(
    prisma.jobTask.update({
      where: { id: jobTask.id },
      data: { status: 'QUEUED', settledAt: null },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  console.log('Data lifecycle scope transition tests passed.');
} finally {
  if (operationIds.length > 0) {
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}
