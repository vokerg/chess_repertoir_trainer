import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CurrentUserService } from '../services/currentUserService';
import { ExternalAccountService } from '../services/externalAccountService';
import { LichessImportService } from '../services/lichessImportService';

const createAccountSchema = z.object({
  provider: z.enum(['LICHESS', 'CHESS_COM']),
  username: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

const updateAccountSchema = z.object({
  displayName: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

const listGamesQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export default async function externalAccountsRoutes(app: FastifyInstance) {
  app.get('/api/me', async () => {
    return CurrentUserService.getOrCreate();
  });

  app.get('/api/me/accounts', async () => {
    return ExternalAccountService.listForCurrentUser();
  });

  app.post('/api/me/accounts', async (request, reply) => {
    const parsed = createAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    const account = await ExternalAccountService.createForCurrentUser(parsed.data);
    reply.code(201);
    return account;
  });

  app.get('/api/me/accounts/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForCurrentUser(id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    return account;
  });

  app.patch('/api/me/accounts/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const parsed = updateAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    const account = await ExternalAccountService.updateForCurrentUser(id, parsed.data);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    return account;
  });

  app.post('/api/me/accounts/:id/sync', async (request, reply) => {
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForCurrentUser(id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    if (account.provider !== 'LICHESS') {
      reply.code(400);
      return { message: 'Only Lichess sync is implemented for now' };
    }

    try {
      return await LichessImportService.syncAccount(id);
    } catch (err: any) {
      reply.code(400);
      return { error: err.message ?? String(err) };
    }
  });

  app.get('/api/me/accounts/:id/games', async (request, reply) => {
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForCurrentUser(id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    const parsed = listGamesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    return ExternalAccountService.listGamesForCurrentUser(id, parsed.data.take ?? 50, parsed.data.skip ?? 0);
  });
}