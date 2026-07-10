import type { RouteOptions } from 'fastify';

const METHOD_PREFIX: Record<string, string> = {
  DELETE: 'delete',
  GET: 'get',
  PATCH: 'update',
  POST: 'create',
  PUT: 'replace',
};

export function ensureProductRouteSchema(route: RouteOptions): void {
  if (!route.url.startsWith('/api/') || route.url.startsWith('/api/docs')) return;

  route.schema ??= {};
  if (route.schema.hide || route.schema.operationId) return;

  const method = Array.isArray(route.method) ? route.method[0] : route.method;
  const normalizedMethod = String(method).toUpperCase();
  const segments = route.url
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean);
  const resource = segments[0] ?? 'api';

  route.schema.operationId = [
    METHOD_PREFIX[normalizedMethod] ?? normalizedMethod.toLowerCase(),
    ...segments.map((segment) => segment.startsWith(':')
      ? `by-${segment.slice(1)}`
      : segment),
  ].map((segment, index) => index === 0
    ? segment
    : segment.replace(/(^|-)([a-z0-9])/g, (_, _separator, character: string) => character.toUpperCase()))
    .join('');
  route.schema.tags ??= [toTag(resource)];
}

function toTag(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
