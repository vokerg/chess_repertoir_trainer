import dotenv from 'dotenv';
import { buildApp } from './app';

dotenv.config();

const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3000;

async function bootstrap() {
  let app: Awaited<ReturnType<typeof buildApp>> | null = null;

  try {
    app = await buildApp({ logger: true });
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API server listening on port ${port}`);
  } catch (error) {
    process.exitCode = 1;

    if (!app) {
      console.error('API startup failed', error);
      return;
    }

    app.log.error({ err: error }, 'API startup failed');
    await app.close().catch((closeError) => {
      app?.log.error({ err: closeError }, 'API cleanup after startup failure failed');
    });
    return;
  }

  if (!app) return;
  const runningApp = app;
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    runningApp.log.info({ signal }, 'Shutting down API server');
    try {
      await runningApp.close();
    } catch (error) {
      runningApp.log.error({ err: error, signal }, 'API shutdown failed');
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
