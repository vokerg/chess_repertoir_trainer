import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { OpeningAnalysisQuery } from './imported-games.schemas';
import { buildImportedGameWhere } from './imported-games.repository.prisma';

export interface OpeningAnalysisOpeningBreakdownRow {
  openingEco: string | null;
  openingName: string | null;
  _count: { _all: number };
}

const OPENING_BREAKDOWN_LIMIT = 50;

function withoutOpeningFilter(query: OpeningAnalysisQuery): OpeningAnalysisQuery {
  return {
    ...query,
    openingEco: undefined,
    openingName: undefined,
  };
}

function matchingGameWhere(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
): Prisma.ImportedGameWhereInput {
  return {
    ...buildImportedGameWhere(userId, withoutOpeningFilter(query)),
    openingEco: { not: null },
    plies: { some: { positionId } },
  };
}

export async function findOpeningAnalysisOpeningBreakdown(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
): Promise<OpeningAnalysisOpeningBreakdownRow[]> {
  const rows = await prisma.importedGame.groupBy({
    by: ['openingEco', 'openingName'],
    where: matchingGameWhere(userId, query, positionId),
    _count: { _all: true },
    orderBy: [
      { _count: { openingEco: 'desc' } },
      { openingEco: 'asc' },
      { openingName: 'asc' },
    ],
    take: OPENING_BREAKDOWN_LIMIT,
  });

  return rows;
}
