import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

const latestAnalysisRunForTaggingSelect = {
  id: true,
  status: true,
  summary: true,
  whiteAccuracy: true,
  blackAccuracy: true,
  createdAt: true,
  completedAt: true,
} as const;

const importedGameForTaggingSelect = {
  id: true,
  provider: true,
  status: true,
  result: true,
  resultForUser: true,
  userColor: true,
  whiteRating: true,
  blackRating: true,
  speedCategory: true,
  timeControlInitial: true,
  timeControlIncrement: true,
  openingEco: true,
  openingName: true,
  plyIndexedAt: true,
  plyIndexError: true,
  tagCodes: true,
  analysisRuns: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: latestAnalysisRunForTaggingSelect,
  },
  plies: {
    orderBy: { plyNumber: 'asc' as const },
    select: {
      plyNumber: true,
      moveUci: true,
      scoreLossCp: true,
      classificationCode: true,
      position: {
        select: {
          analysis: {
            select: {
              bestScoreCpWhite: true,
              bestMateWhite: true,
              bestMoveUci: true,
            },
          },
        },
      },
    },
  },
} as const;

export type ImportedGameForTagging = Prisma.ImportedGameGetPayload<{
  select: typeof importedGameForTaggingSelect;
}>;

export async function getGameTagDefinitions() {
  return prisma.gameTagDefinition.findMany({
    orderBy: { code: 'asc' },
  });
}

export async function getImportedGameForTagging(userId: number, gameId: number): Promise<ImportedGameForTagging | null> {
  return prisma.importedGame.findFirst({
    where: { id: gameId, userId },
    select: importedGameForTaggingSelect,
  });
}

export async function updateImportedGameTagCodes(importedGameId: number, tagCodes: number[]) {
  const uniqueSortedCodes = Array.from(new Set(tagCodes)).sort((left, right) => left - right);
  return prisma.importedGame.update({
    where: { id: importedGameId },
    data: { tagCodes: uniqueSortedCodes },
    select: { id: true, tagCodes: true },
  });
}
