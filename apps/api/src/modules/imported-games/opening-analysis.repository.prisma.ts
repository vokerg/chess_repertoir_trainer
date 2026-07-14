import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { positionKeyForNormalizedFen } from '../positions/position-key';
import { OpeningAnalysisQuery } from './imported-games.schemas';
import { buildImportedGameWhere } from './imported-games.repository.prisma';

const openingAnalysisGameSelect = {
  id: true,
  provider: true,
  endedAt: true,
  speedCategory: true,
  whiteUsername: true,
  whiteRating: true,
  blackUsername: true,
  blackRating: true,
  resultForUser: true,
  openingEco: true,
  openingName: true,
} as const;

const openingTopGameSelect = {
  ...openingAnalysisGameSelect,
  plies: {
    select: {
      plyNumber: true,
      moveUci: true,
    },
  },
} as const;

export type OpeningAnalysisGameRow = Prisma.ImportedGameGetPayload<{ select: typeof openingAnalysisGameSelect }>;
export type OpeningTopGameRow = Prisma.ImportedGameGetPayload<{ select: typeof openingTopGameSelect }>;

export interface OpeningPositionRow {
  id: number;
  normalizedFen: string;
}

export interface OpeningCoreSummaryRow {
  occurrences: number;
  gameResults: Array<{ resultForUser: string | null; _count: { _all: number } }>;
}

export interface OpeningNextMoveOccurrenceRow {
  moveUci: string;
  plyNumber: number;
  _count: { _all: number };
}

export interface OpeningNextMoveGameRow {
  moveUci: string;
  importedGameId: number;
  importedGame: {
    resultForUser: string | null;
  };
}

export interface OpeningPerformanceGameRow {
  id: number;
  resultForUser: string | null;
  tagCodes: number[] | null;
}

function filteredGameWhere(userId: number, query: OpeningAnalysisQuery): Prisma.ImportedGameWhereInput {
  const where = buildImportedGameWhere(userId, query);
  if (!query.openingNameExact) return where;
  return {
    ...where,
    openingName: { equals: query.openingNameExact, mode: 'insensitive' },
  };
}

function matchingGameWhere(userId: number, query: OpeningAnalysisQuery, positionId: number): Prisma.ImportedGameWhereInput {
  return {
    ...filteredGameWhere(userId, query),
    plies: { some: { positionId } },
  };
}

function matchingPlyWhere(userId: number, query: OpeningAnalysisQuery, positionId: number): Prisma.ImportedGamePlyWhereInput {
  return {
    positionId,
    importedGame: filteredGameWhere(userId, query),
  };
}

export async function findOpeningPositionByNormalizedFen(normalizedFen: string): Promise<OpeningPositionRow | null> {
  return prisma.position.findUnique({
    where: { positionKey: new Uint8Array(positionKeyForNormalizedFen(normalizedFen)) },
    select: { id: true, normalizedFen: true },
  });
}

export async function findOpeningCoreSummary(userId: number, query: OpeningAnalysisQuery, positionId: number): Promise<OpeningCoreSummaryRow> {
  const [occurrences, gameResults] = await Promise.all([
    prisma.importedGamePly.count({
      where: matchingPlyWhere(userId, query, positionId),
    }),
    prisma.importedGame.groupBy({
      by: ['resultForUser'],
      where: matchingGameWhere(userId, query, positionId),
      _count: { _all: true },
    }),
  ]);

  return { occurrences, gameResults };
}

export async function findOpeningNextMoves(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
): Promise<{ occurrences: OpeningNextMoveOccurrenceRow[]; distinctGames: OpeningNextMoveGameRow[] }> {
  const where = matchingPlyWhere(userId, query, positionId);
  const [occurrences, distinctGames] = await Promise.all([
    prisma.importedGamePly.groupBy({
      by: ['moveUci', 'plyNumber'],
      where,
      _count: { _all: true },
      orderBy: [{ moveUci: 'asc' }, { plyNumber: 'asc' }],
    }),
    prisma.importedGamePly.findMany({
      where,
      distinct: ['moveUci', 'importedGameId'],
      orderBy: [{ moveUci: 'asc' }, { importedGameId: 'asc' }, { plyNumber: 'asc' }],
      select: {
        moveUci: true,
        importedGameId: true,
        importedGame: {
          select: {
            resultForUser: true,
          },
        },
      },
    }),
  ]);

  return { occurrences, distinctGames };
}

export async function findOpeningTopGames(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
  limit: number,
): Promise<OpeningTopGameRow[]> {
  return prisma.importedGame.findMany({
    where: matchingGameWhere(userId, query, positionId),
    orderBy: [{ endedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
    take: limit,
    select: {
      ...openingTopGameSelect,
      plies: {
        where: { positionId },
        orderBy: [{ plyNumber: 'asc' }],
        take: 1,
        select: {
          plyNumber: true,
          moveUci: true,
        },
      },
    },
  });
}

export async function findOpeningPerformanceGames(
  userId: number,
  query: OpeningAnalysisQuery,
  positionId: number,
): Promise<OpeningPerformanceGameRow[]> {
  return prisma.importedGame.findMany({
    where: matchingGameWhere(userId, query, positionId),
    select: {
      id: true,
      resultForUser: true,
      tagCodes: true,
    },
  });
}
