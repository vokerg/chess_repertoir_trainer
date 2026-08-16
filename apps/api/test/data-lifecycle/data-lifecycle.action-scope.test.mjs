import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const suffix = randomUUID();
const operationIds = [];
let userId;

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

async function createPreview(action, scope, token) {
  const operation = await repository.createPreview({
    action,
    actorUserId: scope.userId,
    targetUserId: scope.userId,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${token}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${token}`),
    scope,
    previewCounts: counts,
    previewHash: hash(`preview:${token}`),
    previewTokenHash: hash(`token:${token}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'CONFIRM TEST',
  });
  operationIds.push(operation.id);
  return operation;
}

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle action scope test',
      authProvider: 'lifecycle-action-scope-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `action-scope-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `action-scope-${suffix}`,
      pgn: '1. e4 e5',
    },
  });

  const userScope = { resourceType: 'USER', userId: user.id };
  const accountScope = { resourceType: 'ACCOUNT', userId: user.id, accountId: account.id };
  const gameScope = {
    resourceType: 'GAME',
    userId: user.id,
    accountId: account.id,
    gameIds: [game.id],
  };

  assert.equal((await createPreview('UNANALYSE_GAMES', gameScope, 'valid-unanalyse')).scope.resourceType, 'GAME');
  assert.equal((await createPreview('UNINDEX_GAMES', gameScope, 'valid-unindex')).scope.resourceType, 'GAME');
  assert.equal((await createPreview('PURGE_ACCOUNT_DATA', accountScope, 'valid-purge')).scope.resourceType, 'ACCOUNT');
  assert.equal((await createPreview('DELETE_EXTERNAL_ACCOUNT', accountScope, 'valid-account-delete')).scope.resourceType, 'ACCOUNT');
  assert.equal((await createPreview('DELETE_APP_USER', userScope, 'valid-user-delete')).scope.resourceType, 'USER');

  await assert.rejects(createPreview('DELETE_APP_USER', gameScope, 'invalid-user-game'));
  await assert.rejects(createPreview('PURGE_ACCOUNT_DATA', userScope, 'invalid-purge-user'));
  await assert.rejects(createPreview('UNINDEX_GAMES', accountScope, 'invalid-unindex-account'));

  console.log('Data lifecycle action/scope tests passed.');
} finally {
  if (operationIds.length > 0) {
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: { in: operationIds } } });
  }
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
