import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CurrentAppUserService } from '../auth/current-app-user.service';
import { requireAuth } from '../auth/request-auth';
import { ExternalAccountService } from '../services/externalAccountService';
import { AccountRatingHistoryService, RatingSpeed } from '../services/accountRatingHistoryService';
import { AccountPerformanceStatsService } from '../services/accountPerformanceStatsService';
import { AccountRatingStatsService } from '../services/accountRatingStatsService';
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

const ratingSpeedSchema = z.enum(['bullet', 'blitz', 'rapid']);
const defaultRatingSpeeds: RatingSpeed[] = ['bullet', 'blitz', 'rapid'];

const ratingHistoryQuerySchema = z.object({
  from: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid from date').optional(),
  to: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid to date').optional(),
  speeds: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return defaultRatingSpeeds;

      const speeds = value
        .split(',')
        .map((speed) => speed.trim().toLowerCase())
        .filter(Boolean);

      if (speeds.length === 0) return defaultRatingSpeeds;

      const parsedSpeeds: RatingSpeed[] = [];
      for (const speed of speeds) {
        const parsed = ratingSpeedSchema.safeParse(speed);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unsupported speed: ${speed}`,
          });
          return z.NEVER;
        }
        parsedSpeeds.push(parsed.data);
      }

      return Array.from(new Set(parsedSpeeds));
    }),
});

const accountPerformanceStatsQuerySchema = ratingHistoryQuerySchema;

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

  app.get('/api/me/accounts/:id/rating-history', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    const parsed = ratingHistoryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    return AccountRatingHistoryService.getForAccount(auth.userId, account, parsed.data);
  });

  app.get('/api/me/accounts/:id/rating-stats', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return AccountRatingStatsService.getForAccount(auth.userId, id);
  });

  app.get('/api/me/accounts/:id/performance-stats', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    const parsed = accountPerformanceStatsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    return AccountPerformanceStatsService.getForAccount(auth.userId, id, parsed.data);
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
