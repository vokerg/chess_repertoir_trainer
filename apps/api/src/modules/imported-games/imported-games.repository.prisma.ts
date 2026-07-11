import { Prisma } from '@prisma/client';
import { moveClassificationCodeFromLegacy } from 'chess-domain';
import prisma from '../../prisma';
import { ImportedGameSearchQuery, ImportedGameSummaryQuery } from './imported-games.schemas';

export type ImportedGameSort = ImportedGameSearchQuery['sort'];
type ImportedGameFilterQuery = ImportedGameSearchQuery | ImportedGameSummaryQuery;

export interface ImportedGameCursor {
  endedAt: string | null;
  id: number;
}

const latestAnalysisRunSelect = {
  id: true,
  status: true,
  completedAt: true,
  createdAt: true,
  whiteAccuracy: true,
  blackAccuracy: true,
  summary: true,
} as const;

const importedGamePlySelect = {
  plyNumber: true,
  moveUci: true,
  scoreLossCp: true,
  classificationCode: true,
  position: {
    select: {
      normalizedFen: true,
      analysis: {
        select: {
          id: true,
          bestMoveUci: true,
          bestScoreCpWhite: true,
          bestMateWhite: true,
          lines: true,
        },
      },
    },
  },
} as const;

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
  tagCodes: true,
  analysisRuns: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: latestAnalysisRunSelect,
  },
} as const;

export const importedGameDetailSelect = {
  ...importedGameListSelect,
  pgn: true,
  createdAt: true,
  updatedAt: true,
  plies: {
    orderBy: { plyNumber: 'asc' as const },
    select: importedGamePlySelect,
  },
} as const;

export type ImportedGameListRow = Prisma.ImportedGameGetPayload<{ select: typeof importedGameListSelect }>;
export type ImportedGameDetailRow = Prisma.ImportedGameGetPayload<{ select: typeof importedGameDetailSelect }>;

export interface ImportedGameSummaryAggregateRows {
  total: number;
  results: Array<{ resultForUser: string | null; _count: { _all: number } }>;
  providers: Array<{ provider: string; _count: { _all: number } }>;
  speedCategories: Array<{ speedCategory: string | null; _count: { _all: number } }>;
  userColors: Array<{ userColor: string | null; _count: { _all: number } }>;
  openings: Array<{
    openingEco: string | null;
    openingName: string | null;
    _count: { _all: number };
  }>;
  ratings: Array<{
    userColor: string | null;
    _avg: { whiteRating: number | null; blackRating: number | null };
    _count: { whiteRating: number; blackRating: number };
  }>;
}

const openingStrugglesPlySelect = {
  importedGameId: true,
  plyNumber: true,
  moveUci: true,
  positionId: true,
  position: {
    select: {
      normalizedFen: true,
      analysis: {
        select: {
          id: true,
          bestMoveUci: true,
          bestScoreCpWhite: true,
          bestMateWhite: true,
        },
      },
    },
  },
} as const;

const openingStrugglesGameSelect = {
  ...importedGameListSelect,
  plies: {
    orderBy: { plyNumber: 'asc' as const },
    select: openingStrugglesPlySelect,
  },
} as const;

export type OpeningStrugglesGameRow = Prisma.ImportedGameGetPayload<{ select: typeof openingStrugglesGameSelect }>;

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

function buildEndedAtRange(query: ImportedGameFilterQuery) {
  if (!query.from && !query.to) return undefined;
  return {
    ...(query.from ? { gte: query.from } : {}),
    ...(query.to ? { lte: query.to } : {}),
  };
}

