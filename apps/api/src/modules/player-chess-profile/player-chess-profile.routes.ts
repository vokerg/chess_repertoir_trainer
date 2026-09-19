import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  playerChessProfileErrorResponseSchema,
  playerChessProfileQuerySchema,
  playerChessProfileResponseSchema,
} from '@chess-trainer/contracts/player-chess-profile';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  InvalidPlayerChessProfileRangeError,
  PlayerChessProfileService,
} from './player-chess-profile.service';

const playerChessProfileModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'GET',
    url: '/api/player-chess-profile',
    schema: {
      operationId: 'getPlayerChessProfile',
      tags: ['Player chess profile'],
      summary: 'Calculate the authenticated player chess profile',
      description: 'Returns deterministic preference and performance summaries from filtered imported games, completed player-level evidence, side-aware opening classification, explicit analysis coverage, and bounded supporting openings and games.',
      querystring: playerChessProfileQuerySchema,
      response: {
        200: playerChessProfileResponseSchema,
        400: z.union([validationErrorResponseSchema, playerChessProfileErrorResponseSchema]),
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await PlayerChessProfileService.get(auth.userId, request.query);
      } catch (error) {
        if (error instanceof InvalidPlayerChessProfileRangeError) {
          reply.code(400);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });
};

export default playerChessProfileModule;
