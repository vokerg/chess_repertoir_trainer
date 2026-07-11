import fp from 'fastify-plugin';
import { FastifyRequest } from 'fastify';
import { AuthConfig, loadAuthConfig } from './auth.config';
import { CurrentAppUserService } from './current-app-user.service';

const PUBLIC_PATHS = new Set([
  '/health',
  '/api/board-image',
  '/api/board-image-url',
  '/api/auth/lichess/callback',
  '/api/docs',
  '/api/docs/openapi.json',
  '/mcp',
]);

function isPublicRequest(request: FastifyRequest) {
  const path = request.url.split('?', 1)[0];
  return request.method === 'OPTIONS' || PUBLIC_PATHS.has(path) || path.startsWith('/api/docs/');
}

function readCookie(request: FastifyRequest, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function readToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    return token || undefined;
  }
  return readCookie(request, '__session');
}

function readEmail(payload: Record<string, unknown>) {
  const email = payload['email'];
  return typeof email === 'string' && email.length > 0 ? email : undefined;
}

function readDisplayName(payload: Record<string, unknown>) {
  const name = payload['name'];
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

export interface AuthPluginOptions {
  authConfig?: AuthConfig;
}

export default fp(async function authPlugin(app, options: AuthPluginOptions) {
  const config = options.authConfig ?? loadAuthConfig();
  const { createRemoteJWKSet, jwtVerify } = config.mode === 'clerk'
    ? await import('jose')
    : { createRemoteJWKSet: null, jwtVerify: null };
  const clerkJwks = config.mode === 'clerk' ? createRemoteJWKSet!(config.jwksUrl) : null;

  app.decorateRequest('auth', null);

  app.addHook('onRequest', async (request, reply) => {
    if (isPublicRequest(request)) return;

    if (config.mode === 'dev-single-user') {
      const resolved = await CurrentAppUserService.resolveDevUser(config.userId);
      request.auth = resolved.auth;
      return;
    }

    const token = readToken(request);
    if (!token) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify!(token, clerkJwks!, {
        issuer: config.issuer,
        ...(config.audience ? { audience: config.audience } : {}),
      });
      payload = verified.payload;
    } catch (error) {
      request.log.warn({ err: error }, 'Request authentication failed');
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const authorizedParty = payload['azp'];
    const subject = payload['sub'];
    if (!subject || typeof subject !== 'string' || typeof authorizedParty !== 'string' || !config.authorizedParties.includes(authorizedParty)) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const resolved = await CurrentAppUserService.resolveExternalUser({
      provider: 'clerk',
      externalSubject: subject,
      email: readEmail(payload),
      displayName: readDisplayName(payload),
    });
    request.auth = resolved.auth;
  });
});
