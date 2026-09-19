import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { OpeningAnalysisQuery } from './imported-games.schemas';
import { buildImportedGameWhere } from './imported-games.repository.prisma';

export interface OpeningAnalysisOpeningBreakdownRow {
  openingName: string | null;
  resultForUser: string | null;
  _count: { _all: number };
}

function withoutOpeningFilter(query: OpeningAnalysisQuery): OpeningAnalysisQuery {
  return {
    ...query,
    openingEco: undefined,
    openingName: undefined,
    openingNameExact: undefined,
  };
}

function matchingGameWhere(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
): Prisma.ImportedGameWhereInput {
  return {
    ...buildImportedGameWhere(userId, withoutOpeningFilter(query)),
    openingName: { not: null },
    plies: { some: { positionId } },
  };
}

export async function findOpeningAnalysisOpeningBreakdown(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
): Promise<OpeningAnalysisOpeningBreakdownRow[]> {
  const rows = await prisma.importedGame.groupBy({
    by: ['openingName', 'resultForUser'],
    where: matchingGameWhere(userId, query, positionId),
    _count: { _all: true },
  });

  return rows;
}
