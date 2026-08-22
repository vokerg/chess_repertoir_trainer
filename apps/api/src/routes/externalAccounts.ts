import type { ExternalAccount as PrismaExternalAccount } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  accountImportErrorResponseSchema,
  createAccountImportRunResponseSchema,
} from '@chess-trainer/contracts';
import { CurrentAppUserService } from '../auth/current-app-user.service';
import { requireAuth } from '../auth/request-auth';
import { ExternalAccountService } from '../services/externalAccountService';
import { AccountRatingHistoryService, RatingSpeed } from '../services/accountRatingHistoryService';
import { AccountPerformanceStatsService } from '../services/accountPerformanceStatsService';
import { AccountRatingStatsService } from '../services/accountRatingStatsService';
import { ImportedGamesService } from '../modules/imported-games/imported-games.service';
import { ImportedGameWorkflowCandidatesService } from '../modules/imported-games/imported-game-workflow-candidates.service';
import { importedGameSearchQuerySchema } from '../modules/imported-games/imported-games.schemas';
import { AccountImportAdmissionBlockedError } from '../modules/account-imports/account-import-admission.guard';
import { AccountImportActiveRunError } from '../modules/account-imports/account-import.repository.prisma';
import {
  AccountImportRangeUnavailableError,
  AccountImportService,
} from '../modules/account-imports/account-import.service';
import {
  legacyOpaqueResponseSchema,
  messageResponseSchema,
  unauthorizedResponseSchema,
} from './legacy-route.schemas';
import { validationErrorResponseSchema } from './api-error.schemas';
import { importedGameSearchResponseSchema } from '@chess-trainer/contracts/imported-games';
import {
  accountPerformanceRatingSpeedSchema,
  accountPerformanceStatsResponseSchema,
  accountRatingHistoryResponseSchema,
  accountRatingStatsResponseSchema,
  defaultProgressAccountResponseSchema,
  externalAccountDeleteResponseSchema,
  externalAccountListResponseSchema,
  externalAccountResponseSchema,
  externalAccountWorkflowSummaryResponseSchema,
} from '@chess-trainer/contracts/external-accounts';

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

const listAccountGamesQuerySchema = importedGameSearchQuerySchema
  .omit({ accountIds: true })
  .extend({
    take: z.coerce.number().int().min(1).max(200).optional(),
  });

const ratingSpeedSchema = accountPerformanceRatingSpeedSchema;
const defaultRatingSpeeds: RatingSpeed[] = ['bullet', 'blitz', 'rapid'];

