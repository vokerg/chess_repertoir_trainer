import 'fastify';
import { RequestAuth } from './request-auth';

declare module 'fastify' {
  interface FastifyRequest {
    auth: RequestAuth | null;
  }
}
