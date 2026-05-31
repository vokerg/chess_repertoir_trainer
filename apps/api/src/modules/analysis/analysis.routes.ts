import { FastifyInstance } from 'fastify';
import { registerOpenApiRoute, registerOpenApiSchemas } from '../../openapi/route-registry';
import {
  analyzeImportedGameOpenApiOperation,
  analysisOpenApiSchemas,
  getImportedGameAnalysisOpenApiOperation,
  storePositionAnalysisOpenApiOperation,
} from './analysis.openapi';
import { analyzeImportedGameSchema, storePositionAnalysisSchema } from './analysis.schemas';
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
    url: '/api/position-analysis/store',
    operation: storePositionAnalysisOpenApiOperation,
    handler: async (request, reply) => {
      const parsed = storePositionAnalysisSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
      }

      try {
        const position = await PositionAnalysisService.storePositionSearch(parsed.data);
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
        if (!parsed.data.async) {
          reply.code(400);
          return { error: 'Synchronous backend analysis is disabled. Queue analysis and run the executor instead.' };
        }

        const result = await GameAnalysisService.queueImportedGameAnalysis(gameId, parsed.data);
        reply.code(result.reusedExisting ? 200 : 202);
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
