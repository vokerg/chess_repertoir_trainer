import { ImportedGamesService } from '../imported-games/imported-games.service';
import { ImportedGameProcessingService } from '../imported-games/imported-game-processing.service';
import { ImportedGameAnalysisExecutionService } from '../analysis/imported-game-analysis-execution.service';
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
  recordAnalysisSetupFailure?: typeof ImportedGameAnalysisExecutionService.recordSetupFailure;
  loadAnalysisConfig: () => LocalBatchStockfishAnalysisConfig;
  createEngine: (config: LocalBatchStockfishAnalysisConfig) => StockfishEngine;
}

const defaultDependencies: ImportedGameJobExecutorDependencies = {
  processing: ImportedGameProcessingService,
  refreshTags: ImportedGamesService.refreshTags,
  recordAnalysisSetupFailure: ImportedGameAnalysisExecutionService.recordSetupFailure,
  loadAnalysisConfig: getLocalBatchStockfishAnalysisConfig,
  createEngine: createStockfishEngine,
};

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Persistent imported-game task was aborted.');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function withAnalysisEngine(
  dependencies: ImportedGameJobExecutorDependencies,
  context: JobTaskExecutionContext,
  execute: (
    engine: StockfishEngine,
    config: LocalBatchStockfishAnalysisConfig,
  ) => Promise<JobTaskExecutionStatus>,
  onSetupFailure?: (error: unknown) => Promise<void>,
): Promise<JobTaskExecutionStatus> {
  throwIfAborted(context.signal);

  let config: LocalBatchStockfishAnalysisConfig;
  let engine: StockfishEngine;
  try {
    config = dependencies.loadAnalysisConfig();
    if (!config.enabled) {
      throw new Error('Local batch Stockfish analysis is disabled');
    }
    engine = dependencies.createEngine(config);
  } catch (error) {
    if (!context.signal.aborted && onSetupFailure) {
      try {
        await onSetupFailure(error);
      } catch (persistenceError) {
        console.error(
          'Could not persist imported-game analysis setup failure',
          errorMessage(persistenceError),
        );
      }
    }
    throw error;
  }

  let disposed = false;
  const disposeEngine = () => {
    if (disposed) return;
    disposed = true;
    engine.dispose();
  };
  context.signal.addEventListener('abort', disposeEngine, { once: true });

  try {
    return await execute(engine, config);
  } finally {
    context.signal.removeEventListener('abort', disposeEngine);
    disposeEngine();
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
        const onSetupFailure = dependencies.recordAnalysisSetupFailure
          ? (error: unknown) => dependencies.recordAnalysisSetupFailure!(
              task.userId,
              task.importedGameId,
              error,
            )
          : undefined;
        return withAnalysisEngine(
          dependencies,
          context,
          (engine, config) => dependencies.processing.analyseOne(
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
          ),
          onSetupFailure,
        );
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
