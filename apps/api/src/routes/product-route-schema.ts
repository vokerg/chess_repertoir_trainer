import type { RouteOptions } from 'fastify';

export function ensureProductRouteSchema(route: RouteOptions): void {
  if (!route.url.startsWith('/api/') || route.url.startsWith('/api/docs')) return;

  const schema = route.schema;
  if (schema?.hide) return;

  const responseStatuses = schema?.response ? Object.keys(schema.response) : [];
  const hasSuccessfulResponse = responseStatuses.some((status) => /^[23]\d\d$/.test(status));
  const isDeprecatedUnavailableRoute = schema?.deprecated === true
    && !hasSuccessfulResponse
    && responseStatuses.some((status) => /^4\d\d$/.test(status));

  const missing = [
    !schema?.operationId && 'operationId',
    (!schema?.tags || schema.tags.length === 0) && 'tags',
    !schema?.summary && 'summary',
    (!hasSuccessfulResponse && !isDeprecatedUnavailableRoute) && 'successful response',
  ].filter(Boolean);

  if (missing.length > 0) {
    const method = Array.isArray(route.method) ? route.method.join(',') : route.method;
    throw new Error(`Product route ${String(method)} ${route.url} is missing explicit schema metadata: ${missing.join(', ')}`);
  }
}
