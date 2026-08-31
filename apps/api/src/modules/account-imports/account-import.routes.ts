import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  accountImportErrorResponseSchema,
  accountImportRunListQuerySchema,
  accountImportRunListResponseSchema,
  accountImportRunParamsSchema,
  accountImportRunResponseSchema,
  automaticAccountRefreshResponseSchema,
  createAccountImportRunBodySchema,
  createAccountImportRunResponseSchema,
} from '@chess-trainer/contracts';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { AccountImportAdmissionBlockedError } from './account-import-admission.guard';
import {
  AccountImportAccountNotFoundError,
  AccountImportActiveRunError,
} from './account-import.repository.prisma';
import {
  AccountImportNotControllableError,
  AccountImportNotFoundError,
  AccountImportService,
} from './account-import.service';
import { AccountImportAutomaticRefreshService } from './account-import.automatic-refresh.service';

const accountImportModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'POST',
    url: '/api/me/account-imports',
    schema: {
      operationId: 'createAccountImportRun',
      tags: ['Account Imports'],
      summary: 'Create a durable account import',
      description: 'Persists one owned account-import request and returns 202 without waiting for provider network work.',
      body: createAccountImportRunBodySchema,
      response: {
        202: createAccountImportRunResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: accountImportErrorResponseSchema,
        409: accountImportErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        const result = await AccountImportService.createUserAction(auth.userId, request.body);
        reply.code(202);
        return result;
      } catch (error) {
        if (error instanceof AccountImportAccountNotFoundError) {
          reply.code(404);
          return { error: error.message, code: 'ACCOUNT_IMPORT_NOT_FOUND' as const };
        }
        if (error instanceof AccountImportAdmissionBlockedError) {
          reply.code(409);
          return { error: error.message, code: error.code };
        }
        if (error instanceof AccountImportActiveRunError) {
          reply.code(409);
          return { error: error.message, code: 'ACCOUNT_IMPORT_ACTIVE' as const };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/account-imports/automatic-refresh',
    schema: {
      operationId: 'refreshStaleExternalAccounts',
      tags: ['Account Imports'],
      summary: 'Evaluate stale owned accounts for automatic refresh',
      description: 'Bodyless authenticated bootstrap command. It evaluates active owned accounts, persists eligible incremental-forward work, reuses existing active imports, and returns without provider traversal.',
      response: {
        200: automaticAccountRefreshResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return AccountImportAutomaticRefreshService.refreshForUser(auth.userId);
    },
  });

  app.route({
    method: 'GET',
    url: '/api/me/account-imports',
    schema: {
      operationId: 'listAccountImportRuns',
      tags: ['Account Imports'],
      summary: 'List current-user durable account imports',
      querystring: accountImportRunListQuerySchema,
      response: {
        200: accountImportRunListResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return AccountImportService.listForUser(auth.userId, request.query.active, request.query.limit);
    },
  });

  app.route({
    method: 'GET',
    url: '/api/me/account-imports/:importRunId',
    schema: {
      operationId: 'getAccountImportRun',
      tags: ['Account Imports'],
      summary: 'Get one current-user durable account import',
      params: accountImportRunParamsSchema,
      response: {
        200: accountImportRunResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: accountImportErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await AccountImportService.getForUser(auth.userId, request.params.importRunId);
      } catch (error) {
        if (error instanceof AccountImportNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  for (const action of ['pause', 'resume', 'cancel'] as const) {
    app.route({
      method: 'POST',
      url: `/api/me/account-imports/:importRunId/${action}`,
      schema: {
        operationId: `${action}AccountImportRun`,
        tags: ['Account Imports'],
        summary: `${capitalize(action)} one current-user durable account import`,
        description: accountImportActionDescription(action),
        params: accountImportRunParamsSchema,
        response: {
          200: accountImportRunResponseSchema,
          400: validationErrorResponseSchema,
          401: unauthorizedResponseSchema,
          404: accountImportErrorResponseSchema,
          409: accountImportErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const auth = requireAuth(request, reply);
        if (!auth) return;
        try {
          switch (action) {
            case 'pause':
              return await AccountImportService.pauseForUser(auth.userId, request.params.importRunId);
            case 'resume':
              return await AccountImportService.resumeForUser(auth.userId, request.params.importRunId);
            case 'cancel':
              return await AccountImportService.cancelForUser(auth.userId, request.params.importRunId);
          }
        } catch (error) {
          if (error instanceof AccountImportNotFoundError) {
            reply.code(404);
            return { error: error.message, code: error.code };
          }
          if (error instanceof AccountImportAdmissionBlockedError) {
            reply.code(409);
            return { error: error.message, code: error.code };
          }
          if (error instanceof AccountImportNotControllableError) {
            reply.code(409);
            return { error: error.message, code: error.code };
          }
          throw error;
        }
      },
    });
  }

  app.route({
    method: 'POST',
    url: '/api/me/account-imports/:importRunId/retry',
    schema: {
      operationId: 'retryAccountImportRun',
      tags: ['Account Imports'],
      summary: 'Retry one failed or cancelled current-user account import',
      description: 'Bodyless action: the persisted terminal import run supplies the immutable account, scope, range, and retry lineage for the new user-action run.',
      params: accountImportRunParamsSchema,
      response: {
        202: createAccountImportRunResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: accountImportErrorResponseSchema,
        409: accountImportErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await AccountImportService.retryForUser(auth.userId, request.params.importRunId);
        reply.code(202);
        return result;
      } catch (error) {
        if (error instanceof AccountImportNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        if (error instanceof AccountImportAdmissionBlockedError) {
          reply.code(409);
          return { error: error.message, code: error.code };
        }
        if (error instanceof AccountImportNotControllableError) {
          reply.code(409);
          return { error: error.message, code: error.code };
        }
        if (error instanceof AccountImportActiveRunError) {
          reply.code(409);
          return { error: error.message, code: 'ACCOUNT_IMPORT_ACTIVE' as const };
        }
        throw error;
      }
    },
  });
};

export default accountImportModule;

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function accountImportActionDescription(action: 'pause' | 'resume' | 'cancel'): string {
  switch (action) {
    case 'pause':
      return 'Bodyless action: the import run id selects the persisted run to pause, and a running executor acknowledges the pause only after it has quiesced.';
    case 'resume':
      return 'Bodyless action: the import run id selects the persisted paused run to return to the durable queue with its immutable scope and range unchanged.';
    case 'cancel':
      return 'Bodyless action: the import run id selects the persisted run to cancel, and a running executor acknowledges cancellation only after it has quiesced.';
  }
}