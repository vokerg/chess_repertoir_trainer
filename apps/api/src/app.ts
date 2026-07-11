import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import authPlugin from './auth/auth.plugin';
import type { AuthConfig } from './auth/auth.config';
import prisma from './prisma';
import registerRoutes from './routes';
import { ensureProductRouteSchema } from './routes/product-route-schema';

export interface PrismaLifecycle {
  $disconnect(): Promise<void>;
}

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  corsOrigin?: string;
  authConfig?: AuthConfig;
  prisma?: PrismaLifecycle;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler((error, request, reply) => {
    if (typeof error === 'object' && error !== null && 'validation' in error) {
      request.log.warn({ err: error }, 'Request validation failed');
      return reply.code(400).send({ error: 'Validation failed' });
    }

    request.log.error({ err: error }, 'Request failed');
    return reply.send(error);
  });
  app.addHook('onRoute', ensureProductRouteSchema);
  app.addHook('onClose', async () => {
    await (options.prisma ?? prisma).$disconnect();
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Chess Repertoire Trainer API',
        version: '1.0.0',
      },
    },
    hideUntagged: true,
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(cors, {
    origin: options.corsOrigin ?? process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.get('/health', async () => ({ ok: true }));
  await app.register(authPlugin, { authConfig: options.authConfig });
  registerRoutes(app);

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
  app.get('/api/docs/openapi.json', {
    schema: { hide: true },
  }, async () => app.swagger());

  return app;
}
