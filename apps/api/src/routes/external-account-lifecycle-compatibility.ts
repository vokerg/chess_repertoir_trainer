import type {
  FastifyReply,
  FastifyRequest,
  onRouteHookHandler,
} from 'fastify';
import { dataLifecycleErrorResponseSchema } from '@chess-trainer/contracts/data-lifecycle';
import { requireAuth } from '../auth/request-auth';
import { messageResponseSchema } from './legacy-route.schemas';

export const describeExternalAccountLifecycleCompatibility: onRouteHookHandler = (routeOptions) => {
  const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method];
  const schema = routeOptions.schema;
  if (!schema) return;

  if (methods.includes('DELETE') && routeOptions.url === '/api/me/accounts/:id') {
    const response = { ...(schema.response ?? {}) } as Record<string | number, unknown>;
    delete response[200];
    response[409] = dataLifecycleErrorResponseSchema;
    routeOptions.schema = {
      ...schema,
      deprecated: true,
      summary: 'Legacy direct account deletion is disabled',
      description: 'This compatibility URL no longer performs an immediate account cascade. Create and execute a DELETE_EXTERNAL_ACCOUNT data-lifecycle operation instead.',
      response,
    };
    return;
  }

  if (methods.includes('POST') && routeOptions.url === '/api/me/accounts/:id/reset-cursor') {
    const response = { ...(schema.response ?? {}) } as Record<string | number, unknown>;
    delete response[200];
    response[410] = messageResponseSchema;
    routeOptions.schema = {
      ...schema,
      deprecated: true,
      summary: 'Legacy raw sync-cursor reset is removed',
      description: 'Raw sync-cursor mutation is no longer available. Use durable historical backfill to import older history or PURGE_ACCOUNT_DATA for a destructive account reset.',
      response,
    };
  }
};

export async function enforceExternalAccountLifecycleCompatibility(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const routeUrl = request.routeOptions.url;

  if (request.method === 'DELETE' && routeUrl === '/api/me/accounts/:id') {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    reply.code(409).send({
      error: 'Immediate account deletion is disabled. Create a DELETE_EXTERNAL_ACCOUNT lifecycle preview and execute it with its confirmation phrase.',
      code: 'DATA_LIFECYCLE_INVALID_STATE',
    });
    return;
  }

  if (request.method === 'POST' && routeUrl === '/api/me/accounts/:id/reset-cursor') {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    reply.code(410).send({
      message: 'Raw sync-cursor reset has been removed. Use durable historical backfill to import older games, or PURGE_ACCOUNT_DATA when the intent is to destructively reset account data.',
    });
  }
}
