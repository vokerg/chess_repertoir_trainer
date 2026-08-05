import type { FastifyReply, FastifyRequest } from 'fastify';
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
} from '@chess-trainer/contracts/admin';
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

export interface AdminModuleOptions {
  authorizationPolicy: AdminAuthorizationPolicy;
  requestBudget: AdminRequestBudget;
  diagnosticsService?: ReturnType<typeof createAdminDiagnosticsService>;
}

const adminListBadRequestResponseSchema = z.union([
  validationErrorResponseSchema,
  adminErrorResponseSchema,
]);
const adminUnavailableResponseSchema = z.object({
  error: z.literal('Administrator diagnostics unavailable'),
});

function forbidden() {
  return { message: 'Forbidden', code: 'ADMIN_FORBIDDEN' as const };
}

function requestBudgetExceeded() {
  return { message: 'Administrator request budget exceeded', code: 'ADMIN_REQUEST_BUDGET_EXCEEDED' as const };
}

function diagnosticsUnavailable() {
  return { error: 'Administrator diagnostics unavailable' as const };
}

const adminModule: FastifyPluginAsyncZod<AdminModuleOptions> = async (app, options) => {
  const service = options.diagnosticsService ?? createAdminDiagnosticsService();

  function logRead(
    request: FastifyRequest,
    principal: AdminPrincipal,
    operationId: string,
    startedAt: number,
    resultClass: string,
    targetUserId?: number,
  ) {
    request.log.info({
      securityEvent: 'admin_read_access',
      actorKey: principal.actorKey,
      actorKeyVersion: principal.actorKeyVersion,
      operationId,
      requestId: request.id,
      targetKey: targetUserId ? options.authorizationPolicy.targetKey(targetUserId) : null,
      resultClass,
      durationMs: Math.max(0, Date.now() - startedAt),
    }, 'Administrator read access');
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
    request.log.error({
      err: error,
      operationId,
      requestId: request.id,
    }, 'Administrator diagnostics failed');
    reply.code(500);
    return diagnosticsUnavailable();
  }

  async function requirePrincipal(
    request: FastifyRequest,
    reply: FastifyReply,
    operationId: string,
    startedAt: number,
  ): Promise<AdminPrincipal | null> {
    if (!request.auth) {
      reply.code(401).send({ message: 'Unauthorized' });
      return null;
    }

    const principal = options.authorizationPolicy.resolve({
      auth: request.auth,
      verifiedSession: request.verifiedSession,
    });
    if (!principal || !hasAdminCapability(principal, 'ADMIN_DIAGNOSTICS_READ')) {
      request.log.warn({
        securityEvent: 'admin_read_access',
        operationId,
        requestId: request.id,
        resultClass: 'FORBIDDEN',
      }, 'Administrator capability denied');
      reply.code(403).send(forbidden());
      return null;
    }

    try {
      const budget = await options.requestBudget.check({ actorKey: principal.actorKey, operationId });
      if (!budget.allowed && budget.enforcement === 'ENFORCED') {
        if (budget.retryAfterSeconds) reply.header('Retry-After', String(budget.retryAfterSeconds));
        request.log.warn({
          securityEvent: 'admin_read_access',
          actorKey: principal.actorKey,
          actorKeyVersion: principal.actorKeyVersion,
          operationId,
          requestId: request.id,
          resultClass: 'BUDGET_REJECTED',
        }, 'Administrator request budget rejected');
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
        logRead(request, principal, 'getAdminUserDetail', startedAt, 'SUCCESS', request.params.userId);
        return response;
      } catch (error) {
        if (error instanceof AdminUserNotFoundError) {
          logRead(request, principal, 'getAdminUserDetail', startedAt, 'NOT_FOUND', request.params.userId);
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
        logRead(request, principal, 'getAdminUserWork', startedAt, 'SUCCESS', request.params.userId);
        return response;
      } catch (error) {
        if (error instanceof AdminUserNotFoundError) {
          logRead(request, principal, 'getAdminUserWork', startedAt, 'NOT_FOUND', request.params.userId);
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
};

export default adminModule;
