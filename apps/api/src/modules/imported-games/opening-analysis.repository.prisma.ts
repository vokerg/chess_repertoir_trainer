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
} satisfies Prisma.GameAnalysisRunSelect;

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
} satisfies Prisma.ImportedGameSelect;

const openingAnalysisPlySelect = {
  importedGameId: true,
  plyNumber: true,
  moveUci: true,
  importedGame: {
    select: openingAnalysisGameSelect,
  },
} satisfies Prisma.ImportedGamePlySelect;

export type OpeningAnalysisPlyRow = Prisma.ImportedGamePlyGetPayload<{ select: typeof openingAnalysisPlySelect }>;

export async function findOpeningAnalysisRows(query: ImportedGameSearchQuery, normalizedFen: string): Promise<OpeningAnalysisPlyRow[]> {
  const position = await prisma.importedGamePosition.findUnique({
    where: { normalizedFen },
    select: { id: true },
  });
  if (!position) return [];

  const ratedOnlyQuery: ImportedGameSearchQuery = {
    ...query,
    rated: true,
    limit: Math.max(query.limit, 200),
  };

  return prisma.importedGamePly.findMany({
    where: {
      positionId: position.id,
      importedGame: buildImportedGameWhere(ratedOnlyQuery),
    },
    orderBy: [{ moveUci: 'asc' }, { importedGameId: 'asc' }, { plyNumber: 'asc' }],
    select: openingAnalysisPlySelect,
  });
}
