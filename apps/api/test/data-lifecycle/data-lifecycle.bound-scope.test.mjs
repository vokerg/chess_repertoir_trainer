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
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle bound scope test',
      authProvider: 'lifecycle-bound-scope-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `bound-scope-${suffix}`,
    },
  });
  const gameA = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `bound-a-${suffix}`,
      pgn: '1. e4 e5',
    },
  });
  const gameB = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `bound-b-${suffix}`,
      pgn: '1. d4 d5',
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
      gameIds: [gameA.id],
    },
    previewCounts: counts,
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
  const claimed = await repository.claimNext(`bound-scope-${suffix}`);
  assert.equal(claimed?.id, operation.id);
  await repository.advanceClaimed(operation.id, `bound-scope-${suffix}`, 'WAITING_FOR_DRAIN');
  await repository.advanceClaimed(operation.id, `bound-scope-${suffix}`, 'EXECUTING');

  await assert.rejects(
    repository.runDestructiveTransaction(
      {
        operationId: operation.id,
        targetUserId: user.id,
        workKey: `bound-scope-${suffix}`,
      },
      (tx) => tx.importedGame.update({
        where: { id: gameB.id },
        data: { status: 'OUT_OF_SCOPE_GAME' },
      }),
    ),
    /DATA_LIFECYCLE_SCOPE_VIOLATION/,
  );
  assert.equal(
    (await repository.getForTargetUser(user.id, operation.id))?.firstDestructiveCommitAt,
    null,
  );

  await assert.rejects(
    repository.runDestructiveTransaction(
      {
        operationId: operation.id,
        targetUserId: user.id,
        workKey: `bound-scope-${suffix}`,
      },
      (tx) => tx.externalAccount.update({
        where: { id: account.id },
        data: { displayName: 'OUT_OF_SCOPE_ACCOUNT' },
      }),
    ),
    /DATA_LIFECYCLE_SCOPE_VIOLATION/,
  );

  await repository.runDestructiveTransaction(
    {
      operationId: operation.id,
      targetUserId: user.id,
      workKey: `bound-scope-${suffix}`,
    },
    (tx) => tx.importedGame.update({
      where: { id: gameA.id },
      data: { status: 'IN_SCOPE_GAME' },
    }),
  );
  assert.equal(
    (await repository.getForTargetUser(user.id, operation.id))?.firstDestructiveCommitAt instanceof Date,
    true,
  );
  assert.equal(
    (await prisma.importedGame.findUniqueOrThrow({ where: { id: gameA.id } })).status,
    'IN_SCOPE_GAME',
  );
  assert.notEqual(
    (await prisma.importedGame.findUniqueOrThrow({ where: { id: gameB.id } })).status,
    'OUT_OF_SCOPE_GAME',
  );

  console.log('Data lifecycle bound scope tests passed.');
} finally {
  if (operationId) {
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
