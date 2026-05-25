import { FastifyInstance } from 'fastify';
import { analyzeImportedGameSchema } from './analysis.schemas';
import { GameAnalysisService } from './game-analysis.service';

export default async function analysisModule(app: FastifyInstance) {
  app.post('/api/imported-games/:gameId/analysis-runs', async (request, reply) => {
    const gameId = Number((request.params as any).gameId);
    if (!Number.isInteger(gameId) || gameId <= 0) {
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
  });
}
