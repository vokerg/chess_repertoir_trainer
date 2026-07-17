import prisma from '../../prisma';
import { ImportedGameProcessingService } from '../imported-games/imported-game-processing.service';
import { isStandardImportedGameSpeed } from '../imported-games/imported-game-workflow-eligibility';
import {
  getLocalBatchStockfishAnalysisConfig,
  isLocalBatchStockfishAnalysisEnabled,
} from './batch-analysis.config';
import { createStockfishEngine } from './stockfish-engine.factory';

interface BatchQueueItem {
  userId: number;
  gameIds: number[];
  force: boolean;
  refreshTagsAfterAnalysis: boolean;
}

const queue: BatchQueueItem[] = [];
let queueRunning = false;

async function drainQueue(): Promise<void> {
  if (queueRunning) return;
  queueRunning = true;

  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const config = getLocalBatchStockfishAnalysisConfig();
      const engine = createStockfishEngine(config);

      try {
        for (const gameId of item.gameIds) {
          try {
            await ImportedGameProcessingService.processOne(
              engine,
              item.userId,
              gameId,
              {
                depth: config.depth,
                multipv: config.multipv,
                force: item.force,
                refreshTagsAfterAnalysis: item.refreshTagsAfterAnalysis,
              },
            );
          } catch (error) {
            console.error(`Failed to batch analyse imported game ${gameId}`, error);
          }
        }
      } catch (error) {
        console.error('Could not start Stockfish batch analysis', error);
      } finally {
        engine.dispose();
      }
    }
  } finally {
    queueRunning = false;
  }
}

async function eligibleStandardGameIds(
  userId: number,
  gameIds: number[],
): Promise<number[]> {
  const games = await prisma.importedGame.findMany({
    where: {
      userId,
      id: { in: gameIds },
    },
    select: {
      id: true,
      speedCategory: true,
    },
  });
  const requestedOrder = new Map(gameIds.map((id, index) => [id, index]));
  return games
    .filter((game) => isStandardImportedGameSpeed(game.speedCategory))
    .sort((left, right) => (
      (requestedOrder.get(left.id) ?? 0) - (requestedOrder.get(right.id) ?? 0)
    ))
    .map((game) => game.id);
}

export const ImportedGameBatchAnalysisService = {
  enqueue: async (userId: number, gameIds: number[]) => {
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      throw new Error('Local batch Stockfish analysis is disabled');
    }

    const uniqueGameIds = Array.from(new Set(gameIds))
      .filter((id) => Number.isInteger(id) && id > 0);
    const eligibleGameIds = await eligibleStandardGameIds(userId, uniqueGameIds);
    if (!eligibleGameIds.length) {
      throw new Error('No eligible blitz or rapid imported games selected for batch analysis');
    }

    queue.push({
      userId,
      gameIds: eligibleGameIds,
      force: false,
      refreshTagsAfterAnalysis: true,
    });
    void drainQueue().catch((error) => {
      console.error('Local Stockfish batch analysis queue failed', error);
    });
    return eligibleGameIds;
  },

  enqueueFullRefresh: async (userId: number, gameId: number) => {
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      throw new Error('Local batch Stockfish analysis is disabled');
    }
    if (!Number.isInteger(gameId) || gameId <= 0) {
      throw new Error('Invalid imported game id');
    }
    const eligibleGameIds = await eligibleStandardGameIds(userId, [gameId]);
    if (!eligibleGameIds.length) {
      throw new Error('No eligible blitz or rapid imported games selected for full refresh');
    }

    queue.push({
      userId,
      gameIds: eligibleGameIds,
      force: true,
      refreshTagsAfterAnalysis: true,
    });
    void drainQueue().catch((error) => {
      console.error('Local Stockfish full refresh queue failed', error);
    });
  },
};
