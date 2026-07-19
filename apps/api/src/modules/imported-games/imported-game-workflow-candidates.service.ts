import prisma from '../../prisma';
import {
  isStandardImportedGameSpeed,
  isStandardImportedGameVariant,
  normalizeSpeedCategory,
} from './imported-game-workflow-eligibility';

export interface ImportedGameWorkflowCandidates {
  accountId: number;
  eligibleImportedGameIds: number[];
  eligibleUnindexedGameIds: number[];
  eligibleIndexedGameIds: number[];
  eligibleMissingOpeningGameIds: number[];
}

export const ImportedGameWorkflowCandidatesService = {
  forAccount: async (userId: number, accountId: number): Promise<ImportedGameWorkflowCandidates> => {
    const games = await prisma.importedGame.findMany({
      where: {
        userId,
        accountId,
      },
      select: {
        id: true,
        speedCategory: true,
        variant: true,
        plyIndexedAt: true,
        openingEco: true,
        openingName: true,
      },
      orderBy: [
        { endedAt: 'desc' },
        { id: 'desc' },
      ],
    });

    const eligibleGames = games.filter((game) =>
      isStandardImportedGameSpeed(normalizeSpeedCategory(game.speedCategory))
      && isStandardImportedGameVariant(game.variant),
    );

    return {
      accountId,
      eligibleImportedGameIds: eligibleGames.map((game) => game.id),
      eligibleUnindexedGameIds: eligibleGames
        .filter((game) => !game.plyIndexedAt)
        .map((game) => game.id),
      eligibleIndexedGameIds: eligibleGames
        .filter((game) => Boolean(game.plyIndexedAt))
        .map((game) => game.id),
      eligibleMissingOpeningGameIds: eligibleGames
        .filter((game) => Boolean(game.plyIndexedAt) && (!game.openingEco || !game.openingName))
        .map((game) => game.id),
    };
  },
};
