import {
  dataLifecycleErrorResponseSchema,
  dataLifecycleExecuteRequestSchema,
  dataLifecycleIdentityBlockedResponseSchema,
  dataLifecycleOperationResponseSchema,
  dataLifecyclePreviewResponseSchema,
  dataLifecycleReceiptStatusRequestSchema,
  dataLifecycleReceiptStatusResponseSchema,
  wholeUserDataLifecycleExecuteResponseSchema,
  wholeUserDataLifecyclePreviewRequestSchema,
} from '@chess-trainer/contracts/data-lifecycle';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  DataLifecycleConflictError,
  DataLifecycleInvalidStateError,
  DataLifecycleOwnershipChangedError,
  DataLifecyclePreviewExpiredError,
  DataLifecyclePreviewInvalidError,
} from './data-lifecycle.repository.prisma';
import {
  UserDataLifecycleOperationNotFoundError,
  UserDataLifecycleService,
} from './data-lifecycle.user.service';

const operationParamsSchema = z.object({
  operationId: z.coerce.number().int().positive(),
});

const receiptCapabilityRequestSchema = dataLifecycleReceiptStatusRequestSchema;
const receiptResumeRequestSchema = dataLifecycleExecuteRequestSchema.extend({
  receiptToken: z.string().min(16).max(512),
}).strict();

const userDataLifecycleModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'POST',
    url: '/api/me/data-lifecycle/user-deletion/preview',
    schema: {
      operationId: 'previewWholeUserDeletion',
      tags: ['Data Lifecycle'],
      summary: 'Preview permanent deletion of the authenticated application user',
      description: 'Creates a short-lived bounded preview. No USER fence or destructive mutation is installed until execute.',
      body: wholeUserDataLifecyclePreviewRequestSchema,
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
        const preview = await UserDataLifecycleService.preview(auth.userId, request.body);
        reply.code(201);
        return preview;
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/data-lifecycle/user-deletion/:operationId/execute',
    schema: {
      operationId: 'executeWholeUserDeletion',
      tags: ['Data Lifecycle'],
      summary: 'Start or resume permanent deletion of the authenticated application user',
      description: 'Atomically installs the whole-user fence and returns an opaque receipt capability before destructive work continues in the persistent worker. Ordinary authenticated requests are rejected after the fence is installed.',
      params: operationParamsSchema,
      body: dataLifecycleExecuteRequestSchema,
      response: {
        202: wholeUserDataLifecycleExecuteResponseSchema,
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
        const result = await UserDataLifecycleService.execute(
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
    method: 'POST',
    url: '/api/data-lifecycle/user-deletion/status',
    schema: {
      operationId: 'getWholeUserDeletionByReceipt',
      tags: ['Data Lifecycle'],
      summary: 'Read whole-user deletion status with an opaque receipt capability',
      description: 'Does not resolve or provision an AppUser. This capability endpoint remains usable after the USER fence and final AppUser deletion.',
      body: receiptCapabilityRequestSchema,
      response: {
        200: dataLifecycleReceiptStatusResponseSchema,
        400: validationErrorResponseSchema,
        404: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const status = await UserDataLifecycleService.getByReceipt(request.body.receiptToken);
      if (!status) {
        reply.code(404);
        return {
          error: 'Whole-user deletion receipt was not found.',
          code: 'DATA_LIFECYCLE_OWNERSHIP_CHANGED' as const,
        };
      }
      return status;
    },
  });

  app.route({
    method: 'POST',
    url: '/api/data-lifecycle/user-deletion/:operationId/stop',
    schema: {
      operationId: 'stopWholeUserDeletionByReceipt',
      tags: ['Data Lifecycle'],
      summary: 'Request cancellation or stop-after-batch with an opaque deletion receipt',
      params: operationParamsSchema,
      body: receiptCapabilityRequestSchema,
      response: {
        200: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        return await UserDataLifecycleService.requestStopByReceipt(
          request.params.operationId,
          request.body.receiptToken,
        );
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/data-lifecycle/user-deletion/:operationId/resume',
    schema: {
      operationId: 'resumeWholeUserDeletionByReceipt',
      tags: ['Data Lifecycle'],
      summary: 'Resume a partially completed whole-user deletion with its receipt',
      params: operationParamsSchema,
      body: receiptResumeRequestSchema,
      response: {
        202: wholeUserDataLifecycleExecuteResponseSchema,
        400: validationErrorResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
        410: dataLifecycleErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const {
          receiptToken,
          previewToken,
          confirmationPhrase,
          idempotencyKey,
        } = request.body;
        const result = await UserDataLifecycleService.resumeByReceipt(
          request.params.operationId,
          receiptToken,
          { previewToken, confirmationPhrase, idempotencyKey },
        );
        reply.code(202);
        return result;
      } catch (error) {
        return mapLifecycleError(error, reply);
      }
    },
  });
};

function mapLifecycleError(error: unknown, reply: any) {
  if (
    error instanceof UserDataLifecycleOperationNotFoundError
    || error instanceof DataLifecycleOwnershipChangedError
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

export default userDataLifecycleModule;
