import { decodeUciMove } from 'chess-domain';
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
      moveCode: true,
      scoreLossCp: true,
      classificationCode: true,
      position: {
        select: {
          normalizedFen: true,
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

type StoredImportedGameForTagging = Prisma.ImportedGameGetPayload<{ select: typeof importedGameForTaggingSelect }>;
export type ImportedGameForTagging = Omit<StoredImportedGameForTagging, 'plies'> & {
  plies: Array<Omit<StoredImportedGameForTagging['plies'][number], 'moveCode'> & { moveUci: string }>;
};

export async function getGameTagDefinitions() {
  return prisma.gameTagDefinition.findMany({
    orderBy: { code: 'asc' },
  });
}

export async function getImportedGameForTagging(userId: number, gameId: number): Promise<ImportedGameForTagging | null> {
  const game = await prisma.importedGame.findFirst({
    where: { id: gameId, userId },
    select: importedGameForTaggingSelect,
  });
  return game ? { ...game, plies: game.plies.map(({ moveCode, ...ply }) => ({ ...ply, moveUci: decodeUciMove(moveCode!) })) } : null;
}

export async function updateImportedGameTagCodes(importedGameId: number, tagCodes: number[]) {
  const uniqueSortedCodes = Array.from(new Set(tagCodes)).sort((left, right) => left - right);
  return prisma.importedGame.update({
    where: { id: importedGameId },
    data: { tagCodes: uniqueSortedCodes },
    select: { id: true, tagCodes: true },
  });
}
