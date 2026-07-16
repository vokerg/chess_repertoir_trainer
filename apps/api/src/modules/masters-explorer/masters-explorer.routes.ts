import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  mastersExplorerErrorResponseSchema,
  mastersExplorerQuerySchema,
  mastersExplorerResponseSchema,
} from '@chess-trainer/contracts/masters-explorer';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  InvalidMastersExplorerFenError,
  MastersExplorerService,
  MastersExplorerUnavailableError,
} from './masters-explorer.service';

const mastersExplorerModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'GET',
    url: '/api/masters-explorer',
    schema: {
      operationId: 'getMastersExplorerPosition',
      tags: ['Masters explorer'],
      summary: 'Get master-game statistics for a chess position',
      description: 'Returns system-wide Lichess Masters statistics from the persistent cache, refreshing data older than 30 days before responding when Lichess is available.',
      querystring: mastersExplorerQuerySchema,
      response: {
        200: mastersExplorerResponseSchema,
        400: z.union([validationErrorResponseSchema, mastersExplorerErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        503: mastersExplorerErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await MastersExplorerService.getPosition(request.query.fen, auth.userId);
      } catch (error) {
        if (error instanceof InvalidMastersExplorerFenError) {
          reply.code(400);
          return { error: error.message, code: error.code };
        }
        if (error instanceof MastersExplorerUnavailableError) {
          reply.code(503);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });
};

export default mastersExplorerModule;
