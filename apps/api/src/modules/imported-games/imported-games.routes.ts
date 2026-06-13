import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/request-auth';
import { registerOpenApiRoute, registerOpenApiSchemas } from '../../openapi/route-registry';
import { ImportedGamesService } from './imported-games.service';
import { importedGameSearchQuerySchema, openingAnalysisQuerySchema } from './imported-games.schemas';
import { ImportedGamePlyIndexService } from './ply-index.service';
import { OpeningAnalysisService } from './opening-analysis.service';
import {
  getImportedGameFacetsOpenApiOperation,
  getImportedGameOpenApiOperation,
  getImportedGamePgnOpenApiOperation,
  getOpeningAnalysisOpenApiOperation,
  importedGamesOpenApiSchemas,
  indexImportedGamePlyOpenApiOperation,
  listImportedGamesOpenApiOperation,
} from './imported-games.openapi';

function parseGameId(params: unknown): number | null {
  const gameId = Number((params as any).gameId);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

function parseForce(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  return (body as any).force === true;
}

export default async function importedGamesModule(app: FastifyInstance) {
  registerOpenApiSchemas(importedGamesOpenApiSchemas);

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games',
    operation: listImportedGamesOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = importedGameSearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
      }

      try {
        return await ImportedGamesService.search(auth.userId, parsed.data);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/opening-analysis',
    operation: getOpeningAnalysisOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = openingAnalysisQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
      }

      try {
        return await OpeningAnalysisService.getPosition(auth.userId, parsed.data);
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
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return ImportedGamesService.facets(auth.userId);
    },
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games/:gameId',
    operation: getImportedGameOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const game = await ImportedGamesService.get(auth.userId, gameId);
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
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const game = await ImportedGamesService.getPgn(auth.userId, gameId);
      if (!game) {
        reply.code(404);
        return { message: 'Imported game not found' };
      }
      return game;
    },
  });

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/imported-games/:gameId/ply-index',
    operation: indexImportedGamePlyOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      try {
        const result = await ImportedGamePlyIndexService.indexOne(auth.userId, gameId, { force: parseForce(request.body) });
        if (result.status === 'INDEXED') reply.code(201);
        if (result.status === 'FAILED') reply.code(400);
        return result;
      } catch (err: any) {
        const message = err?.message ?? String(err);
        if (message === 'Imported game not found') {
          reply.code(404);
          return { error: message };
        }
        reply.code(400);
        return { error: message };
      }
    },
  });
}
