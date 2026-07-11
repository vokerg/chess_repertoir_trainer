import dotenv from 'dotenv';
import { buildApp } from './app';

dotenv.config();

const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3000;

async function bootstrap() {
  const app = await buildApp({ logger: true });
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down API server');
    try {
      await app.close();
    } catch (error) {
      app.log.error({ err: error, signal }, 'API shutdown failed');
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API server listening on port ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
    await app.close().catch((closeError) => {
      app.log.error({ err: closeError }, 'API cleanup after startup failure failed');
    });
  }
}

void bootstrap();
