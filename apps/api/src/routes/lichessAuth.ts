import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/request-auth';
import {
  LichessBotChallengeError,
  LichessBotChallengeService,
} from '../services/lichessBotChallengeService';
import { LichessConnectionService, LichessOAuthError } from '../services/lichessConnectionService';

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

export default async function lichessAuthRoutes(app: FastifyInstance) {
  app.get('/api/me/lichess-connection', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessConnectionService.getStatusForUser(auth.userId);
  });

  app.get('/api/me/lichess/bot-challenge-options', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessBotChallengeService.getOptions();
  });

  app.post('/api/me/lichess/challenge-bot', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    const parsed = challengeBotSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    try {
      return await LichessBotChallengeService.challengeBot(auth.userId, parsed.data);
    } catch (error) {
      if (error instanceof LichessBotChallengeError) {
        reply.code(error.statusCode);
        return { error: error.message };
      }

      throw error;
    }
  });

  app.post('/api/me/lichess-connection/start', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    const url = await LichessConnectionService.createAuthorizationUrl(auth.userId);
    return { url };
  });

  app.get('/api/auth/lichess/callback', async (request, reply) => {
    const parsed = callbackQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.errors });
    }

    try {
      await LichessConnectionService.handleCallback(parsed.data);
      return reply.redirect(`${readWebAppUrl()}/settings/lichess?lichessConnected=1`);
    } catch (error) {
      if (error instanceof LichessOAuthError) {
        return reply.redirect(`${readWebAppUrl()}/settings/lichess?lichessConnected=${error.redirectStatus}`);
      }

      throw error;
    }
  });

  app.delete('/api/me/lichess-connection', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessConnectionService.disconnectForUser(auth.userId);
  });
}

function readWebAppUrl(): string {
  return process.env['WEB_APP_URL'] || 'http://localhost:4200';
}
