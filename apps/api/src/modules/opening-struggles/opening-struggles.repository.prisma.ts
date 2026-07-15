import prisma from '../../prisma';
import { buildImportedGameWhere } from '../imported-games/imported-games.repository.prisma';
import { ImportedGameSummaryQuery } from '../imported-games/imported-games.schemas';

export async function countOpeningStruggleCandidateGames(
  userId: number,
  query: ImportedGameSummaryQuery,
): Promise<number> {
  return prisma.importedGame.count({
    where: buildImportedGameWhere(userId, query),
  });
}
