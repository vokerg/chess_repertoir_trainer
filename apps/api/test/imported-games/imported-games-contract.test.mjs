import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  importedGameDetailResponseSchema,
  importedGameFacetsResponseSchema,
  importedGameIndexWorkflowResponseSchema,
  importedGamePgnResponseSchema,
  importedGameSearchResponseSchema,
  importedGameTagDefinitionsResponseSchema,
  importedGameTagsRefreshResponseSchema,
} from '@chess-trainer/contracts/imported-games';
import prismaModule from '../../dist/prisma.js';
import importedGamesModule from '../../dist/modules/imported-games/imported-games.routes.js';
import { ImportedGameIndexWorkflowService } from '../../dist/modules/imported-games/imported-game-index-workflow.service.js';
import { ImportedGamesService } from '../../dist/modules/imported-games/imported-games.service.js';
import { importedGameSearchQuerySchema } from '../../dist/modules/imported-games/imported-games.schemas.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;
let app;

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
  assert.equal(parsedSearch.items[0].white.username, null);
  assert.equal(parsedSearch.items[0].analysis.status, 'NOT_ANALYZED');
  assert.equal(parsedSearch.items[0].tagCount, 0);
  assert.equal('startedAt' in parsedSearch.items[0], false);
  assert.equal('tags' in parsedSearch.items[0], false);
  assert.equal('tagCodes' in parsedSearch.items[0], false);
  assert.equal('summary' in parsedSearch.items[0].analysis, false);

  const detail = await ImportedGamesService.get(userId, game.id);
  assert.ok(detail);
  assert.equal(importedGameDetailResponseSchema.parse(detail).pgn, null);
  assert.deepEqual(importedGamePgnResponseSchema.parse(await ImportedGamesService.getPgn(userId, game.id)), {
    id: game.id,
    pgn: null,
  });
  importedGameFacetsResponseSchema.parse(await ImportedGamesService.facets(userId));
  importedGameTagDefinitionsResponseSchema.parse(await ImportedGamesService.tagDefinitions());

  const refreshedTags = await ImportedGamesService.refreshTags(userId, game.id);
  const parsedTags = importedGameTagsRefreshResponseSchema.parse(refreshedTags);
  assert.equal(parsedTags.importedGameId, game.id);
  assert.deepEqual(parsedTags.tagCodes, refreshedTags.tagCodes);
  assert.deepEqual(parsedTags.tags, refreshedTags.tags);

  const skippedIndex = await ImportedGameIndexWorkflowService.indexGame(userId, game.id);
  assert.deepEqual(importedGameIndexWorkflowResponseSchema.parse(skippedIndex), {
    importedGameId: game.id,
    eligible: false,
    speedCategory: null,
    skippedReason: 'UNSUPPORTED_SPEED_CATEGORY',
  });

  const indexedResponse = {
    importedGameId: game.id,
    eligible: true,
    speedCategory: 'blitz',
    plyIndex: {
      importedGameId: game.id,
      status: 'INDEXED',
      pliesIndexed: 42,
      plyIndexedAt: '2026-03-04T05:07:08.000Z',
    },
    openingAssignment: {
      importedGameId: game.id,
      status: 'ASSIGNED',
      openingEco: 'B20',
      openingName: 'Sicilian Defence',
    },
  };
  assert.deepEqual(importedGameIndexWorkflowResponseSchema.parse(indexedResponse), indexedResponse);
  assert.equal(importedGameIndexWorkflowResponseSchema.safeParse({
    importedGameId: game.id,
    eligible: false,
    speedCategory: 'rapid',
    skippedReason: 'UNSUPPORTED_VARIANT',
  }).success, true);
  assert.equal(importedGameIndexWorkflowResponseSchema.safeParse({
    ...indexedResponse,
    plyIndex: { ...indexedResponse.plyIndex, plyIndexedAt: new Date('2026-03-04T05:07:08.000Z') },
  }).success, false);
  assert.equal(importedGameIndexWorkflowResponseSchema.safeParse({
    importedGameId: game.id,
    eligible: false,
    skippedReason: 'UNSUPPORTED_SPEED_CATEGORY',
  }).success, false);
  assert.equal(importedGameIndexWorkflowResponseSchema.safeParse({
    ...indexedResponse,
    plyIndex: { ...indexedResponse.plyIndex, pliesIndexed: null },
  }).success, false);
  assert.equal(importedGameTagsRefreshResponseSchema.safeParse({
    importedGameId: game.id,
    tagCodes: [1, 'bad'],
    tags: [],
  }).success, false);

  const failedGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `contract-failed-index-${suffix}`,
      pgn: null,
      variant: 'standard',
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'LOSS',
      status: 'finished',
    },
  });

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId,
      provider: 'dev',
      externalSubject: `contract-${suffix}`,
    };
  });
  await app.register(importedGamesModule);

  const failedIndexResponse = await app.inject({
    method: 'POST',
    url: `/api/imported-games/${failedGame.id}/ply-index`,
    payload: {},
  });
  assert.equal(failedIndexResponse.statusCode, 400);
  assert.deepEqual(failedIndexResponse.json(), {
    error: 'Imported game has no PGN to index',
  });

  assert.equal(importedGameSearchResponseSchema.safeParse({
    pageInfo: parsedSearch.pageInfo,
    appliedFilters: parsedSearch.appliedFilters,
  }).success, false);

  console.log('Imported games contract tests passed.');
} finally {
  if (app) await app.close();
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
