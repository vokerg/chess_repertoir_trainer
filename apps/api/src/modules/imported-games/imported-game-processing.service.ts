import type { StockfishEngine } from '../analysis/stockfish-engine';
import {
  ImportedGameAnalysisService,
  type ImportedGameAnalysisOptions,
} from '../analysis/imported-game-analysis.service';
import { GameOpeningAssignmentService } from './game-opening-assignment.service';
import { ImportedGamePlyIndexService } from './ply-index.service';

export type ImportedGameProcessingExecutionStatus = 'COMPLETED' | 'SKIPPED';

export interface ImportedGameIndexExecutionOptions {
  force: boolean;
  signal?: AbortSignal;
}

export type ImportedGameProcessExecutionOptions = ImportedGameAnalysisOptions;

interface ImportedGameProcessingDependencies {
  indexOne: typeof ImportedGamePlyIndexService.indexOne;
  assignMissingOpening: typeof GameOpeningAssignmentService.assignMissingOpening;
  analyseOne: typeof ImportedGameAnalysisService.analyseOne;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Imported-game processing was aborted.');
}

export function createImportedGameProcessingService(
  dependencies: ImportedGameProcessingDependencies,
) {
  return {
    async indexOne(
      userId: number,
      importedGameId: number,
      options: ImportedGameIndexExecutionOptions,
    ): Promise<ImportedGameProcessingExecutionStatus> {
      throwIfAborted(options.signal);
      const indexResult = await dependencies.indexOne(userId, importedGameId, {
        force: options.force,
      });
      if (indexResult.status === 'FAILED') {
        throw new Error(indexResult.error || 'Could not index game plies');
      }

      throwIfAborted(options.signal);
      const openingResult = await dependencies.assignMissingOpening(userId, importedGameId);
      if (openingResult.status === 'FAILED') {
        throw new Error(openingResult.reason || 'Could not assign game opening');
      }

      return indexResult.status === 'INDEXED' || openingResult.status === 'ASSIGNED'
        ? 'COMPLETED'
        : 'SKIPPED';
    },

    analyseOne(
      engine: StockfishEngine,
      userId: number,
      importedGameId: number,
      options: ImportedGameAnalysisOptions,
    ): Promise<ImportedGameProcessingExecutionStatus> {
      return dependencies.analyseOne(engine, userId, importedGameId, options);
    },

    async processOne(
      engine: StockfishEngine,
      userId: number,
      importedGameId: number,
      options: ImportedGameProcessExecutionOptions,
    ): Promise<ImportedGameProcessingExecutionStatus> {
      const indexStatus = await this.indexOne(userId, importedGameId, {
        force: options.force,
        signal: options.signal,
      });
      throwIfAborted(options.signal);
      const analysisStatus = await this.analyseOne(
        engine,
        userId,
        importedGameId,
        options,
      );
      return indexStatus === 'COMPLETED' || analysisStatus === 'COMPLETED'
        ? 'COMPLETED'
        : 'SKIPPED';
    },
  };
}

export const ImportedGameProcessingService = createImportedGameProcessingService({
  indexOne: ImportedGamePlyIndexService.indexOne,
  assignMissingOpening: GameOpeningAssignmentService.assignMissingOpening,
  analyseOne: ImportedGameAnalysisService.analyseOne,
});
