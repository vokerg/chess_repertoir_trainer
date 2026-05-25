import { FastifyInstance, RouteHandlerMethod, RouteOptions } from 'fastify';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type OpenApiOperation = Record<string, unknown>;
type OpenApiSchema = Record<string, unknown>;

interface RegisteredOpenApiRoute {
  method: HttpMethod;
  url: string;
  operation: OpenApiOperation;
}

const routes: RegisteredOpenApiRoute[] = [];
const schemas: Record<string, OpenApiSchema> = {};

function toOpenApiPath(url: string) {
  return url.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

export function registerOpenApiSchemas(nextSchemas: Record<string, OpenApiSchema>) {
  for (const [name, schema] of Object.entries(nextSchemas)) {
    schemas[name] = schema;
  }
}

export function registerOpenApiRoute(app: FastifyInstance, options: {
  method: HttpMethod;
  url: string;
  operation: OpenApiOperation;
  handler: RouteHandlerMethod;
}) {
  routes.push({
    method: options.method,
    url: options.url,
    operation: options.operation,
  });

  app.route({
    method: options.method.toUpperCase() as RouteOptions['method'],
    url: options.url,
    handler: options.handler,
  });
}

export function getGeneratedOpenApiPaths() {
  const paths: Record<string, Record<string, OpenApiOperation>> = {};

  for (const route of routes) {
    const path = toOpenApiPath(route.url);
    paths[path] ??= {};
    paths[path][route.method] = route.operation;
  }

  return paths;
}

export function getGeneratedOpenApiSchemas() {
  return schemas;
}
