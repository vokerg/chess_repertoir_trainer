import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { ImportedGameSearchQuery } from './imported-games.schemas';
import { buildImportedGameWhere } from './imported-games.repository.prisma';

const openingAnalysisRunSelect = {
  id: true,
  status: true,
  whiteAccuracy: true,
  blackAccuracy: true,
  summary: true,
} as const;

const openingAnalysisGameSelect = {
  id: true,
  provider: true,
  providerGameId: true,
  providerUrl: true,
  endedAt: true,
  speedCategory: true,
  timeControlRaw: true,
  timeControlInitial: true,
  timeControlIncrement: true,
  whiteUsername: true,
  whiteRating: true,
  blackUsername: true,
  blackRating: true,
  resultForUser: true,
  userColor: true,
  openingEco: true,
  openingName: true,
  analysisRuns: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: openingAnalysisRunSelect,
  },
} as const;

const openingAnalysisPlySelect = {
  importedGameId: true,
  plyNumber: true,
  moveUci: true,
  importedGame: {
    select: openingAnalysisGameSelect,
  },
} as const;

export type OpeningAnalysisPlyRow = Prisma.ImportedGamePlyGetPayload<{ select: typeof openingAnalysisPlySelect }>;

export async function findOpeningAnalysisRows(userId: number, query: ImportedGameSearchQuery, normalizedFen: string): Promise<OpeningAnalysisPlyRow[]> {
  const position = await prisma.position.findUnique({
    where: { normalizedFen },
    select: { id: true },
  });
  if (!position) return [];

  const searchQuery: ImportedGameSearchQuery = {
    ...query,
    limit: Math.max(query.limit, 200),
  };

  return prisma.importedGamePly.findMany({
    where: {
      positionId: position.id,
      importedGame: buildImportedGameWhere(userId, searchQuery),
    },
    orderBy: [{ moveUci: 'asc' }, { importedGameId: 'asc' }, { plyNumber: 'asc' }],
    select: openingAnalysisPlySelect,
  });
}
