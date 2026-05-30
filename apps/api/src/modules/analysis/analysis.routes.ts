import { FastifyInstance } from 'fastify';
import { registerOpenApiRoute, registerOpenApiSchemas } from '../../openapi/route-registry';
import {
  analyzeImportedGameOpenApiOperation,
  analyzePositionOpenApiOperation,
  analysisOpenApiSchemas,
  getImportedGameAnalysisOpenApiOperation,
} from './analysis.openapi';
import { analyzeImportedGameSchema, analyzePositionSchema } from './analysis.schemas';
import { GameAnalysisService } from './game-analysis.service';
import { PositionAnalysisService } from './position-analysis.service';

function parseGameId(params: unknown): number | null {
  const gameId = Number((params as any).gameId);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

export default async function analysisModule(app: FastifyInstance) {
  registerOpenApiSchemas(analysisOpenApiSchemas);

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/position-analysis',
    operation: analyzePositionOpenApiOperation,
    handler: async (request, reply) => {
      const parsed = analyzePositionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
      }

      try {
        const position = await PositionAnalysisService.analyzePositionSearch(parsed.data);
        return { position };
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games/:gameId/analysis',
    operation: getImportedGameAnalysisOpenApiOperation,
    handler: async (request, reply) => {
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      try {
        return await GameAnalysisService.getImportedGameAnalysis(gameId);
      } catch (err: any) {
        const message = err?.message ?? String(err);
        if (message === 'Imported game not found' || message === 'Imported game analysis not found') {
          reply.code(404);
          return { error: message };
        }
        reply.code(400);
        return { error: message };
      }
    },
  });

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/imported-games/:gameId/analysis-runs',
    operation: analyzeImportedGameOpenApiOperation,
    handler: async (request, reply) => {
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const parsed = analyzeImportedGameSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
      }

      try {
        const result = await GameAnalysisService.analyzeImportedGame(gameId, parsed.data);
        reply.code(result.reusedExisting ? 200 : 201);
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
