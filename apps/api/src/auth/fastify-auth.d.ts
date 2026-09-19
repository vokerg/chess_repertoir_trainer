import 'fastify';
import { RequestAuth } from './request-auth';
import { VerifiedSessionContext } from './verified-session-context';

declare module 'fastify' {
  interface FastifyRequest {
    auth: RequestAuth | null;
    verifiedSession: VerifiedSessionContext | null;
  }
}
