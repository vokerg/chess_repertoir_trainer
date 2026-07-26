import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  openingExplorerErrorResponseSchema,
  lichessGamesExplorerQuerySchema,
  openingExplorerQuerySchema,
  openingExplorerResponseSchema,
} from '@chess-trainer/contracts/opening-explorer';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  InvalidOpeningExplorerFenError,
  LichessGamesExplorerService,
  LichessGamesExplorerUnavailableError,
  MastersExplorerService,
  MastersExplorerUnavailableError,
} from './opening-explorer.service';

const openingExplorerModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'GET',
    url: '/api/masters-explorer',
    schema: {
      operationId: 'getMastersExplorerPosition',
      tags: ['Masters explorer'],
      summary: 'Get master-game statistics for a chess position',
      description: 'Returns system-wide Lichess Masters statistics from the shared opening-explorer cache, refreshing data older than 30 days before responding when Lichess is available.',
      querystring: openingExplorerQuerySchema,
      response: {
        200: openingExplorerResponseSchema,
        400: z.union([validationErrorResponseSchema, openingExplorerErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        503: openingExplorerErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await MastersExplorerService.getPosition(request.query.fen, auth.userId);
      } catch (error) {
        if (error instanceof InvalidOpeningExplorerFenError) {
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

  app.route({
    method: 'GET',
    url: '/api/lichess-games-explorer',
    schema: {
      operationId: 'getLichessGamesExplorerPosition',
      tags: ['Lichess games explorer'],
      summary: 'Get aggregated rated-game statistics for a chess position',
      description: 'Returns system-wide rated Lichess-game statistics from the shared opening-explorer cache, refreshing data older than 30 days before responding when Lichess is available.',
      querystring: lichessGamesExplorerQuerySchema,
      response: {
        200: openingExplorerResponseSchema,
        400: z.union([validationErrorResponseSchema, openingExplorerErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        503: openingExplorerErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await LichessGamesExplorerService.getPosition(
          request.query.fen,
          auth.userId,
          request.query,
        );
      } catch (error) {
        if (error instanceof InvalidOpeningExplorerFenError) {
          reply.code(400);
          return { error: error.message, code: error.code };
        }
        if (error instanceof LichessGamesExplorerUnavailableError) {
          reply.code(503);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });
};

export default openingExplorerModule;
