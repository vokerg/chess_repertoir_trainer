import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  importedGameDetailResponseSchema,
  importedGameFacetsResponseSchema,
  importedGamePgnResponseSchema,
  importedGameSearchResponseSchema,
  importedGameTagDefinitionsResponseSchema,
} from '@chess-trainer/contracts/imported-games';
import prismaModule from '../../dist/prisma.js';
import { ImportedGamesService } from '../../dist/modules/imported-games/imported-games.service.js';
import { importedGameSearchQuerySchema } from '../../dist/modules/imported-games/imported-games.schemas.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Imported game contract test',
      authProvider: 'test',
      authSubject: `contract-${suffix}`,
      email: `contract-${suffix}@example.test`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `contract-${suffix}`, displayName: null },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `contract-game-${suffix}`,
      providerUrl: null,
      pgn: null,
      rated: null,
      variant: null,
      speedCategory: null,
      startedAt: null,
      endedAt: new Date('2026-03-04T05:06:07.000Z'),
      whiteUsername: null,
      blackUsername: 'Opponent',
      whiteRating: null,
      blackRating: 1700,
      userColor: 'WHITE',
      opponentUsername: 'Opponent',
      result: '0-1',
      resultForUser: 'LOSS',
      status: 'finished',
      openingName: null,
      openingEco: null,
    },
  });

  const query = importedGameSearchQuerySchema.parse({});
  const search = await ImportedGamesService.search(userId, query);
  const parsedSearch = importedGameSearchResponseSchema.parse(search);
  const encodedSearch = z.encode(importedGameSearchResponseSchema, parsedSearch);
  assert.equal(parsedSearch.items.length, 1);
  assert.equal(encodedSearch.appliedFilters.sort, 'endedAtDesc');
  assert.equal(parsedSearch.items[0].endedAt, '2026-03-04T05:06:07.000Z');
  assert.equal(parsedSearch.items[0].startedAt, null);
  assert.equal(parsedSearch.items[0].white.username, null);
  assert.equal(parsedSearch.items[0].analysis.status, 'NOT_ANALYZED');

  const detail = await ImportedGamesService.get(userId, game.id);
  assert.ok(detail);
  assert.equal(importedGameDetailResponseSchema.parse(detail).pgn, null);
  assert.deepEqual(importedGamePgnResponseSchema.parse(await ImportedGamesService.getPgn(userId, game.id)), {
    id: game.id,
    pgn: null,
  });
  importedGameFacetsResponseSchema.parse(await ImportedGamesService.facets(userId));
  importedGameTagDefinitionsResponseSchema.parse(await ImportedGamesService.tagDefinitions());

  assert.equal(importedGameSearchResponseSchema.safeParse({
    pageInfo: parsedSearch.pageInfo,
    appliedFilters: parsedSearch.appliedFilters,
  }).success, false);

  console.log('Imported games contract tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
