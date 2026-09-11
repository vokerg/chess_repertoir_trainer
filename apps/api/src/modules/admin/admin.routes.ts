import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  adminErrorResponseSchema,
  adminMeResponseSchema,
  adminUserDetailResponseSchema,
  adminUserListQuerySchema,
  adminUserListResponseSchema,
  adminUserParamsSchema,
  adminUserWorkResponseSchema,
  adminWorkQuerySchema,
  type AdminCapability,
} from '@chess-trainer/contracts/admin';
import {
  accountGameDataLifecyclePreviewRequestSchema,
  dataLifecycleErrorResponseSchema,
  dataLifecycleExecuteRequestSchema,
  dataLifecycleOperationResponseSchema,
  dataLifecyclePreviewResponseSchema,
} from '@chess-trainer/contracts/data-lifecycle';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  hasAdminCapability,
  type AdminAuthorizationPolicy,
  type AdminPrincipal,
} from './admin-authorization.service';
import { AdminCursorInvalidError, AdminUserNotFoundError } from './admin.errors';
import type { AdminRequestBudget } from './admin-request-budget';
import { createAdminDiagnosticsService } from './admin-diagnostics.service';
import { AccountGameDataLifecycleService } from '../data-lifecycle/data-lifecycle.account-game.service';
import type { AccountGameDataLifecycleService as AccountGameDataLifecycleServiceBoundary } from '../data-lifecycle/data-lifecycle.account-game.service';
import { DataLifecycleInvalidStateError } from '../data-lifecycle/data-lifecycle.repository.prisma';

export interface AdminModuleOptions {
  authorizationPolicy: AdminAuthorizationPolicy;
  requestBudget: AdminRequestBudget;
  diagnosticsService?: ReturnType<typeof createAdminDiagnosticsService>;
  lifecycleService?: AccountGameDataLifecycleServiceBoundary;
}

const adminListBadRequestResponseSchema = z.union([
  validationErrorResponseSchema,
  adminErrorResponseSchema,
]);
const adminUnavailableResponseSchema = z.object({
  error: z.literal('Administrator diagnostics unavailable'),
});
const adminLifecycleUnavailableResponseSchema = z.object({
  error: z.literal('Administrator lifecycle unavailable'),
});
const adminLifecycleParamsSchema = adminUserParamsSchema.extend({
  operationId: z.coerce.number().int().positive(),
});
const ADMIN_REVERIFICATION_MAX_AGE_MINUTES = 10;

function forbidden() {
  return { message: 'Forbidden', code: 'ADMIN_FORBIDDEN' as const };
}

function requestBudgetExceeded() {
  return {
    message: 'Administrator request budget exceeded',
    code: 'ADMIN_REQUEST_BUDGET_EXCEEDED' as const,
  };
}

function diagnosticsUnavailable() {
  return { error: 'Administrator diagnostics unavailable' as const };
}

