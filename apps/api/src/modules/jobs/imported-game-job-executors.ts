import { ImportedGamesService } from '../imported-games/imported-games.service';
import { ImportedGameProcessingService } from '../imported-games/imported-game-processing.service';
import {
  getLocalBatchStockfishAnalysisConfig,
  type LocalBatchStockfishAnalysisConfig,
} from '../analysis/batch-analysis.config';
import { createStockfishEngine } from '../analysis/stockfish-engine.factory';
import type { StockfishEngine } from '../analysis/stockfish-engine';
import {
  JobTaskExecutorRegistry,
  type ClaimedJobTask,
  type JobTaskExecutionContext,
  type JobTaskExecutionStatus,
} from './job-task-executor';

interface ImportedGameJobExecutorDependencies {
  processing: Pick<
    typeof ImportedGameProcessingService,
    'indexOne' | 'analyseOne' | 'processOne'
  >;
  refreshTags: typeof ImportedGamesService.refreshTags;
  loadAnalysisConfig: () => LocalBatchStockfishAnalysisConfig;
  createEngine: (config: LocalBatchStockfishAnalysisConfig) => StockfishEngine;
}

const defaultDependencies: ImportedGameJobExecutorDependencies = {
  processing: ImportedGameProcessingService,
  refreshTags: ImportedGamesService.refreshTags,
  loadAnalysisConfig: getLocalBatchStockfishAnalysisConfig,
  createEngine: createStockfishEngine,
};

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Persistent imported-game task was aborted.');
}

async function withAnalysisEngine(
  dependencies: ImportedGameJobExecutorDependencies,
  context: JobTaskExecutionContext,
  execute: (
    engine: StockfishEngine,
    config: LocalBatchStockfishAnalysisConfig,
  ) => Promise<JobTaskExecutionStatus>,
): Promise<JobTaskExecutionStatus> {
  throwIfAborted(context.signal);
  const config = dependencies.loadAnalysisConfig();
  if (!config.enabled) {
    throw new Error('Local batch Stockfish analysis is disabled');
  }

  const engine = dependencies.createEngine(config);
  const abortEngine = () => engine.dispose();
  context.signal.addEventListener('abort', abortEngine, { once: true });

  try {
    return await execute(engine, config);
  } finally {
    context.signal.removeEventListener('abort', abortEngine);
    engine.dispose();
  }
}

export function createImportedGameJobTaskExecutorRegistry(
  dependencies: ImportedGameJobExecutorDependencies = defaultDependencies,
): JobTaskExecutorRegistry {
  return new JobTaskExecutorRegistry([
    {
      kind: 'INDEX_GAMES',
      execute(task: ClaimedJobTask, context: JobTaskExecutionContext) {
        return dependencies.processing.indexOne(task.userId, task.importedGameId, {
          force: task.force,
          signal: context.signal,
        });
      },
    },
    {
      kind: 'ANALYSE_GAMES',
      execute(task: ClaimedJobTask, context: JobTaskExecutionContext) {
        return withAnalysisEngine(dependencies, context, (engine, config) => (
          dependencies.processing.analyseOne(
            engine,
            task.userId,
            task.importedGameId,
            {
              depth: config.depth,
              multipv: config.multipv,
              force: task.force,
              refreshTagsAfterAnalysis: true,
              signal: context.signal,
            },
          )
        ));
      },
    },
    {
      kind: 'PROCESS_GAMES',
      execute(task: ClaimedJobTask, context: JobTaskExecutionContext) {
        return withAnalysisEngine(dependencies, context, (engine, config) => (
          dependencies.processing.processOne(
            engine,
            task.userId,
            task.importedGameId,
            {
              depth: config.depth,
              multipv: config.multipv,
              force: task.force,
              refreshTagsAfterAnalysis: true,
              signal: context.signal,
            },
          )
        ));
      },
    },
    {
      kind: 'REFRESH_TAGS',
      async execute(task: ClaimedJobTask, context: JobTaskExecutionContext) {
        throwIfAborted(context.signal);
        await dependencies.refreshTags(task.userId, task.importedGameId);
        return 'COMPLETED';
      },
    },
  ]);
}

export const defaultJobTaskExecutorRegistry = createImportedGameJobTaskExecutorRegistry();
