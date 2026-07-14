import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import { apiErrorResponseSchema, validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { openingAnalysisQuerySchema } from './imported-games.schemas';
import { OpeningAnalysisBreakdownsService } from './opening-analysis-breakdowns.service';

const openingAnalysisBreakdownsResponseSchema = z.object({
  fen: z.string(),
  normalizedFen: z.string(),
  openings: z.array(z.object({
    name: z.string(),
    games: z.number().int().nonnegative(),
  })),
  appliedFilters: z.record(z.string(), z.unknown()),
});

const openingAnalysisBreakdownsModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'GET',
    url: '/api/opening-analysis/breakdowns',
    schema: {
      operationId: 'getOpeningAnalysisBreakdowns',
      tags: ['Imported games'],
      summary: 'Get filter breakdowns for an opening position',
      description: 'Returns SQL-grouped opening-name counts for distinct filtered games reaching the position. The breakdown ignores the active opening filter so another opening can be selected.',
      querystring: openingAnalysisQuerySchema,
      response: {
        200: openingAnalysisBreakdownsResponseSchema,
        400: apiErrorResponseSchema,
        401: unauthorizedResponseSchema,
        422: validationErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await OpeningAnalysisBreakdownsService.getBreakdowns(auth.userId, request.query, request.log);
      } catch (error: any) {
        reply.code(400);
        return { error: error?.message ?? String(error) };
      }
    },
  });
};

export default openingAnalysisBreakdownsModule;
