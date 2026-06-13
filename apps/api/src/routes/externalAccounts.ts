import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CurrentAppUserService } from '../auth/current-app-user.service';
import { requireAuth } from '../auth/request-auth';
import { ExternalAccountService } from '../services/externalAccountService';
import { LichessImportService } from '../services/lichessImportService';
import { ChessComImportService } from '../services/chessComImportService';
import { ImportedGamesService } from '../modules/imported-games/imported-games.service';
import { importedGameSearchQuerySchema } from '../modules/imported-games/imported-games.schemas';

const createAccountSchema = z.object({
  provider: z.enum(['LICHESS', 'CHESS_COM']),
  username: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

const updateAccountSchema = z.object({
  displayName: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

const listAccountGamesQuerySchema = importedGameSearchQuerySchema.omit({ accountIds: true }).extend({
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export default async function externalAccountsRoutes(app: FastifyInstance) {
  app.get('/api/me', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    const user = await CurrentAppUserService.getById(auth.userId);
    return { user, auth };
  });

  app.get('/api/me/accounts', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return ExternalAccountService.listForUser(auth.userId);
  });

  app.post('/api/me/accounts', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = createAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    const account = await ExternalAccountService.createForUser(auth.userId, parsed.data);
    reply.code(201);
    return account;
  });

  app.get('/api/me/accounts/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    return account;
  });

  app.patch('/api/me/accounts/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const parsed = updateAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    const account = await ExternalAccountService.updateForUser(auth.userId, id, parsed.data);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    return account;
  });

  app.delete('/api/me/accounts/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.deleteForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return { deleted: true, account };
  });

  app.post('/api/me/accounts/:id/sync', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    try {
      if (account.provider === 'LICHESS') {
        return await LichessImportService.syncAccount(auth.userId, id);
      }
      if (account.provider === 'CHESS_COM') {
        return await ChessComImportService.syncAccount(auth.userId, id);
      }

      reply.code(400);
      return { message: `Unsupported provider: ${account.provider}` };
    } catch (err: any) {
      reply.code(400);
      return { error: err.message ?? String(err) };
    }
  });

  app.post('/api/me/accounts/:id/reset-cursor', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.resetSyncCursorForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return account;
  });

  app.get('/api/me/accounts/:id/games', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    const parsed = listAccountGamesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    const { take, ...query } = parsed.data;
    return ImportedGamesService.search(auth.userId, {
      ...query,
      accountIds: [id],
      limit: take ?? query.limit,
    });
  });
}
