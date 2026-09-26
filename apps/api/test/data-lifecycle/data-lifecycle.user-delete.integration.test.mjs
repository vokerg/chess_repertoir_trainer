import { encodeUciMove } from 'chess-domain';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  createCurrentAppUserService,
} from '../../dist/auth/current-app-user.service.js';
import {
  DataLifecycleWriteBlockedError,
} from '../../dist/modules/data-lifecycle/data-lifecycle.guard.js';
import {
  createDeletedIdentityGuard,
  DeletedIdentityBlockedError,
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
  { version: 1, secret: `user-delete-audit-${suffix}` },
]);
const identityKeyring = new LifecycleHmacKeyring([
  { version: 1, secret: `user-delete-identity-${suffix}` },
]);
const deletedIdentityGuard = createDeletedIdentityGuard(prisma, identityKeyring);
const service = createUserDataLifecycleService({
  auditKeyring,
  deletedIdentityGuard,
});
const authService = createCurrentAppUserService(prisma, deletedIdentityGuard);
const workerConfig = {
  pollIntervalMs: 1,
  heartbeatIntervalMs: 1_000,
  staleAfterMs: 5_000,
  staleRecoveryIntervalMs: 5_000,
  shutdownTimeoutMs: 5_000,
  gameBatchLimit: 25,
};
const logger = { info() {}, warn() {}, error() {} };
let operationId;
let userId;
let sharedPositionId;
let sharedPuzzleId;
let sharedTagCode;

