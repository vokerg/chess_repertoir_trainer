import prisma from '../../prisma';
import { GameOpeningAssignmentService, OpeningAssignmentResult } from './game-opening-assignment.service';
import { isStandardImportedGameSpeed, normalizeSpeedCategory } from './imported-game-workflow-eligibility';
import { ImportedGamePlyIndexResult, ImportedGamePlyIndexService } from './ply-index.service';

export type ImportedGameIndexWorkflowSkipReason = 'UNSUPPORTED_SPEED_CATEGORY';

export interface ImportedGameIndexWorkflowResult {
  importedGameId: number;
  eligible: boolean;
  speedCategory: string | null;
  skippedReason?: ImportedGameIndexWorkflowSkipReason;
  plyIndex?: ImportedGamePlyIndexResult;
  openingAssignment?: OpeningAssignmentResult;
}

async function getWorkflowGame(userId: number, importedGameId: number) {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId },
    select: {
      id: true,
      speedCategory: true,
    },
  });
}

export const ImportedGameIndexWorkflowService = {
  indexGame: async (
    userId: number,
    importedGameId: number,
    options: { force?: boolean } = {},
  ): Promise<ImportedGameIndexWorkflowResult> => {
    const game = await getWorkflowGame(userId, importedGameId);
    if (!game) throw new Error('Imported game not found');

    const speedCategory = normalizeSpeedCategory(game.speedCategory);
    if (!isStandardImportedGameSpeed(speedCategory)) {
      return {
        importedGameId: game.id,
        eligible: false,
        speedCategory,
        skippedReason: 'UNSUPPORTED_SPEED_CATEGORY',
      };
    }

    const plyIndex = await ImportedGamePlyIndexService.indexOne(userId, importedGameId, {
      force: options.force,
    });
    const openingAssignment = await GameOpeningAssignmentService.assignMissingOpening(userId, importedGameId);

    return {
      importedGameId: game.id,
      eligible: true,
      speedCategory,
      plyIndex,
      openingAssignment,
    };
  },
};
