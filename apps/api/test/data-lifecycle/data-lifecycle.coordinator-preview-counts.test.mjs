import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountGameDataLifecycleCoordinatorRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.coordinator.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createAccountGameDataLifecycleCoordinatorRepository(prisma);
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle preview count test',
      authProvider: 'lifecycle-preview-count-test',
      authSubject: `subject-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: { userId: user.id, provider: 'TEST', username: `preview-${suffix}` },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `preview-${suffix}`,
      pgn: '1. e4 e5 2. Nf3',
    },
  });
  await prisma.importedGamePly.createMany({
    data: [
      { importedGameId: game.id, plyNumber: 1, moveUci: 'e2e4', scoreLossCp: 15, classificationCode: 2 },
      { importedGameId: game.id, plyNumber: 2, moveUci: 'e7e5' },
      { importedGameId: game.id, plyNumber: 3, moveUci: 'g1f3' },
    ],
  });

  const gameScope = {
    resourceType: 'GAME',
    userId: user.id,
    accountId: account.id,
    gameIds: [game.id],
  };
  const accountScope = {
    resourceType: 'ACCOUNT',
    userId: user.id,
    accountId: account.id,
  };

  const unanalyze = await repository.countAffectedRows('UNANALYSE_GAMES', gameScope);
  assert.equal(unanalyze.games, 1);
  assert.equal(unanalyze.plies, 1, 'un-analysis previews only plies carrying analysis evidence');

  const unindex = await repository.countAffectedRows('UNINDEX_GAMES', gameScope);
  assert.equal(unindex.plies, 3, 'un-index previews every ply row that will be removed');

  const purge = await repository.countAffectedRows('PURGE_ACCOUNT_DATA', accountScope);
  assert.equal(purge.plies, 3, 'account purge previews every cascaded ply row');

  const deletion = await repository.countAffectedRows('DELETE_EXTERNAL_ACCOUNT', accountScope);
  assert.equal(deletion.plies, 3, 'account deletion previews every cascaded ply row');

  console.log('Data lifecycle destructive preview count tests passed.');
} finally {
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
