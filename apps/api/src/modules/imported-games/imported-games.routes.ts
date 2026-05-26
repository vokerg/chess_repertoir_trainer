import { FastifyInstance } from 'fastify';
import { registerOpenApiRoute, registerOpenApiSchemas } from '../../openapi/route-registry';
import { ImportedGamesService } from './imported-games.service';
import { importedGameSearchQuerySchema } from './imported-games.schemas';
import {
  getImportedGameFacetsOpenApiOperation,
  getImportedGameOpenApiOperation,
  getImportedGamePgnOpenApiOperation,
  importedGamesOpenApiSchemas,
  listImportedGamesOpenApiOperation,
} from './imported-games.openapi';

function parseGameId(params: unknown): number | null {
  const gameId = Number((params as any).gameId);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

export default async function importedGamesModule(app: FastifyInstance) {
  registerOpenApiSchemas(importedGamesOpenApiSchemas);

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games',
    operation: listImportedGamesOpenApiOperation,
    handler: async (request, reply) => {
      const parsed = importedGameSearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
      }

      try {
        return await ImportedGamesService.search(parsed.data);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games/facets',
    operation: getImportedGameFacetsOpenApiOperation,
    handler: async () => ImportedGamesService.facets(),
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games/:gameId',
    operation: getImportedGameOpenApiOperation,
    handler: async (request, reply) => {
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const game = await ImportedGamesService.get(gameId);
      if (!game) {
        reply.code(404);
        return { message: 'Imported game not found' };
      }
      return game;
    },
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games/:gameId/pgn',
    operation: getImportedGamePgnOpenApiOperation,
    handler: async (request, reply) => {
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const game = await ImportedGamesService.getPgn(gameId);
      if (!game) {
        reply.code(404);
        return { message: 'Imported game not found' };
      }
      return game;
    },
  });
}
