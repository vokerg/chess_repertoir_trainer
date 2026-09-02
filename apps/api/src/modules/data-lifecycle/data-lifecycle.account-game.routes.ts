import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  accountGameDataLifecyclePreviewRequestSchema,
  dataLifecycleErrorResponseSchema,
  dataLifecycleExecuteRequestSchema,
  dataLifecycleOperationResponseSchema,
  dataLifecyclePreviewResponseSchema,
} from '@chess-trainer/contracts/data-lifecycle';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { DataLifecycleScopeNotFoundError } from './data-lifecycle.coordinator.repository.prisma';
import {
  DataLifecycleConflictError,
  DataLifecycleInvalidStateError,
  DataLifecycleOwnershipChangedError,
  DataLifecyclePreviewExpiredError,
  DataLifecyclePreviewInvalidError,
} from './data-lifecycle.repository.prisma';
import {
  AccountGameDataLifecycleService,
  DataLifecycleOperationNotFoundError,
} from './data-lifecycle.account-game.service';

const operationParamsSchema = z.object({
  operationId: z.coerce.number().int().positive(),
});

const dataLifecycleModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'POST',
    url: '/api/me/data-lifecycle/preview',
    schema: {
      operationId: 'previewAccountGameDataLifecycle',
      tags: ['Data Lifecycle'],
      summary: 'Preview an account or imported-game destructive lifecycle operation',
      description: 'Creates a short-lived durable preview with exact bounded aggregate counts and a confirmation phrase. This endpoint does not install a fence or mutate target data.',
      body: accountGameDataLifecyclePreviewRequestSchema,
      response: {
        201: dataLifecyclePreviewResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await AccountGameDataLifecycleService.preview(auth.userId, request.body);
        reply.code(201);
        return result;
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/data-lifecycle/:operationId/execute',
    schema: {
      operationId: 'executeAccountGameDataLifecycle',
      tags: ['Data Lifecycle'],
      summary: 'Execute or resume a previewed destructive lifecycle operation',
      description: 'Validates the preview token, typed confirmation, and idempotency key, then synchronously installs the persisted lifecycle fence before returning 202. Destructive batches continue in the existing API worker deployment.',
      params: operationParamsSchema,
      body: dataLifecycleExecuteRequestSchema,
      response: {
        202: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
        410: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await AccountGameDataLifecycleService.execute(
          auth.userId,
          request.params.operationId,
          request.body,
        );
        reply.code(202);
        return result;
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/me/data-lifecycle/:operationId',
    schema: {
      operationId: 'getAccountGameDataLifecycle',
      tags: ['Data Lifecycle'],
      summary: 'Get one account or imported-game lifecycle operation',
      params: operationParamsSchema,
      response: {
        200: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await AccountGameDataLifecycleService.get(auth.userId, request.params.operationId);
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/data-lifecycle/:operationId/stop',
    schema: {
      operationId: 'stopAccountGameDataLifecycle',
      tags: ['Data Lifecycle'],
      summary: 'Request cancellation or stop-after-batch for a destructive lifecycle operation',
      description: 'Before the first destructive commit this requests terminal cancellation. After mutation begins it requests a stop at the next transaction boundary and the operation remains fenced in NEEDS_ATTENTION until explicitly resumed.',
      params: operationParamsSchema,
      response: {
        200: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await AccountGameDataLifecycleService.requestStop(
          auth.userId,
          request.params.operationId,
        );
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });
};

function mapLifecycleError(error: unknown, reply: any) {
  if (
    error instanceof DataLifecycleOperationNotFoundError
    || error instanceof DataLifecycleOwnershipChangedError
    || error instanceof DataLifecycleScopeNotFoundError
  ) {
    reply.code(404);
    return { error: error.message, code: 'DATA_LIFECYCLE_OWNERSHIP_CHANGED' as const };
  }
  if (error instanceof DataLifecyclePreviewExpiredError) {
    reply.code(410);
    return { error: error.message, code: error.code };
  }
  if (error instanceof DataLifecyclePreviewInvalidError) {
    reply.code(409);
    return { error: error.message, code: error.code };
  }
  if (error instanceof DataLifecycleConflictError || error instanceof DataLifecycleInvalidStateError) {
    reply.code(409);
    return { error: error.message, code: error.code };
  }
  throw error;
}

export default dataLifecycleModule;
