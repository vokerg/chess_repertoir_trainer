import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { GameOpeningAssignmentService } from '../../dist/modules/imported-games/game-opening-assignment.service.js';
import {
  calculateAllTagCodes,
  GameTaggingService,
} from '../../dist/modules/imported-games/game-tagging.service.js';
import { getImportedGameForTagging } from '../../dist/modules/imported-games/game-tagging.repository.prisma.js';
import { GAME_TAG, GAME_TAG_DEFINITIONS } from '../../dist/modules/imported-games/game-tags.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const createdUserIds = [];

const sicilianPgn = `
[Event "Opening assignment test"]
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
      displayName: `Opening Assignment ${label}`,
      authProvider: 'test',
      authSubject: `opening-assignment-${label}-${suffix}`,
      email: `opening-assignment-${label}-${suffix}@example.test`,
    },
  });
  createdUserIds.push(user.id);

  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `opening-assignment-${label}-${suffix}`,
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
      providerGameId: `opening-assignment-${randomUUID()}`,
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
  await prisma.gameTagDefinition.createMany({
    data: GAME_TAG_DEFINITIONS,
    skipDuplicates: true,
  });

  {
    const { user, account } = await createUserWithAccount('assigns');
    const game = await createImportedGame(user.id, account.id);

    const result = await GameOpeningAssignmentService.assignMissingOpening(user.id, game.id);
    const updated = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });

    assert.equal(result.status, 'ASSIGNED');
    assert.equal(updated.openingEco, result.openingEco);
    assert.equal(updated.openingName, result.openingName);
    assert.match(updated.openingName ?? '', /Sicilian/i);
  }

  {
    const { user, account } = await createUserWithAccount('preserves');
    const game = await createImportedGame(user.id, account.id, {
      openingEco: 'Z99',
      openingName: 'Provider Supplied Opening',
    });

    const result = await GameOpeningAssignmentService.assignMissingOpening(user.id, game.id);
    const updated = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });

    assert.equal(result.status, 'SKIPPED');
    assert.equal(result.reason, 'OPENING_ALREADY_PRESENT');
    assert.equal(updated.openingEco, 'Z99');
    assert.equal(updated.openingName, 'Provider Supplied Opening');
  }

  {
    const { user, account } = await createUserWithAccount('fills-partial');
    const game = await createImportedGame(user.id, account.id, {
      openingEco: 'B20',
      openingName: null,
    });

    const result = await GameOpeningAssignmentService.assignMissingOpening(user.id, game.id);
    const updated = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });

    assert.equal(result.status, 'ASSIGNED');
    assert.equal(updated.openingEco, 'B20');
    assert.match(updated.openingName ?? '', /Sicilian/i);
  }

  {
    const { user, account } = await createUserWithAccount('invalid-pgn');
    const missingPgnGame = await createImportedGame(user.id, account.id, { pgn: null });
    const invalidPgnGame = await createImportedGame(user.id, account.id, { pgn: '1. e5 e4' });

    const missing = await GameOpeningAssignmentService.assignMissingOpening(user.id, missingPgnGame.id);
    const invalid = await GameOpeningAssignmentService.assignMissingOpening(user.id, invalidPgnGame.id);

    assert.equal(missing.status, 'SKIPPED');
    assert.equal(missing.reason, 'PGN_MISSING');
    assert.equal(invalid.status, 'FAILED');
    assert.equal(invalid.reason, 'PGN_PARSE_FAILED');
  }

  {
    const { user, account } = await createUserWithAccount('tags');
    const game = await createImportedGame(user.id, account.id);

    await GameOpeningAssignmentService.assignMissingOpening(user.id, game.id);
    const refresh = await GameTaggingService.refreshOne(user.id, game.id);
    const updated = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    const gameForTagging = await getImportedGameForTagging(user.id, game.id);
    assert.ok(gameForTagging);

    assert.equal(updated.openingEco !== null, true);
    assert.equal(updated.openingName !== null, true);
    assert.equal(calculateAllTagCodes(gameForTagging).includes(GAME_TAG.OPENING_FAMILY_KNOWN), true);
    assert.equal(refresh.tagCodes.includes(GAME_TAG.OPENING_FAMILY_KNOWN), false);
  }

  console.log('Imported game opening assignment tests passed.');
} finally {
  if (createdUserIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
}
