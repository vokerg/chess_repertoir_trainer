import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../auth/request-auth';
import {
  LichessBotChallengeError,
  LichessBotChallengeService,
} from '../services/lichessBotChallengeService';
import { LichessConnectionService, LichessOAuthError } from '../services/lichessConnectionService';
import { apiErrorResponseSchema, legacyOpaqueResponseSchema, unauthorizedResponseSchema } from './legacy-route.schemas';
import { validationErrorResponseSchema } from './api-error.schemas';

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const challengeBotSchema = z.object({
  username: z.string().trim().min(1),
  fen: z.string().trim().min(1),
  color: z.enum(['white', 'black', 'random']).optional().default('white'),
  rated: z.literal(false).optional().default(false),
  clock: z
    .object({
      limit: z.number().int().positive(),
      increment: z.number().int().min(0),
    })
    .optional(),
});

const redirectResponseSchema = z.never().meta({
  description: 'Redirect with no response body.',
  headers: {
    Location: { description: 'Angular settings URL containing the OAuth result.', type: 'string', format: 'uri' },
  },
});
const lichessSchema = <T extends Record<string, unknown>>(operationId: string, summary: string, extra: T) => ({ operationId, tags: ['Lichess'], summary, ...extra });

const lichessAuthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/me/lichess-connection', {
    schema: lichessSchema('getLichessConnection', 'Get the current user Lichess connection status', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessConnectionService.getStatusForUser(auth.userId);
  });

  app.get('/api/me/lichess/bot-challenge-options', {
    schema: lichessSchema('getLichessBotChallengeOptions', 'Get available Lichess bot challenge settings', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessBotChallengeService.getOptions();
  });

  app.post('/api/me/lichess/challenge-bot', {
    schema: lichessSchema('challengeLichessBot', 'Challenge a configured Lichess bot', {
      body: challengeBotSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 409: apiErrorResponseSchema, 502: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    try {
      return await LichessBotChallengeService.challengeBot(auth.userId, request.body);
    } catch (error) {
      if (error instanceof LichessBotChallengeError) {
        reply.code(error.statusCode as 400 | 409 | 502);
        return { error: error.message };
      }

      throw error;
    }
  });

  app.post('/api/me/lichess-connection/start', {
    schema: lichessSchema('startLichessConnection', 'Start the Lichess OAuth connection flow', {
      description: 'Bodyless action: creates an authorization URL for the authenticated user.',
      response: { 200: z.object({ url: z.url() }), 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    const url = await LichessConnectionService.createAuthorizationUrl(auth.userId);
    return { url };
  });

  app.get('/api/auth/lichess/callback', {
    schema: lichessSchema('completeLichessConnection', 'Complete the Lichess OAuth callback', {
      querystring: callbackQuerySchema,
      response: { 302: redirectResponseSchema, 400: validationErrorResponseSchema },
    }),
  }, async (request, reply) => {
    try {
      await LichessConnectionService.handleCallback(request.query);
      return reply.redirect(`${readWebAppUrl()}/settings/lichess?lichessConnected=1`);
    } catch (error) {
      if (error instanceof LichessOAuthError) {
        return reply.redirect(`${readWebAppUrl()}/settings/lichess?lichessConnected=${error.redirectStatus}`);
      }

      throw error;
    }
  });

  app.delete('/api/me/lichess-connection', {
    schema: lichessSchema('disconnectLichessAccount', 'Disconnect the current user Lichess account', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessConnectionService.disconnectForUser(auth.userId);
  });
};

export default lichessAuthRoutes;

function readWebAppUrl(): string {
  return process.env['WEB_APP_URL'] || 'http://localhost:4200';
}
