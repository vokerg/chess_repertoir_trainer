import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  gameLibrariesResponseSchema, gameLibrarySchema, gameLibraryNameSchema,
  gameLibraryParamsSchema, gameLibraryEntryParamsSchema, gameLikeBodySchema,
  gameLibraryMutationResponseSchema, importedGameIdParamsSchema,
} from '@chess-trainer/contracts/imported-games';
import { requireAuth } from '../../auth/request-auth';
import { apiErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { GameLibrariesService as service } from './game-libraries.service';

const errors = { 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema };
const mutationResponse = { 200: gameLibraryMutationResponseSchema, ...errors };
const tags = ['Imported games'];

const gameLibrariesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/game-libraries', { schema: {
    operationId: 'listGameLibraries', tags, summary: 'List current user game libraries and counts',
    response: { 200: gameLibrariesResponseSchema, 401: unauthorizedResponseSchema },
  } }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return service.list(auth.userId);
  });
  app.post('/api/game-libraries', { schema: {
    operationId: 'createGameLibrary', tags, summary: 'Create a game library', body: gameLibraryNameSchema,
    response: { 201: gameLibrarySchema, 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema },
  } }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const library = await service.create(auth.userId, request.body.name);
    return reply.code(201).send(library);
  });
  app.patch('/api/game-libraries/:libraryId', { schema: {
    operationId: 'renameGameLibrary', tags, summary: 'Rename an owned game library',
    params: gameLibraryParamsSchema, body: gameLibraryNameSchema, response: mutationResponse,
  } }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    if (!await service.rename(auth.userId, request.params.libraryId, request.body.name))
      return reply.code(404).send({ error: 'Game library not found' });
    return { success: true as const };
  });
  app.delete('/api/game-libraries/:libraryId', { schema: {
    operationId: 'deleteGameLibrary', tags, summary: 'Delete a library without deleting its games',
    params: gameLibraryParamsSchema, response: mutationResponse,
  } }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    if (!await service.remove(auth.userId, request.params.libraryId))
      return reply.code(404).send({ error: 'Game library not found' });
    return { success: true as const };
  });
  app.put('/api/imported-games/:gameId/like', { schema: {
    operationId: 'setImportedGameLike', tags, summary: 'Like or unlike an owned imported game',
    params: importedGameIdParamsSchema, body: gameLikeBodySchema, response: mutationResponse,
  } }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    if (!await service.like(auth.userId, request.params.gameId, request.body.liked))
      return reply.code(404).send({ error: 'Imported game not found' });
    return { success: true as const };
  });
  for (const method of ['PUT', 'DELETE'] as const) {
    app.route({ method, url: '/api/game-libraries/:libraryId/games/:gameId', schema: {
      operationId: method === 'PUT' ? 'addGameToLibrary' : 'removeGameFromLibrary', tags,
      summary: method === 'PUT' ? 'Add an owned game to an owned library' : 'Remove a game from a library',
      description: method === 'PUT'
        ? 'The library and game path parameters fully identify the membership to add; no request body is required.'
        : 'The library and game path parameters fully identify the membership to remove.',
      params: gameLibraryEntryParamsSchema, response: mutationResponse,
    }, handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      if (!await service.setMembership(auth.userId, request.params.libraryId, request.params.gameId, method === 'PUT'))
        return reply.code(404).send({ error: 'Game library or imported game not found' });
      return { success: true as const };
    } });
  }
};
export default gameLibrariesRoutes;
