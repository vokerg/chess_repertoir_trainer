import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import {
  createDataLifecycleRepository,
  DataLifecycleConflictError,
  DataLifecycleInvalidStateError,
  DataLifecycleOwnershipChangedError,
  DataLifecyclePreviewExpiredError,
  DataLifecyclePreviewInvalidError,
} from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';
import {
  LifecycleHmacKeyring,
  hashOpaqueLifecycleToken,
} from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';
import {
  createDeletedIdentityGuard,
  DeletedIdentityBlockedError,
} from '../../dist/modules/data-lifecycle/deleted-identity.guard.js';
import {
  allowAccountImportAdmission,
  AccountImportAdmissionBlockedError,
} from '../../dist/modules/account-imports/account-import-admission.guard.js';
import {
  allowPreparationAdmission,
  PreparationAdmissionBlockedError,
} from '../../dist/modules/preparation/preparation-admission.guard.js';
import { createCurrentAppUserService } from '../../dist/auth/current-app-user.service.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const suffix = randomUUID();
const userIds = [];
const operationIds = [];

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

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fixture(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Lifecycle ${label}`,
      authProvider: 'lifecycle-test',
      authSubject: `${label}-${suffix}`,
    },
  });
  userIds.push(user.id);
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `${label}-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `${label}-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  return { user, account, game };
}

async function preview({ userId, accountId, gameIds, action = 'UNANALYSE_GAMES', token }) {
  const scope = gameIds
    ? { resourceType: 'GAME', userId, accountId, gameIds }
    : accountId
      ? { resourceType: 'ACCOUNT', userId, accountId }
      : { resourceType: 'USER', userId };
  const created = await repository.createPreview({
    action,
    actorUserId: userId,
    targetUserId: userId,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${userId}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${userId}`),
    scope,
    previewCounts: counts,
    previewHash: hash(`preview:${token}`),
    previewTokenHash: hash(`token:${token}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'DELETE TEST DATA',
    warningCodes: ['TEST_ONLY'],
  });
  operationIds.push(created.id);
  return created;
}

async function createRawPreview({ userId, scope, token }) {
  return repository.createPreview({
    action: 'UNANALYSE_GAMES',
    actorUserId: userId,
    targetUserId: userId,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${userId}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${userId}`),
    scope,
    previewCounts: counts,
    previewHash: hash(`preview:${token}`),
    previewTokenHash: hash(`token:${token}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'DELETE TEST DATA',
    warningCodes: ['TEST_ONLY'],
  });
}

try {
  {
    const owner = await fixture('preview-owner');
    const foreign = await fixture('preview-foreign');

    await assert.rejects(
      createRawPreview({
        userId: owner.user.id,
        scope: {
          resourceType: 'ACCOUNT',
          userId: owner.user.id,
          accountId: foreign.account.id,
        },
        token: 'foreign-account-preview',
      }),
      DataLifecycleOwnershipChangedError,
    );
    await assert.rejects(
      createRawPreview({
        userId: owner.user.id,
        scope: {
          resourceType: 'GAME',
          userId: owner.user.id,
          accountId: owner.account.id,
          gameIds: [2_147_483_647],
        },
        token: 'missing-game-preview',
      }),
      DataLifecycleOwnershipChangedError,
    );
  }

  {
    const { user, account, game } = await fixture('fence');
    const operation = await preview({
      userId: user.id,
      accountId: account.id,
      gameIds: [game.id],
      token: 'fence',
    });
    const started = await repository.startExecution({
      operationId: operation.id,
      targetUserId: user.id,
      previewTokenHash: hash('token:fence'),
      previewHash: hash('preview:fence'),
      idempotencyKeyHash: hash('idempotency:fence'),
      receiptTokenHash: hashOpaqueLifecycleToken('fence-receipt'),
      receiptExpiresAt: new Date(Date.now() + 60_000),
    });
    assert.equal(started.status, 'FENCING');

    const duplicate = await repository.startExecution({
      operationId: operation.id,
      targetUserId: user.id,
      previewTokenHash: hash('token:fence'),
      previewHash: hash('preview:fence'),
      idempotencyKeyHash: hash('idempotency:fence'),
    });
    assert.equal(duplicate.id, operation.id);

    await assert.rejects(
      repository.startExecution({
        operationId: operation.id,
        targetUserId: user.id,
        previewTokenHash: hash('token:not-the-original-preview'),
        previewHash: hash('preview:fence'),
        idempotencyKeyHash: hash('idempotency:fence'),
      }),
      DataLifecyclePreviewInvalidError,
    );

    const reboundPreview = await preview({
      userId: user.id,
      accountId: account.id,
      gameIds: [game.id],
      token: 'idempotency-rebind',
    });
    await assert.rejects(
      repository.startExecution({
        operationId: reboundPreview.id,
        targetUserId: user.id,
        previewTokenHash: hash('token:idempotency-rebind'),
        previewHash: hash('preview:idempotency-rebind'),
        idempotencyKeyHash: hash('idempotency:fence'),
      }),
      DataLifecycleInvalidStateError,
    );

    await assert.rejects(
      prisma.importedGame.update({
        where: { id: game.id },
        data: { tagCodes: [999] },
      }),
      /DATA_LIFECYCLE_WRITE_BLOCKED/,
    );

    // Parent-scoped admission must treat a child GAME fence as overlapping.
    await assert.rejects(
      prisma.$transaction((tx) => allowAccountImportAdmission.assertAllowed(tx, {
        userId: user.id,
        accountId: account.id,
      })),
      AccountImportAdmissionBlockedError,
    );
    await assert.rejects(
      prisma.$transaction((tx) => allowPreparationAdmission.assertAllowed(tx, {
        userId: user.id,
        accountId: account.id,
      })),
      PreparationAdmissionBlockedError,
    );
    await assert.rejects(
      prisma.externalAccount.update({
        where: { id: account.id },
        data: { displayName: 'must-not-commit' },
      }),
      /DATA_LIFECYCLE_WRITE_BLOCKED/,
    );
    await assert.rejects(
      prisma.appUser.update({
        where: { id: user.id },
        data: { displayName: 'must-not-commit' },
      }),
      /DATA_LIFECYCLE_WRITE_BLOCKED/,
    );
    await assert.rejects(
      createCurrentAppUserService(prisma).resolveExternalUser({
        provider: 'lifecycle-test',
        externalSubject: `fence-${suffix}`,
        displayName: 'must-not-commit',
      }),
      /Write is blocked by an active data lifecycle operation/,
    );
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        const jobRun = await tx.jobRun.create({
          data: {
            userId: user.id,
            kind: 'ANALYSE',
            source: 'TEST',
            priority: 0,
            status: 'QUEUED',
            totalTasks: 1,
          },
        });
        await tx.jobTask.create({
          data: {
            jobRunId: jobRun.id,
            importedGameId: game.id,
            ordinal: 0,
            status: 'QUEUED',
          },
        });
      }),
      /DATA_LIFECYCLE_WRITE_BLOCKED/,
    );

    const conflictPreview = await preview({
      userId: user.id,
      accountId: account.id,
      action: 'PURGE_ACCOUNT_DATA',
      token: 'conflict',
    });
    await assert.rejects(
      repository.startExecution({
        operationId: conflictPreview.id,
        targetUserId: user.id,
        previewTokenHash: hash('token:conflict'),
        previewHash: hash('preview:conflict'),
        idempotencyKeyHash: hash('idempotency:conflict'),
      }),
      DataLifecycleConflictError,
    );

    const userConflictPreview = await preview({
      userId: user.id,
      action: 'DELETE_APP_USER',
      token: 'user-conflict',
    });
    await assert.rejects(
      repository.startExecution({
        operationId: userConflictPreview.id,
        targetUserId: user.id,
        previewTokenHash: hash('token:user-conflict'),
        previewHash: hash('preview:user-conflict'),
        idempotencyKeyHash: hash('idempotency:user-conflict'),
      }),
      DataLifecycleConflictError,
    );

    const claim = await repository.claimNext('lifecycle-worker-fence');
    assert.equal(claim?.id, operation.id);
    await repository.advanceClaimed(operation.id, 'lifecycle-worker-fence', 'WAITING_FOR_DRAIN');
    await repository.advanceClaimed(operation.id, 'lifecycle-worker-fence', 'EXECUTING');
    await assert.rejects(
      repository.advanceClaimed(operation.id, 'lifecycle-worker-fence', 'WAITING_FOR_DRAIN'),
      DataLifecycleInvalidStateError,
    );

    const beforeRollback = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    await assert.rejects(
      repository.runDestructiveTransaction(
        operation.id,
        user.id,
        'lifecycle-worker-fence',
        { batch: 0 },
        async (tx) => {
          await tx.importedGame.update({
            where: { id: game.id },
            data: { status: 'ROLL_BACK_DESTRUCTIVE_TEST' },
          });
          throw new Error('ROLL_BACK_DESTRUCTIVE_TEST');
        },
      ),
      /ROLL_BACK_DESTRUCTIVE_TEST/,
    );
    const rolledBackOperation = await repository.getForTargetUser(user.id, operation.id);
    const rolledBackGame = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(rolledBackOperation?.firstDestructiveCommitAt, null);
    assert.equal(rolledBackGame.status, beforeRollback.status);

    await repository.runDestructiveTransaction(
      operation.id,
      user.id,
      'lifecycle-worker-fence',
      { batch: 1 },
      async (tx) => {
        await tx.importedGame.update({
          where: { id: game.id },
          data: { status: 'DESTRUCTIVE_TEST_COMMITTED' },
        });
      },
    );

    await assert.rejects(
      prisma.dataLifecycleOperation.update({
        where: { id: operation.id },
        data: { status: 'CANCELLED' },
      }),
    );
    const stopped = await repository.requestStop(user.id, operation.id);
    assert.equal(stopped.stopRequest, 'STOP_AFTER_BATCH');
    assert.notEqual(stopped.status, 'CANCELLED');
    await repository.failClaimed(operation.id, 'lifecycle-worker-fence', 'TEST_PARTIAL_FAILURE');

    const needsAttention = await repository.getForTargetUser(user.id, operation.id);
    assert.equal(needsAttention?.status, 'NEEDS_ATTENTION');
    assert.equal(needsAttention?.firstDestructiveCommitAt instanceof Date, true);
    assert.deepEqual(needsAttention?.checkpoint, { batch: 1 });
    assert.equal(
      await prisma.dataLifecycleResourceFence.count({
        where: { operationId: operation.id, releasedAt: null },
      }),
      1,
    );
  }

  {
    const { user, account } = await fixture('cancel');
    const operation = await preview({
      userId: user.id,
      accountId: account.id,
      action: 'PURGE_ACCOUNT_DATA',
      token: 'cancel',
    });
    await repository.startExecution({
      operationId: operation.id,
      targetUserId: user.id,
      previewTokenHash: hash('token:cancel'),
      previewHash: hash('preview:cancel'),
      idempotencyKeyHash: hash('idempotency:cancel'),
    });
    const claim = await repository.claimNext('lifecycle-worker-cancel');
    assert.equal(claim?.id, operation.id);
    const stop = await repository.requestStop(user.id, operation.id);
    assert.equal(stop.status, 'CANCEL_REQUESTED');
    assert.equal(stop.stopRequest, 'CANCEL');
    await repository.completeCancellationBeforeMutation(operation.id, 'lifecycle-worker-cancel');
    const cancelled = await repository.getForTargetUser(user.id, operation.id);
    assert.equal(cancelled?.status, 'CANCELLED');
    assert.equal(
      await prisma.dataLifecycleResourceFence.count({
        where: { operationId: operation.id, releasedAt: null },
      }),
      0,
    );
  }

  {
    const { user, account } = await fixture('expired-preview');
    const operation = await preview({
      userId: user.id,
      accountId: account.id,
      action: 'PURGE_ACCOUNT_DATA',
      token: 'expired-preview',
    });
    const now = Date.now();
    await prisma.dataLifecycleOperation.update({
      where: { id: operation.id },
      data: {
        createdAt: new Date(now - 120_000),
        previewExpiresAt: new Date(now - 60_000),
      },
    });
    await assert.rejects(
      repository.startExecution({
        operationId: operation.id,
        targetUserId: user.id,
        previewTokenHash: hash('token:expired-preview'),
        previewHash: hash('preview:expired-preview'),
        idempotencyKeyHash: hash('idempotency:expired-preview'),
      }),
      DataLifecyclePreviewExpiredError,
    );
  }

  {
    const { user, account } = await fixture('stale-claim');
    const operation = await preview({
      userId: user.id,
      accountId: account.id,
      action: 'PURGE_ACCOUNT_DATA',
      token: 'stale',
    });
    await repository.startExecution({
      operationId: operation.id,
      targetUserId: user.id,
      previewTokenHash: hash('token:stale'),
      previewHash: hash('preview:stale'),
      idempotencyKeyHash: hash('idempotency:stale'),
    });
    const claim = await repository.claimNext('lifecycle-worker-stale');
    assert.equal(claim?.id, operation.id);
    await prisma.dataLifecycleOperation.update({
      where: { id: operation.id },
      data: {
        claimedAt: new Date('2020-01-01T00:00:00Z'),
        heartbeatAt: new Date('2020-01-01T00:00:00Z'),
      },
    });
    assert.equal(await repository.recoverStaleClaims(new Date('2021-01-01T00:00:00Z')), 1);
    assert.equal(
      await prisma.dataLifecycleResourceFence.count({
        where: { operationId: operation.id, releasedAt: null },
      }),
      1,
    );
    const reclaimed = await repository.claimNext('lifecycle-worker-stale-cleanup');
    assert.equal(reclaimed?.id, operation.id);
    await repository.failClaimed(operation.id, 'lifecycle-worker-stale-cleanup', 'TEST_STALE_CLEANUP');
    assert.equal(
      await prisma.dataLifecycleResourceFence.count({
        where: { operationId: operation.id, releasedAt: null },
      }),
      0,
    );
  }

  {
    const { user, account, game } = await fixture('writer-race');
    const operation = await preview({
      userId: user.id,
      accountId: account.id,
      gameIds: [game.id],
      token: 'writer-race',
    });
    const writer = new PrismaClient();
    let releaseWriter;
    let writerLocked;
    const locked = new Promise((resolve) => { writerLocked = resolve; });
    const release = new Promise((resolve) => { releaseWriter = resolve; });

    const writerWork = writer.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(17000259, ${user.id})`);
      writerLocked();
      await release;
      await tx.importedGame.update({
        where: { id: game.id },
        data: { status: 'WRITER_BEFORE_FENCE' },
      });
    });
    await locked;

    const startWork = repository.startExecution({
      operationId: operation.id,
      targetUserId: user.id,
      previewTokenHash: hash('token:writer-race'),
      previewHash: hash('preview:writer-race'),
      idempotencyKeyHash: hash('idempotency:writer-race'),
    });
    releaseWriter();
    await writerWork;
    await startWork;
    await writer.$disconnect();

    const after = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(after.status, 'WRITER_BEFORE_FENCE');
    await assert.rejects(
      prisma.importedGame.update({ where: { id: game.id }, data: { status: 'TOO_LATE' } }),
      /DATA_LIFECYCLE_WRITE_BLOCKED/,
    );

    const cleanupClaim = await repository.claimNext('lifecycle-worker-writer-race');
    assert.equal(cleanupClaim?.id, operation.id);
    await repository.failClaimed(operation.id, 'lifecycle-worker-writer-race', 'TEST_WRITER_RACE_CLEANUP');
  }

  {
    const { user } = await fixture('identity');
    const provider = user.authProvider;
    const externalSubject = user.authSubject;
    assert.ok(provider);
    assert.ok(externalSubject);
    const operation = await preview({
      userId: user.id,
      action: 'DELETE_APP_USER',
      token: 'identity',
    });
    await repository.startExecution({
      operationId: operation.id,
      targetUserId: user.id,
      previewTokenHash: hash('token:identity'),
      previewHash: hash('preview:identity'),
      idempotencyKeyHash: hash('idempotency:identity'),
      receiptTokenHash: hashOpaqueLifecycleToken('identity-receipt'),
      receiptExpiresAt: new Date(Date.now() + 60_000),
    });
    const claim = await repository.claimNext('lifecycle-worker-identity');
    assert.equal(claim?.id, operation.id);
    await repository.advanceClaimed(operation.id, 'lifecycle-worker-identity', 'WAITING_FOR_DRAIN');
    await repository.advanceClaimed(operation.id, 'lifecycle-worker-identity', 'EXECUTING');

    const keyring = new LifecycleHmacKeyring([{ version: 7, secret: 'test-only-lifecycle-key' }]);
    const identityGuard = createDeletedIdentityGuard(prisma, keyring);
    await repository.appendAudit({
      operationId: operation.id,
      eventType: 'TEST_DELETE_STARTED',
      action: 'DELETE_APP_USER',
      status: 'EXECUTING',
      actorKeyVersion: 7,
      actorKeyHash: hash('audit-actor'),
      targetKeyVersion: 7,
      targetKeyHash: hash('audit-target'),
      resourceType: 'USER',
      aggregateCounts: counts,
      confirmationMethod: 'TEST',
    });

    await repository.runDestructiveTransaction(
      operation.id,
      user.id,
      'lifecycle-worker-identity',
      { phase: 'DELETE_APP_USER' },
      async (tx) => {
        await identityGuard.createTombstone(tx, {
          provider,
          externalSubject,
          operationId: operation.id,
        });
        await tx.appUser.delete({ where: { id: user.id } });
      },
    );

    const authService = createCurrentAppUserService(prisma, identityGuard);
    await assert.rejects(
      authService.resolveExternalUser({ provider, externalSubject }),
      DeletedIdentityBlockedError,
    );
    assert.equal((await identityGuard.findOperationForIdentity(provider, externalSubject))?.operationId, operation.id);
    assert.equal((await identityGuard.findOperationByReceipt('identity-receipt'))?.operationId, operation.id);
    assert.equal(
      await prisma.dataLifecycleAuditEvent.count({ where: { operationId: operation.id } }),
      1,
    );
    const audit = await prisma.dataLifecycleAuditEvent.findFirstOrThrow({
      where: { operationId: operation.id },
    });
    assert.equal(JSON.stringify(audit).includes(externalSubject), false);
  }

  console.log('Data lifecycle repository tests passed.');
} finally {
  await prisma.dataLifecycleAuditEvent.deleteMany({ where: { operationId: { in: operationIds } } });
  await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId: { in: operationIds } } });
  await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}
