import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireAuth } from '../auth/request-auth';

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