function buildUserRatingWhere(query: ImportedGameFilterQuery): Prisma.ImportedGameWhereInput[] {
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

function buildOpponentRatingWhere(query: ImportedGameFilterQuery): Prisma.ImportedGameWhereInput[] {
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

function buildTimeControlWhere(query: ImportedGameFilterQuery): Prisma.ImportedGameWhereInput[] {
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
  const codes = classifications
    .map((classification) => moveClassificationCodeFromLegacy(classification))
    .filter((code): code is number => typeof code === 'number');
  if (!codes.length) return [];
  return [{ plies: { some: { classificationCode: { in: codes } } } }];
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

function buildAnalysisStatusWhere(statuses?: ImportedGameFilterQuery['analysisStatus']): Prisma.ImportedGameWhereInput[] {
  if (!statuses?.length) return [];

  const concreteStatuses = statuses.filter((status) => status !== 'NOT_ANALYZED');
  const statusWhere: Prisma.ImportedGameWhereInput[] = [];
  if (concreteStatuses.length) {
    statusWhere.push({ latestAnalysisStatus: { in: concreteStatuses } });
  }
  if (statuses.includes('NOT_ANALYZED')) {
    statusWhere.push({ latestAnalysisStatus: null });
  }

  return statusWhere.length ? [{ OR: statusWhere }] : [];
}

function buildAccuracyWhere(query: ImportedGameFilterQuery): Prisma.ImportedGameWhereInput[] {
  const range = ratingRange(query.minAccuracy, query.maxAccuracy);
  if (!range) return [];

  return [
    {
      OR: [
        { userColor: 'WHITE', latestWhiteAccuracy: range },
        { userColor: 'BLACK', latestBlackAccuracy: range },
      ],
    },
  ];
}

function tagCodesFilter(query: ImportedGameFilterQuery): Prisma.IntNullableListFilter | undefined {
  if (query.tagFilter === 'NO_TAGS') return { isEmpty: true };
  return query.tagCodes?.length ? { hasSome: query.tagCodes } : undefined;
}

export function buildImportedGameWhere(userId: number, query: ImportedGameFilterQuery): Prisma.ImportedGameWhereInput {
  return {
    userId,
    accountId: accountInFilter(query.accountIds),
    provider: inFilter(query.providers),
    endedAt: buildEndedAtRange(query),
    resultForUser: inFilter(query.resultForUser),
    userColor: inFilter(query.userColor),
    rated: query.rated,
    speedCategory: inFilter(query.speedCategory),
    variant: inFilter(query.variant),
    openingEco: inFilter(query.openingEco),
    tagCodes: tagCodesFilter(query),
    openingName: query.openingName ? { contains: query.openingName, mode: 'insensitive' } : undefined,
    opponentUsername: query.opponent ? { contains: query.opponent, mode: 'insensitive' } : undefined,
    AND: [
      ...buildUserRatingWhere(query),
      ...buildOpponentRatingWhere(query),
      ...buildTimeControlWhere(query),
      ...buildClassificationWhere(query.classification),
      ...buildPlyIndexStatusWhere(query.plyIndexStatus),
      ...buildAnalysisStatusWhere(query.analysisStatus),
      ...buildAccuracyWhere(query),
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

export async function findImportedGames(userId: number, query: ImportedGameSearchQuery, cursor: ImportedGameCursor | null) {
  const where = buildImportedGameWhere(userId, query);
  const cursorWhere = buildCursorWhere(cursor, query.sort);

  return prisma.importedGame.findMany({
    where: cursorWhere ? { AND: [where, cursorWhere] } : where,
    orderBy: buildOrderBy(query.sort),
    take: query.limit + 1,
    select: importedGameListSelect,
  });
}

export async function summarizeImportedGames(
  userId: number,
  query: ImportedGameSummaryQuery,
): Promise<ImportedGameSummaryAggregateRows> {
  const where = buildImportedGameWhere(userId, query);
  const [total, results, providers, speedCategories, userColors, openings, ratings] = await Promise.all([
    prisma.importedGame.count({ where }),
    prisma.importedGame.groupBy({
      by: ['resultForUser'],
      where,
      _count: { _all: true },
    }),
    prisma.importedGame.groupBy({
      by: ['provider'],
      where,
      _count: { _all: true },
    }),
    prisma.importedGame.groupBy({
      by: ['speedCategory'],
      where,
      _count: { _all: true },
    }),
    prisma.importedGame.groupBy({
      by: ['userColor'],
      where,
      _count: { _all: true },
    }),
    prisma.importedGame.groupBy({
      by: ['openingEco', 'openingName'],
      where,
      _count: { _all: true },
    }),
    prisma.importedGame.groupBy({
      by: ['userColor'],
      where,
      _avg: { whiteRating: true, blackRating: true },
      _count: { whiteRating: true, blackRating: true },
    }),
  ]);

  return { total, results, providers, speedCategories, userColors, openings, ratings };
}

export async function findImportedGamesForOpeningStruggles(
  userId: number,
  query: ImportedGameSummaryQuery,
  maxPly: number,
) {
  return prisma.importedGame.findMany({
    where: buildImportedGameWhere(userId, query),
    orderBy: { id: 'asc' },
    select: {
      ...importedGameListSelect,
      plies: {
        where: { plyNumber: { lte: maxPly + 1 } },
        orderBy: { plyNumber: 'asc' },
        select: openingStrugglesPlySelect,
      },
    },
  });
}

export async function findImportedGameById(userId: number, id: number) {
  return prisma.importedGame.findFirst({
    where: { id, userId },
    select: importedGameDetailSelect,
  });
}

export async function getImportedGamePgn(userId: number, id: number) {
  return prisma.importedGame.findFirst({
    where: { id, userId },
    select: { id: true, pgn: true },
  });
}

export async function getImportedGameFacets(userId: number) {
  const [accounts, speeds, variants, results, colors, providers, openings, totalGames, analysisRunRows] = await Promise.all([
    prisma.externalAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        username: true,
        displayName: true,
        _count: { select: { importedGames: true } },
      },
      orderBy: [{ provider: 'asc' }, { username: 'asc' }],
    }),
    prisma.importedGame.groupBy({ by: ['speedCategory'], where: { userId }, _count: true, orderBy: { _count: { speedCategory: 'desc' } } }),
    prisma.importedGame.groupBy({ by: ['variant'], where: { userId }, _count: true, orderBy: { _count: { variant: 'desc' } } }),
    prisma.importedGame.groupBy({ by: ['resultForUser'], where: { userId }, _count: true }),
    prisma.importedGame.groupBy({ by: ['userColor'], where: { userId }, _count: true }),
    prisma.importedGame.groupBy({ by: ['provider'], where: { userId }, _count: true }),
    prisma.importedGame.groupBy({ by: ['openingEco', 'openingName'], where: { userId, openingEco: { not: null } }, _count: true, orderBy: { _count: { openingEco: 'desc' } }, take: 50 }),
    prisma.importedGame.count({ where: { userId } }),
    prisma.gameAnalysisRun.findMany({
      where: { importedGame: { userId } },
      orderBy: [
        { importedGameId: 'asc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        importedGameId: true,
        status: true,
      },
    }),
  ]);

  return { accounts, speeds, variants, results, colors, providers, openings, totalGames, analysisRunRows };
}
