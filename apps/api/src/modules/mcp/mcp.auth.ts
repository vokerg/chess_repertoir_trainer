import { timingSafeEqual } from 'node:crypto';
import { FastifyRequest } from 'fastify';

let warnedAboutMissingToken = false;

export function isMcpEnabled() {
  return process.env['MCP_ENABLED'] === 'true';
}

function tokensMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireMcpAuth(request: FastifyRequest): { ok: boolean } {
  const expectedToken = process.env['MCP_BEARER_TOKEN'];
  if (!expectedToken) {
    if (!warnedAboutMissingToken) {
      warnedAboutMissingToken = true;
      request.log.warn('MCP is enabled without MCP_BEARER_TOKEN; access is unauthenticated');
    }
    return { ok: true };
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return { ok: false };
  return { ok: tokensMatch(authorization.slice('Bearer '.length), expectedToken) };
}

// TODO: Require OAuth before exposing MCP as a public connector or app deployment.
