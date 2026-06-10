import { timingSafeEqual } from 'node:crypto';
import { FastifyRequest } from 'fastify';

export type McpAuthMode = 'token' | 'none';

let warnedAboutNoAuth = false;
let warnedAboutInvalidAuthConfig = false;

export function isMcpEnabled() {
  return process.env['MCP_ENABLED'] === 'true';
}

export function getMcpAuthMode(): McpAuthMode | null {
  const mode = process.env['MCP_AUTH_MODE'] ?? 'token';
  return mode === 'token' || mode === 'none' ? mode : null;
}

function tokensMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function requireMcpAuth(request: FastifyRequest): { ok: boolean } {
  const mode = getMcpAuthMode();
  if (mode === 'none') {
    if (!warnedAboutNoAuth) {
      warnedAboutNoAuth = true;
      request.log.warn('MCP authentication is disabled by MCP_AUTH_MODE=none');
    }
    return { ok: true };
  }

  const expectedToken = process.env['MCP_BEARER_TOKEN'];
  if (mode !== 'token' || !expectedToken) {
    if (!warnedAboutInvalidAuthConfig) {
      warnedAboutInvalidAuthConfig = true;
      request.log.error('MCP authentication configuration is invalid; use MCP_AUTH_MODE=token with MCP_BEARER_TOKEN or MCP_AUTH_MODE=none');
    }
    return { ok: false };
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return { ok: false };
  return { ok: tokensMatch(authorization.slice('Bearer '.length), expectedToken) };
}

// TODO: Require OAuth before exposing MCP as a public connector or app deployment.
