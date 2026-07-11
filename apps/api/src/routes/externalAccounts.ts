import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
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
import { ImportedGameWorkflowCandidatesService } from '../modules/imported-games/imported-game-workflow-candidates.service';
import { importedGameSearchQuerySchema } from '../modules/imported-games/imported-games.schemas';
import {
  apiErrorResponseSchema,
  legacyOpaqueResponseSchema,
  messageResponseSchema,
  unauthorizedResponseSchema,
} from './legacy-route.schemas';
import { validationErrorResponseSchema } from './api-error.schemas';

const createAccountSchema = z.object({
  provider: z.enum(['LICHESS', 'CHESS_COM']),
  username: z.string().min(1),
  displayName: z.string().min(1).optional(),
});

const updateAccountSchema = z.object({
  displayName: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

const defaultProgressAccountSchema = z.object({
  accountId: z.number().int().positive().nullable(),
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
const accountIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
const accountSchema = <T extends Record<string, unknown>>(operationId: string, summary: string, extra: T) => ({
  operationId,
  tags: ['External accounts'],
  summary,
  ...extra,
});

const externalAccountsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/me', {
    schema: accountSchema('getCurrentUser', 'Get the authenticated application user', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    const user = await CurrentAppUserService.getById(auth.userId);
    return { user, auth };
  });

  app.get('/api/me/accounts', {
    schema: accountSchema('listExternalAccounts', 'List external chess accounts', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return ExternalAccountService.listForUser(auth.userId);
  });

  app.post('/api/me/accounts', {
    schema: accountSchema('createExternalAccount', 'Add or reactivate an external chess account', {
      body: createAccountSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const account = await ExternalAccountService.createForUser(auth.userId, request.body);
    reply.code(201);
    return account;
  });

  app.patch('/api/me/default-progress-account', {
    schema: accountSchema('setDefaultProgressAccount', 'Set the default account for progress views', {
      body: defaultProgressAccountSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const result = await ExternalAccountService.setDefaultProgressAccount(auth.userId, request.body.accountId);
    if (!result) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return result;
  });

  app.get('/api/me/accounts/:id', {
    schema: accountSchema('getExternalAccount', 'Get one external chess account', {
      params: accountIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    return account;
  });

  app.get('/api/me/accounts/:id/rating-history', {
    schema: accountSchema('getExternalAccountRatingHistory', 'Get rating history for an external account', {
      params: accountIdParamsSchema,
      querystring: ratingHistoryQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return AccountRatingHistoryService.getForAccount(auth.userId, account, request.query);
  });

  app.get('/api/me/accounts/:id/rating-stats', {
    schema: accountSchema('getExternalAccountRatingStats', 'Get rating statistics for an external account', {
      params: accountIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return AccountRatingStatsService.getForAccount(auth.userId, id);
  });

  app.get('/api/me/accounts/:id/performance-stats', {
    schema: accountSchema('getExternalAccountPerformanceStats', 'Get performance statistics for an external account', {
      params: accountIdParamsSchema,
      querystring: accountPerformanceStatsQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return AccountPerformanceStatsService.getForAccount(auth.userId, id, request.query);
  });

  app.patch('/api/me/accounts/:id', {
    schema: accountSchema('updateExternalAccount', 'Update external account metadata', {
      params: accountIdParamsSchema,
      body: updateAccountSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.updateForUser(auth.userId, id, request.body);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }
    return account;
  });

  app.delete('/api/me/accounts/:id', {
    schema: accountSchema('deleteExternalAccount', 'Delete one external account', {
      params: accountIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.deleteForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return { deleted: true, account };
  });

  app.post('/api/me/accounts/:id/sync', {
    schema: accountSchema('syncExternalAccount', 'Synchronize games for an external account', {
      description: 'Bodyless action: provider and cursor state come from the selected account.',
      params: accountIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([apiErrorResponseSchema, messageResponseSchema, validationErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    try {
      let result;
      if (account.provider === 'LICHESS') {
        result = await LichessImportService.syncAccount(auth.userId, id);
      } else if (account.provider === 'CHESS_COM') {
        result = await ChessComImportService.syncAccount(auth.userId, id);
      } else {
        reply.code(400);
        return { message: `Unsupported provider: ${account.provider}` };
      }

      await AccountRatingStatsService.recomputeForAccount(auth.userId, id);
      return result;
    } catch (err: any) {
      reply.code(400);
      return { error: err.message ?? String(err) };
    }
  });

  app.get('/api/me/accounts/:id/imported-game-workflow-candidates', {
    schema: accountSchema('getImportedGameWorkflowCandidates', 'List standard workflow candidates for an external account', {
      params: accountIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return ImportedGameWorkflowCandidatesService.forAccount(auth.userId, id);
  });

  app.post('/api/me/accounts/:id/reset-cursor', {
    schema: accountSchema('resetExternalAccountSyncCursor', 'Reset the sync cursor for an external account', {
      description: 'Bodyless action: resets the persisted cursor for the selected account.',
      params: accountIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.resetSyncCursorForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    return account;
  });

  app.get('/api/me/accounts/:id/games', {
    schema: accountSchema('listExternalAccountGames', 'Search imported games for one external account', {
      params: accountIdParamsSchema,
      querystring: listAccountGamesQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const account = await ExternalAccountService.getForUser(auth.userId, id);
    if (!account) {
      reply.code(404);
      return { message: 'External account not found' };
    }

    const { take, ...query } = request.query;
    return ImportedGamesService.search(auth.userId, {
      ...query,
      accountIds: [id],
      limit: take ?? query.limit,
    });
  });
};

export default externalAccountsRoutes;
