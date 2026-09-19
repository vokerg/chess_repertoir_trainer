import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  openingStrugglesResponseSchema,
  openingStrugglesScopeTooLargeResponseSchema,
} from '@chess-trainer/contracts/opening-struggles';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { openingStrugglesQuerySchema } from './opening-struggles.schema';
import {
  getOpeningStruggles,
  OpeningStrugglesScopeTooLargeError,
} from './opening-struggles.service';

const openingStrugglesModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/opening-struggles', {
    schema: {
      operationId: 'getOpeningStruggles',
      tags: ['Openings'],
      summary: 'Find recurring opening problems and course coverage',
      querystring: openingStrugglesQuerySchema,
      response: {
        200: openingStrugglesResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        422: openingStrugglesScopeTooLargeResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    try {
      return await getOpeningStruggles(auth.userId, request.query);
    } catch (error) {
      if (error instanceof OpeningStrugglesScopeTooLargeError) {
        return reply.code(422).send({
          error: {
            code: error.code,
            message: error.message,
            candidateGames: error.candidateGames,
            maxCandidateGames: error.maxCandidateGames,
          },
        });
      }
      throw error;
    }
  });
};

export default openingStrugglesModule;
