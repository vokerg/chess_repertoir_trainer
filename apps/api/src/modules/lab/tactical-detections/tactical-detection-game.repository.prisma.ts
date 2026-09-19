import prisma from '../../../prisma';

export async function getTacticalDetectionGameState(
  userId: number,
  importedGameId: number,
  thresholdsHash: string,
) {
  return prisma.importedGame.findFirst({
    where: {
      id: importedGameId,
      userId,
    },
    select: {
      id: true,
      endedAt: true,
      latestAnalysisCompletedAt: true,
      latestAnalysisStatus: true,
      plyIndexedAt: true,
      _count: {
        select: { plies: true },
      },
      tacticalDetectionProcessedGames: {
        where: { userId, thresholdsHash },
        select: { importedGameId: true },
        take: 1,
      },
    },
  });
}
