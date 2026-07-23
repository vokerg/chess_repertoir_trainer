import { ImportedGamesService } from '../imported-games/imported-games.service';
import { refreshTacticalDetectionsForGame } from '../lab/tactical-detections/tactical-detection.service';
import {
  ImportedGameAnalysisService,
  type ImportedGameAnalysisExecutionStatus,
  type ImportedGameAnalysisOptions,
} from './imported-game-analysis.service';
import {
  abandonGameAnalysisRun,
  findAbortCleanupCandidate,
  getImportedGameAnalysisExecutionState,
  type ImportedGameAnalysisExecutionState,
} from './analysis-run-lifecycle.repository.prisma';
import type { StockfishEngine } from './stockfish-engine';

export type { ImportedGameAnalysisOptions } from './imported-game-analysis.service';

interface ImportedGameAnalysisExecutionDependencies {
  analyseOne: typeof ImportedGameAnalysisService.analyseOne;
  refreshTags: typeof ImportedGamesService.refreshTags;
  refreshTacticalDetections: typeof refreshTacticalDetectionsForGame;
  getExecutionState: typeof getImportedGameAnalysisExecutionState;
  findAbortCleanupCandidate: typeof findAbortCleanupCandidate;
  abandonRun: typeof abandonGameAnalysisRun;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Imported-game analysis execution was aborted.');
}

function isCurrent(
  state: ImportedGameAnalysisExecutionState,
): boolean {
  return state.latest?.status === 'COMPLETED'
    && state.latest.positionsDone >= state.totalPlies
    && state.latest.positionsTotal >= state.totalPlies
    && state.analysedPlies >= state.totalPlies;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createImportedGameAnalysisExecutionService(
  dependencies: ImportedGameAnalysisExecutionDependencies,
) {
  return {
    async analyseOne(
      engine: StockfishEngine,
      userId: number,
      importedGameId: number,
      options: ImportedGameAnalysisOptions,
    ): Promise<ImportedGameAnalysisExecutionStatus> {
      throwIfAborted(options.signal);
      const state = await dependencies.getExecutionState(userId, importedGameId);
      if (!state) throw new Error('Imported game not found');
      throwIfAborted(options.signal);

      if (!options.force && isCurrent(state)) {
        if (options.refreshTagsAfterAnalysis) {
          await dependencies.refreshTags(userId, importedGameId);
          throwIfAborted(options.signal);
          await dependencies.refreshTacticalDetections(userId, importedGameId, { force: false });
          throwIfAborted(options.signal);
        }
        return 'SKIPPED';
      }

      const effectiveOptions = !options.force
        && state.hasOtherCurrentRunAtLatestTimestamp
        ? { ...options, force: true }
        : options;

      try {
        const status = await dependencies.analyseOne(
          engine,
          userId,
          importedGameId,
          effectiveOptions,
        );
        if (options.refreshTagsAfterAnalysis) {
          throwIfAborted(options.signal);
          await dependencies.refreshTacticalDetections(userId, importedGameId, {
            force: status === 'COMPLETED',
          });
          throwIfAborted(options.signal);
        }
        return status;
      } catch (error) {
        if (options.signal?.aborted) {
          const candidate = await dependencies.findAbortCleanupCandidate({
            userId,
            importedGameId,
            afterRunId: state.maxRunId,
            error: errorMessage(error),
          });
          if (candidate !== null) {
            await dependencies.abandonRun(candidate);
          }
        }
        throw error;
      }
    },
  };
}

export const ImportedGameAnalysisExecutionService = createImportedGameAnalysisExecutionService({
  analyseOne: ImportedGameAnalysisService.analyseOne,
  refreshTags: ImportedGamesService.refreshTags,
  refreshTacticalDetections: refreshTacticalDetectionsForGame,
  getExecutionState: getImportedGameAnalysisExecutionState,
  findAbortCleanupCandidate,
  abandonRun: abandonGameAnalysisRun,
});
