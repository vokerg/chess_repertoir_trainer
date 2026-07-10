import dotenv from 'dotenv';
import { buildApp } from './app';

dotenv.config();

const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3000;

async function bootstrap() {
  const app = await buildApp({ logger: true });

  const shutdown = async (signal: NodeJS.Signals) => {
    app.log.info({ signal }, 'Shutting down API server');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API server listening on port ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void bootstrap();
