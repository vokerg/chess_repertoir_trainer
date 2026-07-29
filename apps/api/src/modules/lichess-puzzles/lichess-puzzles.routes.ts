import type { FastifyReply } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createLichessPuzzleRoundBodySchema,
  createLichessPuzzleRoundResponseSchema,
  lichessPuzzleErrorResponseSchema,
  lichessPuzzleRoundActionResponseSchema,
  lichessPuzzleRoundIdParamsSchema,
  submitLichessPuzzleMoveBodySchema,
  submitLichessPuzzleMoveResponseSchema,
} from '@chess-trainer/contracts/lichess-puzzles';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { LichessPuzzleRoundError } from './lichess-puzzles.errors';
import { LichessPuzzlesService } from './lichess-puzzles.service';

const standardErrorResponses = {
  401: unauthorizedResponseSchema,
  404: lichessPuzzleErrorResponseSchema,
  409: lichessPuzzleErrorResponseSchema,
  429: lichessPuzzleErrorResponseSchema,
  502: lichessPuzzleErrorResponseSchema,
};

const lichessPuzzlesModule: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/lichess-puzzles/rounds', {
    schema: {
      operationId: 'createLichessPuzzleRound',
      tags: ['Lichess puzzles'],
      summary: 'Start a persisted Lichess puzzle round',
      body: createLichessPuzzleRoundBodySchema,
      response: {
        200: createLichessPuzzleRoundResponseSchema,
        400: z.union([validationErrorResponseSchema, lichessPuzzleErrorResponseSchema]),
        ...standardErrorResponses,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await LichessPuzzlesService.createRound(auth.userId, request.body);
    } catch (error) {
      return sendExpectedError(reply, error);
    }
  });

  app.get('/api/lichess-puzzles/rounds/:roundId', {
    schema: {
      operationId: 'getLichessPuzzleRound',
      tags: ['Lichess puzzles'],
      summary: 'Get one owned Lichess puzzle round',
      params: lichessPuzzleRoundIdParamsSchema,
      response: {
        200: lichessPuzzleRoundActionResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: lichessPuzzleErrorResponseSchema,
        409: lichessPuzzleErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await LichessPuzzlesService.getRound(auth.userId, request.params.roundId);
    } catch (error) {
      return sendExpectedError(reply, error);
    }
  });

  app.post('/api/lichess-puzzles/rounds/:roundId/moves', {
    schema: {
      operationId: 'submitLichessPuzzleMove',
      tags: ['Lichess puzzles'],
      summary: 'Submit the next user move in a Lichess puzzle round',
      params: lichessPuzzleRoundIdParamsSchema,
      body: submitLichessPuzzleMoveBodySchema,
      response: {
        200: submitLichessPuzzleMoveResponseSchema,
        400: z.union([validationErrorResponseSchema, lichessPuzzleErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        404: lichessPuzzleErrorResponseSchema,
        409: lichessPuzzleErrorResponseSchema,
        429: lichessPuzzleErrorResponseSchema,
        502: lichessPuzzleErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await LichessPuzzlesService.submitMove(
        auth.userId,
        request.params.roundId,
        request.body,
      );
    } catch (error) {
      return sendExpectedError(reply, error);
    }
  });

  app.post('/api/lichess-puzzles/rounds/:roundId/abandon', {
    schema: {
      operationId: 'abandonLichessPuzzleRound',
      tags: ['Lichess puzzles'],
      summary: 'Abandon a persisted Lichess puzzle round',
      description: 'Bodyless action. A round abandoned before any wrong move is not submitted to Lichess.',
      params: lichessPuzzleRoundIdParamsSchema,
      response: {
        200: lichessPuzzleRoundActionResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: lichessPuzzleErrorResponseSchema,
        409: lichessPuzzleErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await LichessPuzzlesService.abandonRound(auth.userId, request.params.roundId);
    } catch (error) {
      return sendExpectedError(reply, error);
    }
  });

  app.post('/api/lichess-puzzles/rounds/:roundId/retry-sync', {
    schema: {
      operationId: 'retryLichessPuzzleRoundSync',
      tags: ['Lichess puzzles'],
      summary: 'Retry synchronization of a persisted puzzle result',
      description: 'Bodyless action. The already persisted immutable upstream outcome is reused.',
      params: lichessPuzzleRoundIdParamsSchema,
      response: {
        200: lichessPuzzleRoundActionResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: lichessPuzzleErrorResponseSchema,
        409: lichessPuzzleErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await LichessPuzzlesService.retrySync(auth.userId, request.params.roundId);
    } catch (error) {
      return sendExpectedError(reply, error);
    }
  });
};

function sendExpectedError(reply: FastifyReply, error: unknown) {
  if (!(error instanceof LichessPuzzleRoundError)) throw error;
  return reply.code(error.statusCode).send({
    error: error.message,
    code: error.code,
  });
}

export default lichessPuzzlesModule;