const ratingHistoryQuerySchema = z.object({
  from: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid from date')
    .optional(),
  to: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid to date')
    .optional(),
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
const accountSchema = <T extends Record<string, unknown>>(
  operationId: string,
  summary: string,
  extra: T,
) => ({
  operationId,
  tags: ['External accounts'],
  summary,
  ...extra,
});

type ExternalAccountWithDefaultFlag = PrismaExternalAccount & {
  isDefaultProgressAccount: boolean;
};

type AccountImportCommandError = {
  statusCode: 409;
  body: {
    error: string;
    code: 'ACCOUNT_IMPORT_ACTIVE' | 'ACCOUNT_IMPORT_ADMISSION_BLOCKED' | 'ACCOUNT_IMPORT_INVALID_RANGE';
  };
};

function toExternalAccountResponse(account: ExternalAccountWithDefaultFlag) {
  return {
    ...account,
    lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
    syncCursorTime: account.syncCursorTime?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

function mapAccountImportCommandError(error: unknown): AccountImportCommandError | null {
  if (error instanceof AccountImportActiveRunError) {
    return {
      statusCode: 409,
      body: { error: error.message, code: 'ACCOUNT_IMPORT_ACTIVE' },
    };
  }
  if (error instanceof AccountImportAdmissionBlockedError) {
    return {
      statusCode: 409,
      body: { error: error.message, code: error.code },
    };
  }
  if (error instanceof AccountImportRangeUnavailableError) {
    return {
      statusCode: 409,
      body: { error: error.message, code: error.code },
    };
  }
  return null;
}

const externalAccountsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/me',
    {
      schema: accountSchema('getCurrentUser', 'Get the authenticated application user', {
        response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      const user = await CurrentAppUserService.getById(auth.userId);
      return { user, auth };
    },
  );

  app.get(
    '/api/me/accounts',
    {
      schema: accountSchema('listExternalAccounts', 'List external chess accounts', {
        response: { 200: externalAccountListResponseSchema, 401: unauthorizedResponseSchema },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const accounts = await ExternalAccountService.listForUser(auth.userId);
      return externalAccountListResponseSchema.parse(accounts.map(toExternalAccountResponse));
    },
  );

  app.post(
    '/api/me/accounts',
    {
      schema: accountSchema(
        'createExternalAccount',
        'Add or reactivate an external chess account',
        {
          body: createAccountSchema,
          response: {
            201: externalAccountResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const account = await ExternalAccountService.createForUser(auth.userId, request.body);
      reply.code(201);
      return externalAccountResponseSchema.parse(toExternalAccountResponse(account));
    },
  );

  app.patch(
    '/api/me/default-progress-account',
    {
      schema: accountSchema(
        'setDefaultProgressAccount',
        'Set the default account for progress views',
        {
          body: defaultProgressAccountSchema,
          response: {
            200: defaultProgressAccountResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const result = await ExternalAccountService.setDefaultProgressAccount(
        auth.userId,
        request.body.accountId,
      );
      if (!result) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      return defaultProgressAccountResponseSchema.parse({
        defaultProgressAccountId: result.defaultProgressAccountId,
        account: result.account ? toExternalAccountResponse(result.account) : null,
        accounts: result.accounts.map(toExternalAccountResponse),
      });
    },
  );

  app.get(
    '/api/me/accounts/:id',
    {
      schema: accountSchema('getExternalAccount', 'Get one external chess account', {
        params: accountIdParamsSchema,
        response: {
          200: externalAccountResponseSchema,
          400: validationErrorResponseSchema,
          401: unauthorizedResponseSchema,
          404: messageResponseSchema,
        },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }
      return externalAccountResponseSchema.parse(toExternalAccountResponse(account));
    },
  );

  app.get(
    '/api/me/accounts/:id/rating-history',
    {
      schema: accountSchema(
        'getExternalAccountRatingHistory',
        'Get rating history for an external account',
        {
          params: accountIdParamsSchema,
          querystring: ratingHistoryQuerySchema,
          response: {
            200: accountRatingHistoryResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      return accountRatingHistoryResponseSchema.parse(
        await AccountRatingHistoryService.getForAccount(auth.userId, account, request.query),
      );
    },
  );

  app.get(
    '/api/me/accounts/:id/rating-stats',
    {
      schema: accountSchema(
        'getExternalAccountRatingStats',
        'Get rating statistics for an external account',
        {
          params: accountIdParamsSchema,
          response: {
            200: accountRatingStatsResponseSchema.nullable(),
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      const stats = await AccountRatingStatsService.getForAccount(auth.userId, id);
      return stats ? accountRatingStatsResponseSchema.parse(stats) : null;
    },
  );

  app.get(
    '/api/me/accounts/:id/performance-stats',
    {
      schema: accountSchema(
        'getExternalAccountPerformanceStats',
        'Get performance statistics for an external account',
        {
          params: accountIdParamsSchema,
          querystring: accountPerformanceStatsQuerySchema,
          response: {
            200: accountPerformanceStatsResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      const stats = await AccountPerformanceStatsService.getForAccount(
        auth.userId,
        id,
        request.query,
      );
      if (!stats) return reply.code(404).send({ message: 'External account not found' });
      return stats;
    },
  );

  app.patch(
    '/api/me/accounts/:id',
    {
      schema: accountSchema('updateExternalAccount', 'Update external account metadata', {
        params: accountIdParamsSchema,
        body: updateAccountSchema,
        response: {
          200: externalAccountResponseSchema,
          400: validationErrorResponseSchema,
          401: unauthorizedResponseSchema,
          404: messageResponseSchema,
        },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.updateForUser(auth.userId, id, request.body);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }
      return externalAccountResponseSchema.parse(toExternalAccountResponse(account));
    },
  );

  app.delete(
    '/api/me/accounts/:id',
    {
      schema: accountSchema('deleteExternalAccount', 'Delete one external account', {
        params: accountIdParamsSchema,
        response: {
          200: externalAccountDeleteResponseSchema,
          400: validationErrorResponseSchema,
          401: unauthorizedResponseSchema,
          404: messageResponseSchema,
        },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.deleteForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      return externalAccountDeleteResponseSchema.parse({
        deleted: true,
        account: toExternalAccountResponse(account),
      });
    },
  );

  app.post(
    '/api/me/accounts/:id/sync',
    {
      schema: accountSchema('syncExternalAccount', 'Queue a durable game refresh for an external account', {
        description: 'Compatibility action for normal account refresh. Persists a bounded recent or forward import and returns 202 without provider traversal in the HTTP request.',
        params: accountIdParamsSchema,
        response: {
          202: createAccountImportRunResponseSchema,
          400: validationErrorResponseSchema,
          401: unauthorizedResponseSchema,
          404: messageResponseSchema,
          409: accountImportErrorResponseSchema,
        },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      try {
        const result = await AccountImportService.createNormalRefreshForUser(auth.userId, id);
        reply.code(202);
        return result;
      } catch (error) {
        const mapped = mapAccountImportCommandError(error);
        if (mapped) {
          reply.code(mapped.statusCode);
          return mapped.body;
        }
        throw error;
      }
    },
  );

  app.post(
    '/api/me/accounts/:id/backfill',
    {
      schema: accountSchema('backfillExternalAccount', 'Queue older account history for import', {
        description: 'Queues the three calendar months immediately before proved normal account coverage. Historical backfill never resets or rewinds the forward refresh boundary.',
        params: accountIdParamsSchema,
        response: {
          202: createAccountImportRunResponseSchema,
          400: validationErrorResponseSchema,
          401: unauthorizedResponseSchema,
          404: messageResponseSchema,
          409: accountImportErrorResponseSchema,
        },
      }),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      try {
        const result = await AccountImportService.createHistoricalBackfillForUser(auth.userId, id);
        reply.code(202);
        return result;
      } catch (error) {
        const mapped = mapAccountImportCommandError(error);
        if (mapped) {
          reply.code(mapped.statusCode);
          return mapped.body;
        }
        throw error;
      }
    },
  );

  app.get(
    '/api/me/accounts/:id/imported-game-workflow-candidates',
    {
      schema: accountSchema(
        'getImportedGameWorkflowCandidates',
        'Get standard workflow counts for an external account',
        {
          description: 'Compatibility endpoint returning bounded aggregate counts only. Game IDs are selected server-side by durable preparation workflows.',
          params: accountIdParamsSchema,
          response: {
            200: externalAccountWorkflowSummaryResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.getForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      return externalAccountWorkflowSummaryResponseSchema.parse(
        await ImportedGameWorkflowCandidatesService.forAccount(auth.userId, id),
      );
    },
  );

  app.post(
    '/api/me/accounts/:id/reset-cursor',
    {
      schema: accountSchema(
        'resetExternalAccountSyncCursor',
        'Reset the legacy sync cursor for an external account',
        {
          deprecated: true,
          description: 'Deprecated legacy-field action. It clears syncCursorTime only; durable account refresh uses exact AccountImportCoverage. Use /backfill to request older durable history.',
          params: accountIdParamsSchema,
          response: {
            200: legacyOpaqueResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const id = request.params.id;
      const account = await ExternalAccountService.resetSyncCursorForUser(auth.userId, id);
      if (!account) {
        reply.code(404);
        return { message: 'External account not found' };
      }

      return account;
    },
  );

  app.get(
    '/api/me/accounts/:id/games',
    {
      schema: accountSchema(
        'listExternalAccountGames',
        'Search imported games for one external account',
        {
          params: accountIdParamsSchema,
          querystring: listAccountGamesQuerySchema,
          response: {
            200: importedGameSearchResponseSchema,
            400: validationErrorResponseSchema,
            401: unauthorizedResponseSchema,
            404: messageResponseSchema,
          },
        },
      ),
    },
    async (request, reply) => {
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
    },
  );
};

export default externalAccountsRoutes;
