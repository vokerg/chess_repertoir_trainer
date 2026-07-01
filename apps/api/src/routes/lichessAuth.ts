import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/request-auth';
import { LichessConnectionService, LichessOAuthError } from '../services/lichessConnectionService';

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export default async function lichessAuthRoutes(app: FastifyInstance) {
  app.get('/api/me/lichess-connection', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    return LichessConnectionService.getStatusForUser(auth.userId);
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
      return reply.redirect(`${readWebAppUrl()}/accounts?lichessConnected=1`);
    } catch (error) {
      if (error instanceof LichessOAuthError) {
        return reply.redirect(`${readWebAppUrl()}/accounts?lichessConnected=${error.redirectStatus}`);
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
