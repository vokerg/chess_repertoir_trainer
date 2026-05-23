import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import registerRoutes from './routes';

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

async function bootstrap() {
  const app = Fastify({ logger: true });
  // Enable CORS for the Angular frontend
  await app.register(cors, {
    origin: ORIGIN,
    credentials: true,
  });
  // Register all routes
  registerRoutes(app);

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`📦 API server listening on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();