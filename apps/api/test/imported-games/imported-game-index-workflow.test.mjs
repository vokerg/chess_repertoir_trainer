import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { ImportedGameIndexWorkflowService } from '../../dist/modules/imported-games/imported-game-index-workflow.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const createdUserIds = [];

const sicilianPgn = `
[Event "Index workflow test"]
[Site "Local"]
[Date "2026.07.06"]
[Round "-"]
[White "Tester"]
[Black "Opponent"]
[Result "1-0"]

1. e4 c5 2. Nf3 d6 1-0
`;

async function createUserWithAccount(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Index Workflow ${label}`,
      authProvider: 'test',
      authSubject: `index-workflow-${label}-${suffix}`,
      email: `index-workflow-${label}-${suffix}@example.test`,
    },
  });
  createdUserIds.push(user.id);

  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `index-workflow-${label}-${suffix}`,
    },
  });

  return { user, account };
}

async function createImportedGame(userId, accountId, overrides = {}) {
  return prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'TEST',
      providerGameId: `index-workflow-${randomUUID()}`,
      pgn: sicilianPgn,
      result: '1-0',
      resultForUser: 'WIN',
      userColor: 'WHITE',
      whiteUsername: 'Tester',
      blackUsername: 'Opponent',
      whiteRating: 1500,
      blackRating: 1500,
      speedCategory: 'rapid',
      timeControlInitial: 600,
      timeControlIncrement: 0,
      ...overrides,
    },
  });
}

try {
  {
    const { user, account } = await createUserWithAccount('rapid');
    const game = await createImportedGame(user.id, account.id, { speedCategory: 'rapid' });

    const result = await ImportedGameIndexWorkflowService.indexGame(user.id, game.id);

    assert.equal(result.eligible, true);
    assert.equal(result.plyIndex.status, 'INDEXED');
    assert.equal(result.openingAssignment.status, 'ASSIGNED');
    assert.match(result.openingAssignment.openingName ?? '', /Sicilian/i);
  }

  {
    const { user, account } = await createUserWithAccount('blitz');
    const game = await createImportedGame(user.id, account.id, { speedCategory: 'blitz' });

    const result = await ImportedGameIndexWorkflowService.indexGame(user.id, game.id);

    assert.equal(result.eligible, true);
    assert.equal(result.plyIndex.status, 'INDEXED');
    assert.equal(result.openingAssignment.status, 'ASSIGNED');
  }

  {
    const { user, account } = await createUserWithAccount('bullet');
    const game = await createImportedGame(user.id, account.id, { speedCategory: 'bullet' });

    const result = await ImportedGameIndexWorkflowService.indexGame(user.id, game.id);
    const updated = await prisma.importedGame.findUniqueOrThrow({
      where: { id: game.id },
      include: { plies: true },
    });

    assert.equal(result.eligible, false);
    assert.equal(result.skippedReason, 'UNSUPPORTED_SPEED_CATEGORY');
    assert.equal(updated.plyIndexedAt, null);
    assert.equal(updated.openingEco, null);
    assert.equal(updated.openingName, null);
    assert.equal(updated.plies.length, 0);
  }

  {
    const { user, account } = await createUserWithAccount('provider-opening');
    const game = await createImportedGame(user.id, account.id, {
      speedCategory: 'rapid',
      openingEco: 'Z99',
      openingName: 'Provider Opening',
    });

    const result = await ImportedGameIndexWorkflowService.indexGame(user.id, game.id);
    const updated = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });

    assert.equal(result.eligible, true);
    assert.equal(result.openingAssignment.status, 'SKIPPED');
    assert.equal(result.openingAssignment.reason, 'OPENING_ALREADY_PRESENT');
    assert.equal(updated.openingEco, 'Z99');
    assert.equal(updated.openingName, 'Provider Opening');
  }

  console.log('Imported game index workflow tests passed.');
} finally {
  if (createdUserIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
}
