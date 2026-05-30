import dotenv from 'dotenv';
import prisma from './prisma';
import { claimNextQueuedGameAnalysisRun } from './modules/analysis/analysis.repository.prisma';
import { StockfishSession } from './modules/analysis/engine/stockfish-engine';
import { GameAnalysisService } from './modules/analysis/game-analysis.service';

dotenv.config();

const pollMs = Number(process.env['ANALYSIS_WORKER_POLL_MS'] || 3000);
const engineMode = (process.env['ANALYSIS_WORKER_ENGINE_MODE'] || 'lazy').toLowerCase();
const restartAfterGames = Number(process.env['ANALYSIS_WORKER_RESTART_ENGINE_AFTER_GAMES'] || 0);

let stopping = false;
let session: StockfishSession | undefined;
let gamesSinceEngineStart = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, data?: Record<string, unknown>) {
  const suffix = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[analysis-worker] ${message}${suffix}`);
}

async function getSession() {
  if (!session) {
    log('starting Stockfish session', {
      mode: engineMode,
      stockfishPath: process.env['STOCKFISH_PATH'] || 'stockfish',
      threads: process.env['STOCKFISH_THREADS'] || '1-default',
      hashMb: process.env['STOCKFISH_HASH_MB'] || '16-default',
    });
    session = await StockfishSession.start();
    gamesSinceEngineStart = 0;
    log('Stockfish session started');
  }
  return session;
}

function closeSession() {
  if (!session) return;
  log('closing Stockfish session');
  session.close();
  session = undefined;
  gamesSinceEngineStart = 0;
}

async function processOneQueuedRun() {
  const run = await claimNextQueuedGameAnalysisRun();
  if (!run) return false;

  log('claimed analysis run', {
    runId: run.id,
    importedGameId: run.importedGameId,
    depth: run.depth,
    multipv: run.multipv,
  });

  try {
    const engineSession = await getSession();
    await GameAnalysisService.executeAnalysisRun(run.id, engineSession);
    gamesSinceEngineStart += 1;
    log('completed analysis run', { runId: run.id });

    if (restartAfterGames > 0 && gamesSinceEngineStart >= restartAfterGames) {
      log('restarting Stockfish after completed game threshold', { restartAfterGames });
      closeSession();
    }
  } catch (error: any) {
    log('analysis run failed', { runId: run.id, error: error?.message ?? String(error) });
    closeSession();
  }

  return true;
}

async function main() {
  log('starting', { pollMs, engineMode, restartAfterGames });
  await GameAnalysisService.markInterruptedRunsOnWorkerStartup();

  if (engineMode === 'startup') {
    await getSession();
  } else if (engineMode !== 'lazy') {
    log('unknown ANALYSIS_WORKER_ENGINE_MODE; using lazy mode', { engineMode });
  }

  while (!stopping) {
    const processed = await processOneQueuedRun();
    if (!processed) await sleep(pollMs);
  }
}

async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  log('shutting down', { signal });
  closeSession();
  await prisma.$disconnect();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

main()
  .catch(async (error) => {
    console.error('[analysis-worker] fatal error', error);
    closeSession();
    await prisma.$disconnect();
    process.exit(1);
  });
