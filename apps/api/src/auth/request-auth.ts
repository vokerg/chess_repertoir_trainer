import { FastifyReply, FastifyRequest } from 'fastify';

export interface RequestAuth {
  userId: number;
  provider: string;
  externalSubject: string;
  email?: string;
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply): RequestAuth | null {
  if (request.auth) return request.auth;

  reply.code(401).send({ message: 'Unauthorized' });
  return null;
}
