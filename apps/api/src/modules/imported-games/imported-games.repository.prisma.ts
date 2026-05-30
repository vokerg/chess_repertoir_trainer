import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { SINGLETON_USER_ID } from '../../services/currentUserService';
import { ImportedGameSearchQuery } from './imported-games.schemas';

export type ImportedGameSort = ImportedGameSearchQuery['sort'];

export interface ImportedGameCursor {
  endedAt: string | null;
  id: number;
}

const latestAnalysisRunSelect = {
  id: true,
  status: true,
  depth: true,
  completedAt: true,
  createdAt: true,
  whiteAccuracy: true,
  blackAccuracy: true,
  summary: true,
} satisfies Prisma.GameAnalysisRunSelect;

export const importedGameListSelect = {
  id: true,
  accountId: true,
  provider: true,
  providerGameId: true,
  providerUrl: true,
  rated: true,
  variant: true,
  speedCategory: true,
  timeControlRaw: true,
  timeControlInitial: true,
  timeControlIncrement: true,
  startedAt: true,
  endedAt: true,
  whiteUsername: true,
  blackUsername: true,
  whiteRating: true,
  blackRating: true,
  userColor: true,
  opponentUsername: true,
  result: true,
  resultForUser: true,
  status: true,
  openingName: true,
  openingEco: true,
  plyIndexedAt: true,
  plyIndexError: true,
  analysisRuns: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: latestAnalysisRunSelect,
  },
} satisfies Prisma.ImportedGameSelect;

