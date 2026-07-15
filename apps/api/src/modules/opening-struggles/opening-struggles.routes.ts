import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { legacyOpaqueResponseSchema, unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { openingStrugglesQuerySchema } from './opening-struggles.schema';
import { getOpeningStruggles } from './opening-struggles.service';

const openingStrugglesModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/opening-struggles', {
    schema: {
      operationId: 'getOpeningStruggles',
      tags: ['Openings'],
      summary: 'Find opening lines with poor results or move quality',
      querystring: openingStrugglesQuerySchema,
      response: {
        200: legacyOpaqueResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getOpeningStruggles(auth.userId, request.query);
  });
};

export default openingStrugglesModule;
