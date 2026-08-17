import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const lockClient = new PrismaClient();
const checkClient = new PrismaClient();
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
  analysisRuns: 0,
  aiReviews: 0,
  tacticalDetections: 0,
  scenarioSessions: 0,
  importRuns: 0,
  jobRuns: 0,
  preparationRuns: 0,
};

try {
  const owner = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle indirect-scope owner',
      authProvider: 'lifecycle-indirect-scope-test',
      authSubject: `owner-${suffix}`,
    },
  });
  userIds.push(owner.id);
  const other = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle indirect-scope other',
      authProvider: 'lifecycle-indirect-scope-test',
      authSubject: `other-${suffix}`,
    },
  });
  userIds.push(other.id);

  const ownerAccount = await prisma.externalAccount.create({
    data: {
      userId: owner.id,
      provider: 'TEST',
      username: `owner-${suffix}`,
    },
  });
  const otherAccount = await prisma.externalAccount.create({
    data: {
      userId: other.id,
      provider: 'TEST',
      username: `other-${suffix}`,
    },
  });
  const ownerGame = await prisma.importedGame.create({
    data: {
      userId: owner.id,
      accountId: ownerAccount.id,
      provider: 'TEST',
      providerGameId: `owner-game-${suffix}`,
      pgn: '1. e4 e5',
    },
  });

  // ImportedGame has independent user/account foreign keys. A direct writer
  // must not be able to create a cross-user game that would be checked against
  // the wrong user's lifecycle fences.
  await assert.rejects(
    prisma.importedGame.create({
      data: {
        userId: owner.id,
        accountId: otherAccount.id,
        provider: 'TEST',
        providerGameId: `mismatched-game-${suffix}`,
        pgn: '1. d4 d5',
      },
    }),
    /DATA_LIFECYCLE_SCOPE_MISMATCH/,
  );

  // Redundant userId + importedGameId child rows must agree on ownership. If
  // they did not, a USER fence for the declared user could be bypassed because
  // the generic child trigger historically derived scope only from the game.
  await assert.rejects(
    prisma.importedGameAiReview.create({
      data: {
        userId: other.id,
        importedGameId: ownerGame.id,
        inputHash: hash(`ai-input:${suffix}`),
        provider: 'TEST',
        model: 'TEST',
        content: {},
        generatedAt: new Date(),
      },
    }),
    /DATA_LIFECYCLE_SCOPE_MISMATCH/,
  );

  const tacticalRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId: owner.id,
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash: hash(`thresholds:${suffix}`),
    },
  });
  await assert.rejects(
    prisma.tacticalDetection.create({
      data: {
        runId: tacticalRun.id,
        userId: other.id,
        importedGameId: ownerGame.id,
        kind: 'MISSED_SHOT',
        thresholdsHash: hash(`thresholds:${suffix}`),
        triggerPlyNumber: 1,
        moveUci: 'e2e4',
      },
    }),
    /DATA_LIFECYCLE_SCOPE_MISMATCH/,
  );

  const preparationRun = await prisma.dataPreparationRun.create({
    data: {
      userId: owner.id,
      purpose: 'ONBOARDING',
      status: 'QUEUED',
      recipeVersion: 1,
      recipeJson: {},
    },
  });
  await assert.rejects(
    prisma.dataPreparationTarget.create({
      data: {
        preparationRunId: preparationRun.id,
        accountId: otherAccount.id,
        accountProvider: 'TEST',
        accountUsername: `other-${suffix}`,
        ordinal: 0,
        scopeVersion: 1,
        scopeHash: hash(`prep-scope:${suffix}`),
        scopeJson: {},
        requestedFrom: new Date(Date.now() - 60_000),
        requestedTo: new Date(),
      },
    }),
    /DATA_LIFECYCLE_SCOPE_MISMATCH/,
  );

  // Indirect child scope resolution must lock the game row while ownership is
  // derived. Holding an UPDATE lock here makes the helper block until the game
  // row is stable; the old plain-SELECT implementation completed immediately.
  let releaseGameLock;
  let gameLockAcquired;
  const gameLockReady = new Promise((resolve) => { gameLockAcquired = resolve; });
  const releaseGame = new Promise((resolve) => { releaseGameLock = resolve; });
  const lockTransaction = lockClient.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      'SELECT "id" FROM "ImportedGame" WHERE "id" = $1 FOR UPDATE',
      ownerGame.id,
    );
    gameLockAcquired();
    await releaseGame;
  });
  await gameLockReady;

  let scopeCheckSettled = false;
  const scopeCheck = checkClient.$queryRawUnsafe(
    'SELECT "data_lifecycle_assert_game_transition_allowed"(NULL, $1)',
    ownerGame.id,
  ).then((value) => {
    scopeCheckSettled = true;
    return value;
  });
  await new Promise((resolve) => setTimeout(resolve, 75));
  assert.equal(
    scopeCheckSettled,
    false,
    'indirect scope resolution must wait for the referenced game row to stabilize',
  );
  releaseGameLock();
  await lockTransaction;
  await scopeCheck;

  const operation = await repository.createPreview({
    action: 'DELETE_APP_USER',
    actorUserId: owner.id,
    targetUserId: owner.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: { resourceType: 'USER', userId: owner.id },
    previewCounts: counts,
    previewHash: hash(`preview:${suffix}`),
    previewTokenHash: hash(`token:${suffix}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'DELETE TEST USER',
  });
  operationIds.push(operation.id);
  await repository.startExecution({
    operationId: operation.id,
    targetUserId: owner.id,
    previewTokenHash: hash(`token:${suffix}`),
    previewHash: hash(`preview:${suffix}`),
    idempotencyKeyHash: hash(`idempotency:${suffix}`),
  });

  // AppUser INSERT must be guarded too: after final deletion a direct writer
  // must not recreate the numeric id while the USER fence is retained.
  await assert.rejects(
    prisma.appUser.create({
      data: {
        id: owner.id,
        displayName: 'must-not-recreate',
        authProvider: 'lifecycle-indirect-scope-test',
        authSubject: `recreate-${suffix}`,
      },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  // OAuthLoginState has no AppUser FK, so a row admitted after explicit cleanup
  // could otherwise survive final AppUser deletion.
  await assert.rejects(
    prisma.oAuthLoginState.create({
      data: {
        userId: owner.id,
        provider: 'TEST',
        state: `state-${suffix}`,
        codeVerifier: `verifier-${suffix}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    }),
    /DATA_LIFECYCLE_WRITE_BLOCKED/,
  );

  console.log('Data lifecycle indirect scope hardening tests passed.');
} finally {
  if (operationIds.length > 0) {
    await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId: { in: operationIds } } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await lockClient.$disconnect();
  await checkClient.$disconnect();
  await prisma.$disconnect();
}