try {
  const provider = 'onb-021-user-delete';
  const externalSubject = `subject-${suffix}`;
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-021 whole-user deletion',
      authProvider: provider,
      authSubject: externalSubject,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `delete-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `game-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const sharedPosition = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    },
  });
  sharedPositionId = sharedPosition.id;
  await prisma.importedGamePly.create({
    data: {
      importedGameId: game.id,
      positionId: sharedPosition.id,
      plyNumber: 0,
       moveCode: encodeUciMove('a1a2'),
    },
  });
  await prisma.positionAnalysis.create({
    data: {
      positionId: sharedPosition.id,
      bestMoveUci: 'a1a2',
      lines: [],
    },
  });
  await prisma.mastersExplorerCache.create({
    data: {
      positionId: sharedPosition.id,
      source: 'ONB_021_TEST',
      profileVersion: 1,
      sinceYear: 2000,
      untilYear: 2026,
      movesLimit: 10,
      topGamesLimit: 5,
      payload: {},
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  sharedTagCode = 2_000_000 + user.id;
  await prisma.gameTagDefinition.create({
    data: {
      code: sharedTagCode,
      name: `ONB-021 shared tag ${suffix}`,
    },
  });
  sharedPuzzleId = `p${suffix.replaceAll('-', '').slice(0, 15)}`;
  await prisma.lichessPuzzle.create({
    data: {
      id: sharedPuzzleId,
      gameId: 'abcdefgh',
      gamePgn: '1. e4 e5',
      initialPly: 0,
      startFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      lastMoveUci: 'a1a2',
      sideToMove: 'WHITE',
      solutionUci: ['a1a2'],
      themes: ['onb021'],
      rating: 1500,
      plays: 1,
    },
  });
  await prisma.lichessPuzzleRound.create({
    data: {
      userId: user.id,
      puzzleId: sharedPuzzleId,
      source: 'ONB_021_TEST',
      angle: 'shared-retention',
      currentFen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      moveAttempts: [],
    },
  });
  await prisma.lichessPuzzleReviewState.create({
    data: {
      userId: user.id,
      puzzleId: sharedPuzzleId,
    },
  });
  await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'LICHESS',
      status: 'COMPLETED',
    },
  });
  await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'ONBOARDING',
      status: 'COMPLETED',
      recipeVersion: 1,
      recipeJson: {},
    },
  });

  const jobRun = await prisma.jobRun.create({
    data: {
      userId: user.id,
      kind: 'INDEX_GAMES',
      source: 'USER_ACTION',
      priority: 100,
      status: 'RUNNING',
      totalTasks: 1,
      tasks: {
        create: {
          importedGameId: game.id,
          ordinal: 0,
          status: 'RUNNING',
          workKey: `job-${suffix}`,
          startedAt: new Date(),
        },
      },
    },
  });
  await prisma.course.create({
    data: {
      userId: user.id,
      name: 'Delete me',
    },
  });
  await prisma.oAuthLoginState.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      state: `state-${suffix}`,
      codeVerifier: `verifier-${suffix}`,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await prisma.lichessConnection.create({
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

  const preview = await service.preview(user.id, { action: 'DELETE_APP_USER' });
  operationId = preview.operationId;
  assert.equal(preview.scope.resourceType, 'USER');
  assert.equal(preview.previewCounts.accounts, 1);
  assert.equal(preview.previewCounts.games, 1);
  assert.equal(preview.previewCounts.importRuns, 1);
  assert.equal(preview.previewCounts.jobRuns, 1);
  assert.equal(preview.previewCounts.preparationRuns, 1);

  const credentials = {
    previewToken: preview.previewToken,
    confirmationPhrase: preview.confirmationPhrase,
    idempotencyKey: `delete-user-${suffix}`,
  };
  const firstExecute = await service.execute(user.id, operationId, credentials);
  const duplicateExecute = await service.execute(user.id, operationId, credentials);
  assert.equal(firstExecute.operationId, duplicateExecute.operationId);
  assert.ok(firstExecute.receiptToken);
  assert.equal(firstExecute.receiptToken, duplicateExecute.receiptToken);
  assert.equal(
    await prisma.dataLifecycleResourceFence.count({
      where: { operationId, resourceType: 'USER', releasedAt: null },
    }),
    1,
  );

  await assert.rejects(
    authService.resolveExternalUser({
      provider,
      externalSubject,
      displayName: 'Must not update while fenced',
    }),
    DataLifecycleWriteBlockedError,
  );
  const deletionAuth = await authService.resolveExternalUserForDeletionOperation(
    { provider, externalSubject },
    operationId,
  );
  assert.equal(deletionAuth?.auth.userId, user.id);

  let revokeCalls = 0;
  // Simulate the existing job worker acknowledging the lifecycle task cancellation
  // by releasing its claim after the first cancellation pass.
  let releasedJobClaim = false;
  const worker = createUserDataLifecycleWorker({
    deletedIdentityGuard,
    lichessRevoker: {
      async revokeUpstreamForUser(targetUserId) {
        assert.equal(targetUserId, user.id);
        revokeCalls += 1;
        return { attempted: true, revoked: false };
      },
    },
    logger,
    config: workerConfig,
  });

  for (let step = 0; step < 80; step += 1) {
    const status = await service.getByReceipt(firstExecute.receiptToken);
    if (status?.status === 'COMPLETED') break;
    if (status && ['FAILED', 'CANCELLED', 'EXPIRED', 'NEEDS_ATTENTION'].includes(status.status)) {
      assert.fail(`Whole-user deletion settled unexpectedly as ${status.status}`);
    }
    assert.equal(await worker.runOnce(), true);
    if (!releasedJobClaim) {
      const task = await prisma.jobTask.findFirst({ where: { jobRunId: jobRun.id } });
      if (task?.status === 'CANCELLED' && task.workKey !== null) {
        await prisma.jobTask.update({
          where: { id: task.id },
          data: { workKey: null, settledAt: new Date() },
        });
        releasedJobClaim = true;
      }
    }
  }

  const completed = await service.getByReceipt(firstExecute.receiptToken);
  assert.equal(completed?.status, 'COMPLETED');
  assert.equal(completed?.terminalResult, 'COMPLETED');
  assert.equal(completed?.purgeLocalData, true);
  assert.equal(revokeCalls, 1);

  assert.equal(await prisma.appUser.count({ where: { id: user.id } }), 0);
  assert.equal(await prisma.externalAccount.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.course.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.jobRun.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.oAuthLoginState.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.lichessConnection.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.importRun.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.dataPreparationRun.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.lichessPuzzleRound.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.lichessPuzzleReviewState.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.position.count({ where: { id: sharedPosition.id } }), 1);
  assert.equal(await prisma.positionAnalysis.count({ where: { positionId: sharedPosition.id } }), 1);
  assert.equal(await prisma.mastersExplorerCache.count({ where: { positionId: sharedPosition.id } }), 1);
  assert.equal(await prisma.gameTagDefinition.count({ where: { code: sharedTagCode } }), 1);
  assert.equal(await prisma.lichessPuzzle.count({ where: { id: sharedPuzzleId } }), 1);
  const storedOperation = await prisma.dataLifecycleOperation.findUniqueOrThrow({
    where: { id: operationId },
    select: { verificationJson: true },
  });
  assert.equal(storedOperation.verificationJson?.checks?.importRuns, 0);
  assert.equal(
    await prisma.deletedAuthIdentityTombstone.count({ where: { operationId } }),
    1,
  );

  await assert.rejects(
    authService.resolveExternalUser({ provider, externalSubject }),
    DeletedIdentityBlockedError,
  );
  assert.equal(
    await prisma.appUser.count({
      where: { authProvider: provider, authSubject: externalSubject },
    }),
    0,
    'deleted identity must not be silently re-provisioned',
  );

  const postDeleteRetryAuth = await authService.resolveExternalUserForDeletionOperation(
    { provider, externalSubject },
    operationId,
  );
  assert.equal(postDeleteRetryAuth?.auth.userId, user.id);
  const postDeleteDuplicate = await service.execute(user.id, operationId, credentials);
  assert.equal(postDeleteDuplicate.receiptToken, firstExecute.receiptToken);
  assert.equal(postDeleteDuplicate.status, 'COMPLETED');

  console.log('Whole-user deletion, receipt, auth fence, and tombstone tests passed.');
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
  if (sharedPositionId !== undefined) {
    await prisma.mastersExplorerCache.deleteMany({ where: { positionId: sharedPositionId } });
    await prisma.positionAnalysis.deleteMany({ where: { positionId: sharedPositionId } });
    await prisma.position.deleteMany({ where: { id: sharedPositionId } });
  }
  if (sharedPuzzleId !== undefined) {
    await prisma.lichessPuzzle.deleteMany({ where: { id: sharedPuzzleId } });
  }
  if (sharedTagCode !== undefined) {
    await prisma.gameTagDefinition.deleteMany({ where: { code: sharedTagCode } });
  }
  await prisma.$disconnect();
}
