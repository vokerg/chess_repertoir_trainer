import prisma from '../../prisma';
import { ImportedGamesService } from '../imported-games/imported-games.service';
import { isStandardImportedGameSpeed, normalizeSpeedCategory } from '../imported-games/imported-game-workflow-eligibility';
import { GameAnalysisService } from './game-analysis.service';

async function getWorkflowGame(userId: number, importedGameId: number) {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId },
    select: {
      id: true,
      speedCategory: true,
    },
  });
}

export const ImportedGameAnalysisWorkflowService = {
  recordClientAnalysisAndRefreshTags: async (
    userId: number,
    importedGameId: number,
    input: { positionsDone?: number; summary?: unknown } = {},
  ) => {
    const game = await getWorkflowGame(userId, importedGameId);
    if (!game) throw new Error('Imported game not found');

    const speedCategory = normalizeSpeedCategory(game.speedCategory);
    if (!isStandardImportedGameSpeed(speedCategory)) {
      throw new Error('Unsupported speed category for standard imported-game analysis workflow');
    }

    const result = await GameAnalysisService.createClientAnalysisSummary(userId, importedGameId, input);
    const tags = await ImportedGamesService.refreshTags(userId, importedGameId);
    return { ...result, tags };
  },
};