export const importedGameDetailSelect = {
  ...importedGameListSelect,
  pgn: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ImportedGameSelect;

export type ImportedGameListRow = Prisma.ImportedGameGetPayload<{ select: typeof importedGameListSelect }>;
export type ImportedGameDetailRow = Prisma.ImportedGameGetPayload<{ select: typeof importedGameDetailSelect }>;

function inFilter(values?: string[]) {
  return values && values.length ? { in: values } : undefined;
}

function accountInFilter(values?: number[]) {
  return values && values.length ? { in: values } : undefined;
}

function ratingRange(min?: number, max?: number) {
  if (min === undefined && max === undefined) return undefined;
  return {
    ...(min !== undefined ? { gte: min } : {}),
    ...(max !== undefined ? { lte: max } : {}),
  };
}

function buildEndedAtRange(query: ImportedGameSearchQuery) {
  if (!query.from && !query.to) return undefined;
  return {
    ...(query.from ? { gte: query.from } : {}),
    ...(query.to ? { lte: query.to } : {}),
  };
}

function buildUserRatingWhere(query: ImportedGameSearchQuery): Prisma.ImportedGameWhereInput[] {
  const range = ratingRange(query.minUserRating, query.maxUserRating);
  if (!range) return [];
  return [
    {
      OR: [
        { userColor: 'WHITE', whiteRating: range },
        { userColor: 'BLACK', blackRating: range },
      ],
    },
  ];
}

function buildOpponentRatingWhere(query: ImportedGameSearchQuery): Prisma.ImportedGameWhereInput[] {
  const range = ratingRange(query.minOpponentRating, query.maxOpponentRating);
  if (!range) return [];
  return [
    {
      OR: [
        { userColor: 'WHITE', blackRating: range },
        { userColor: 'BLACK', whiteRating: range },
      ],
    },
  ];
}

function buildTimeControlWhere(query: ImportedGameSearchQuery): Prisma.ImportedGameWhereInput[] {
  const search = query.timeControl?.trim();
  if (!search) return [];
  return [
    {
      OR: [
        { timeControlRaw: { contains: search, mode: 'insensitive' } },
        { timeControlRaw: { contains: search.replace('+', '|'), mode: 'insensitive' } },
      ],
    },
  ];
}

function buildClassificationWhere(classifications?: string[]): Prisma.ImportedGameWhereInput[] {
  if (!classifications?.length) return [];
  return [{ moveAnalyses: { some: { classification: { in: classifications } } } }];
}

function buildPlyIndexStatusWhere(statuses?: ImportedGameSearchQuery['plyIndexStatus']): Prisma.ImportedGameWhereInput[] {
  if (!statuses?.length) return [];

  return [
    {
      OR: statuses.map((status) => {
        if (status === 'INDEXED') return { plyIndexedAt: { not: null } };
        if (status === 'FAILED') return { plyIndexedAt: null, plyIndexError: { not: null } };
        return { plyIndexedAt: null, plyIndexError: null };
      }),
    },
  ];
}

export function buildImportedGameWhere(query: ImportedGameSearchQuery): Prisma.ImportedGameWhereInput {
  return {
    userId: SINGLETON_USER_ID,
    accountId: accountInFilter(query.accountIds),
    provider: inFilter(query.providers),
    endedAt: buildEndedAtRange(query),
    resultForUser: inFilter(query.resultForUser),
    userColor: inFilter(query.userColor),
    rated: query.rated,
    speedCategory: inFilter(query.speedCategory),
    variant: inFilter(query.variant),
    openingEco: inFilter(query.openingEco),
    openingName: query.openingName ? { contains: query.openingName, mode: 'insensitive' } : undefined,
    opponentUsername: query.opponent ? { contains: query.opponent, mode: 'insensitive' } : undefined,
    AND: [
      ...buildUserRatingWhere(query),
      ...buildOpponentRatingWhere(query),
      ...buildTimeControlWhere(query),
      ...buildClassificationWhere(query.classification),
      ...buildPlyIndexStatusWhere(query.plyIndexStatus),
    ],
  };
}

function buildCursorWhere(cursor: ImportedGameCursor | null, sort: ImportedGameSort): Prisma.ImportedGameWhereInput | undefined {
  if (!cursor) return undefined;

  if (sort === 'endedAtAsc') {
    if (!cursor.endedAt) return { endedAt: null, id: { gt: cursor.id } };
    return {
      OR: [
        { endedAt: { gt: new Date(cursor.endedAt) } },
        { endedAt: new Date(cursor.endedAt), id: { gt: cursor.id } },
        { endedAt: null },
      ],
    };
  }

  if (!cursor.endedAt) return { endedAt: null, id: { lt: cursor.id } };
  return {
    OR: [
      { endedAt: { lt: new Date(cursor.endedAt) } },
      { endedAt: new Date(cursor.endedAt), id: { lt: cursor.id } },
      { endedAt: null },
    ],
  };
}

function buildOrderBy(sort: ImportedGameSort): Prisma.ImportedGameOrderByWithRelationInput[] {
  if (sort === 'endedAtAsc') return [{ endedAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
  return [{ endedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
}

export async function findImportedGames(query: ImportedGameSearchQuery, cursor: ImportedGameCursor | null) {
  const where = buildImportedGameWhere(query);
  const cursorWhere = buildCursorWhere(cursor, query.sort);

  return prisma.importedGame.findMany({
    where: cursorWhere ? { AND: [where, cursorWhere] } : where,
    orderBy: buildOrderBy(query.sort),
    take: query.limit + 1,
    select: importedGameListSelect,
  });
}

export async function findImportedGameById(id: number) {
  return prisma.importedGame.findFirst({
    where: { id, userId: SINGLETON_USER_ID },
    select: importedGameDetailSelect,
  });
}

export async function getImportedGamePgn(id: number) {
  return prisma.importedGame.findFirst({
    where: { id, userId: SINGLETON_USER_ID },
    select: { id: true, pgn: true },
  });
}

export async function getImportedGameFacets() {
  const [accounts, speeds, variants, results, colors, providers, openings, latestAnalysisRows] = await Promise.all([
    prisma.externalAccount.findMany({
      where: { userId: SINGLETON_USER_ID },
      select: {
        id: true,
        provider: true,
        username: true,
        displayName: true,
        _count: { select: { importedGames: true } },
      },
      orderBy: [{ provider: 'asc' }, { username: 'asc' }],
    }),
    prisma.importedGame.groupBy({ by: ['speedCategory'], where: { userId: SINGLETON_USER_ID }, _count: true, orderBy: { _count: { speedCategory: 'desc' } } }),
    prisma.importedGame.groupBy({ by: ['variant'], where: { userId: SINGLETON_USER_ID }, _count: true, orderBy: { _count: { variant: 'desc' } } }),
    prisma.importedGame.groupBy({ by: ['resultForUser'], where: { userId: SINGLETON_USER_ID }, _count: true }),
    prisma.importedGame.groupBy({ by: ['userColor'], where: { userId: SINGLETON_USER_ID }, _count: true }),
    prisma.importedGame.groupBy({ by: ['provider'], where: { userId: SINGLETON_USER_ID }, _count: true }),
    prisma.importedGame.groupBy({ by: ['openingEco', 'openingName'], where: { userId: SINGLETON_USER_ID, openingEco: { not: null } }, _count: true, orderBy: { _count: { openingEco: 'desc' } }, take: 50 }),
    prisma.importedGame.findMany({
      where: { userId: SINGLETON_USER_ID },
      select: {
        analysisRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    }),
  ]);

  return { accounts, speeds, variants, results, colors, providers, openings, latestAnalysisRows };
}