const adminModule: FastifyPluginAsyncZod<AdminModuleOptions> = async (app, options) => {
  const service = options.diagnosticsService ?? createAdminDiagnosticsService();
  const lifecycleService = options.lifecycleService ?? AccountGameDataLifecycleService;

  function logRead(
    request: FastifyRequest,
    principal: AdminPrincipal,
    operationId: string,
    startedAt: number,
    resultClass: string,
    targetUserId?: number,
  ) {
    request.log.info(
      {
        securityEvent: 'admin_read_access',
        actorKey: principal.actorKey,
        actorKeyVersion: principal.actorKeyVersion,
        operationId,
        requestId: request.id,
        targetKey: targetUserId ? options.authorizationPolicy.targetKey(targetUserId) : null,
        resultClass,
        durationMs: Math.max(0, Date.now() - startedAt),
      },
      'Administrator read access',
    );
  }

  function failRead(
    request: FastifyRequest,
    reply: FastifyReply,
    principal: AdminPrincipal,
    operationId: string,
    startedAt: number,
    error: unknown,
    targetUserId?: number,
  ) {
    logRead(request, principal, operationId, startedAt, 'ERROR', targetUserId);
    request.log.error(
      {
        err: error,
        operationId,
        requestId: request.id,
      },
      'Administrator diagnostics failed',
    );
    reply.code(500);
    return diagnosticsUnavailable();
  }

  async function requirePrincipal(
    request: FastifyRequest,
    reply: FastifyReply,
    operationId: string,
    startedAt: number,
    capability: AdminCapability = 'ADMIN_DIAGNOSTICS_READ',
  ): Promise<AdminPrincipal | null> {
    if (!request.auth) {
      reply.code(401).send({ message: 'Unauthorized' });
      return null;
    }

    const principal = options.authorizationPolicy.resolve({
      auth: request.auth,
      verifiedSession: request.verifiedSession,
    });
    if (!principal || !hasAdminCapability(principal, capability)) {
      request.log.warn(
        {
          securityEvent: 'admin_read_access',
          operationId,
          requestId: request.id,
          resultClass: 'FORBIDDEN',
        },
        'Administrator capability denied',
      );
      reply.code(403).send(forbidden());
      return null;
    }

    try {
      const budget = await options.requestBudget.check({
        actorKey: principal.actorKey,
        operationId,
      });
      if (!budget.allowed && budget.enforcement === 'ENFORCED') {
        if (budget.retryAfterSeconds) reply.header('Retry-After', String(budget.retryAfterSeconds));
        request.log.warn(
          {
            securityEvent: 'admin_read_access',
            actorKey: principal.actorKey,
            actorKeyVersion: principal.actorKeyVersion,
            operationId,
            requestId: request.id,
            resultClass: 'BUDGET_REJECTED',
          },
          'Administrator request budget rejected',
        );
        reply.code(429).send(requestBudgetExceeded());
        return null;
      }
    } catch (error) {
      reply.send(failRead(request, reply, principal, operationId, startedAt, error));
      return null;
    }

    return principal;
  }

  app.route({
    method: 'GET',
    url: '/api/admin/me',
    schema: {
      operationId: 'getAdminMe',
      tags: ['Administrator diagnostics'],
      summary: 'Get administrator diagnostic capabilities',
      response: {
        200: adminMeResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        429: adminErrorResponseSchema,
        500: adminUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const startedAt = Date.now();
      const principal = await requirePrincipal(request, reply, 'getAdminMe', startedAt);
      if (!principal) return;
      const response = {
        capabilities: [...principal.capabilities],
        actorKeyVersion: principal.actorKeyVersion,
        sessionEvidence: {
          hasVerifiedSession: request.verifiedSession !== null,
          hasFactorVerificationAge: principal.factorVerificationAge !== undefined,
          hasReverificationId: principal.reverificationId !== undefined,
        },
        requestBudget: {
          enforcement: options.requestBudget.enforcement(),
          scope: 'STRICT_BOUNDS_AND_SECURITY_TELEMETRY' as const,
        },
      };
      logRead(request, principal, 'getAdminMe', startedAt, 'SUCCESS');
      return response;
    },
  });

  app.route({
    method: 'GET',
    url: '/api/admin/users',
    schema: {
      operationId: 'listAdminUsers',
      tags: ['Administrator diagnostics'],
      summary: 'List bounded administrator user summaries',
      querystring: adminUserListQuerySchema,
      response: {
        200: adminUserListResponseSchema,
        400: adminListBadRequestResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        429: adminErrorResponseSchema,
        500: adminUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const startedAt = Date.now();
      const principal = await requirePrincipal(request, reply, 'listAdminUsers', startedAt);
      if (!principal) return;
      try {
        const response = await service.listUsers(request.query);
        logRead(request, principal, 'listAdminUsers', startedAt, 'SUCCESS');
        return response;
      } catch (error) {
        if (error instanceof AdminCursorInvalidError) {
          logRead(request, principal, 'listAdminUsers', startedAt, 'INVALID_CURSOR');
          reply.code(400);
          return { message: error.message, code: error.code };
        }
        return failRead(request, reply, principal, 'listAdminUsers', startedAt, error);
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/admin/users/:userId',
    schema: {
      operationId: 'getAdminUserDetail',
      tags: ['Administrator diagnostics'],
      summary: 'Get bounded administrator diagnostics for one user',
      params: adminUserParamsSchema,
      response: {
        200: adminUserDetailResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        404: adminErrorResponseSchema,
        429: adminErrorResponseSchema,
        500: adminUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const startedAt = Date.now();
      const principal = await requirePrincipal(request, reply, 'getAdminUserDetail', startedAt);
      if (!principal) return;
      try {
        const response = await service.getUserDetail(request.params.userId);
        logRead(
          request,
          principal,
          'getAdminUserDetail',
          startedAt,
          'SUCCESS',
          request.params.userId,
        );
        return response;
      } catch (error) {
        if (error instanceof AdminUserNotFoundError) {
          logRead(
            request,
            principal,
            'getAdminUserDetail',
            startedAt,
            'NOT_FOUND',
            request.params.userId,
          );
          reply.code(404);
          return { message: error.message, code: error.code };
        }
        return failRead(
          request,
          reply,
          principal,
          'getAdminUserDetail',
          startedAt,
          error,
          request.params.userId,
        );
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/admin/users/:userId/work',
    schema: {
      operationId: 'getAdminUserWork',
      tags: ['Administrator diagnostics'],
      summary: 'Get bounded active and recent work diagnostics for one user',
      params: adminUserParamsSchema,
      querystring: adminWorkQuerySchema,
      response: {
        200: adminUserWorkResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        404: adminErrorResponseSchema,
        429: adminErrorResponseSchema,
        500: adminUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const startedAt = Date.now();
      const principal = await requirePrincipal(request, reply, 'getAdminUserWork', startedAt);
      if (!principal) return;
      try {
        const response = await service.getUserWork(request.params.userId, request.query.limit);
        logRead(
          request,
          principal,
          'getAdminUserWork',
          startedAt,
          'SUCCESS',
          request.params.userId,
        );
        return response;
      } catch (error) {
        if (error instanceof AdminUserNotFoundError) {
          logRead(
            request,
            principal,
            'getAdminUserWork',
            startedAt,
            'NOT_FOUND',
            request.params.userId,
          );
          reply.code(404);
          return { message: error.message, code: error.code };
        }
        return failRead(
          request,
          reply,
          principal,
          'getAdminUserWork',
          startedAt,
          error,
          request.params.userId,
        );
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/admin/users/:userId/data-lifecycle/preview',
    schema: {
      operationId: 'previewAdminAccountGameDataLifecycle',
      tags: ['Administrator lifecycle'],
      summary: 'Preview an account or game lifecycle operation for a user',
      params: adminUserParamsSchema,
      body: accountGameDataLifecyclePreviewRequestSchema,
      response: {
        201: dataLifecyclePreviewResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
        500: adminLifecycleUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const principal = await requirePrincipal(
        request,
        reply,
        'previewAdminAccountGameDataLifecycle',
        Date.now(),
        'ADMIN_LIFECYCLE_PREVIEW',
      );
      if (!principal || !request.auth) return;
      try {
        const result = await lifecycleService.previewForAdmin(
          request.auth.userId,
          request.params.userId,
          { keyVersion: principal.actorKeyVersion, digest: hashAdminKey(principal.actorKey) },
          {
            keyVersion: principal.actorKeyVersion,
            digest: hashAdminKey(options.authorizationPolicy.targetKey(request.params.userId)),
          },
          request.body,
        );
        reply.code(201);
        return result;
      } catch (error) {
        return mapAdminLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/admin/users/:userId/data-lifecycle/:operationId/execute',
    schema: {
      operationId: 'executeAdminAccountGameDataLifecycle',
      tags: ['Administrator lifecycle'],
      summary: 'Execute a previewed administrator lifecycle operation',
      params: adminLifecycleParamsSchema,
      body: dataLifecycleExecuteRequestSchema,
      response: {
        202: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        409: z.union([adminErrorResponseSchema, dataLifecycleErrorResponseSchema]),
        410: dataLifecycleErrorResponseSchema,
        428: adminErrorResponseSchema,
        500: adminLifecycleUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const principal = await requirePrincipal(
        request,
        reply,
        'executeAdminAccountGameDataLifecycle',
        Date.now(),
        'ADMIN_LIFECYCLE_EXECUTE',
      );
      if (!principal) return;
      const firstFactorAge = principal.factorVerificationAge?.[0];
      if (
        firstFactorAge === undefined ||
        firstFactorAge < 0 ||
        firstFactorAge > ADMIN_REVERIFICATION_MAX_AGE_MINUTES ||
        !principal.reverificationId
      ) {
        reply.code(428);
        return {
          message: 'Fresh administrator reverification is required.',
          code: 'ADMIN_REVERIFICATION_REQUIRED' as const,
        };
      }
      try {
        const result = await lifecycleService.executeForAdmin(
          request.params.userId,
          request.params.operationId,
          request.body,
          {
            method: 'CLERK_SIGNED_FVA_AND_REVERIFICATION_ID',
            reverificationIdHash: createHash('sha256')
              .update('admin-reverification\0')
              .update(principal.reverificationId)
              .digest('hex'),
            firstFactorAgeMinutes: firstFactorAge,
          },
        );
        reply.code(202);
        return result;
      } catch (error) {
        return mapAdminLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/admin/users/:userId/data-lifecycle/:operationId',
    schema: {
      operationId: 'getAdminAccountGameDataLifecycle',
      tags: ['Administrator lifecycle'],
      summary: 'Get an administrator lifecycle operation',
      description: 'Reads the current canonical lifecycle state without mutating it.',
      params: adminLifecycleParamsSchema,
      response: {
        200: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
        500: adminLifecycleUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const principal = await requirePrincipal(
        request,
        reply,
        'getAdminAccountGameDataLifecycle',
        Date.now(),
        'ADMIN_LIFECYCLE_PREVIEW',
      );
      if (!principal) return;
      try {
        return await lifecycleService.get(request.params.userId, request.params.operationId);
      } catch (error) {
        return mapAdminLifecycleError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/admin/users/:userId/data-lifecycle/:operationId/stop',
    schema: {
      operationId: 'stopAdminAccountGameDataLifecycle',
      tags: ['Administrator lifecycle'],
      summary: 'Request an administrator lifecycle operation stop',
      description:
        'Before the first destructive commit this requests terminal cancellation. After mutation begins it requests a stop at the next transaction boundary and the operation remains fenced in NEEDS_ATTENTION until explicitly resumed.',
      params: adminLifecycleParamsSchema,
      response: {
        200: dataLifecycleOperationResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: adminErrorResponseSchema,
        404: dataLifecycleErrorResponseSchema,
        409: dataLifecycleErrorResponseSchema,
        500: adminLifecycleUnavailableResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const principal = await requirePrincipal(
        request,
        reply,
        'stopAdminAccountGameDataLifecycle',
        Date.now(),
        'ADMIN_LIFECYCLE_EXECUTE',
      );
      if (!principal) return;
      try {
        return await lifecycleService.requestStop(request.params.userId, request.params.operationId);
      } catch (error) {
        return mapAdminLifecycleError(error, reply);
      }
    },
  });
};

function mapAdminLifecycleError(error: unknown, reply: FastifyReply): any {
  if (error instanceof DataLifecycleInvalidStateError && error.message.includes('reverification')) {
    reply.code(409);
    return { message: error.message, code: 'ADMIN_REVERIFICATION_REUSED' as const };
  }
  const code = (error as { code?: unknown })?.code;
  if (typeof code === 'string' && code.startsWith('DATA_LIFECYCLE_')) {
    reply.code(
      code === 'DATA_LIFECYCLE_PREVIEW_EXPIRED'
        ? 410
        : code === 'DATA_LIFECYCLE_OWNERSHIP_CHANGED'
          ? 404
          : 409,
    );
    return { error: error instanceof Error ? error.message : 'Lifecycle request failed.', code };
  }
  reply.code(500);
  return { error: 'Administrator lifecycle unavailable' as const };
}

function hashAdminKey(key: string): string {
  return createHash('sha256').update('admin-lifecycle-key\0').update(key).digest('hex');
}

export default adminModule;
