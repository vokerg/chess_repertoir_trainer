import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { GAME_TAG } from '../imported-games/game-tags';
import { STANDARD_IMPORTED_GAME_VARIANTS } from '../imported-games/imported-game-workflow-eligibility';
import {
  buildImportedGameWhere,
} from '../imported-games/imported-games.repository.prisma';
import type { ImportedGameSummaryQuery } from '../imported-games/imported-games.schemas';

export const PLAYER_CHESS_PROFILE_OPENING_GROUP_LIMIT = 100;

export type ProfileUserColor = 'WHITE' | 'BLACK';

export interface PlayerChessProfileAggregateRow {
  totalGames: number;
  indexedGames: number;
  analysedGames: number;
  namedOpeningGames: number;
  wins: number;
  draws: number;
  losses: number;
  openingPositiveGames: number;
  openingTroubleGames: number;
  earlyMistakeGames: number;
  accuracyGames: number;
  averageAccuracy: number | null;
}

export interface PlayerChessProfileOpeningGroupRow {
  openingEco: string | null;
  openingName: string | null;
  userColor: ProfileUserColor;
  games: number;
  analysedGames: number;
  wins: number;
  draws: number;
  losses: number;
  openingPositiveGames: number;
  openingTroubleGames: number;
  earlyMistakeGames: number;
  accuracyGames: number;
  averageAccuracy: number | null;
}

export interface PlayerChessProfileSupportingGameRow {
  id: number;
  provider: string;
  providerUrl: string | null;
  endedAt: Date | null;
  speedCategory: string | null;
  userColor: ProfileUserColor;
  resultForUser: string | null;
  openingEco: string | null;
  openingName: string | null;
  userRating: number | null;
  opponentRating: number | null;
  analysisStatus: string | null;
  accuracy: number | null;
}

export interface PlayerChessProfileRepositoryResult {
  aggregate: PlayerChessProfileAggregateRow;
  openingGroups: PlayerChessProfileOpeningGroupRow[];
  openingGroupsTruncated: boolean;
  supportingGames: PlayerChessProfileSupportingGameRow[];
}

export interface PlayerChessProfileRepositoryInput {
  userId: number;
  query: ImportedGameSummaryQuery;
  supportingGamesLimit: number;
}

function andWhere(
  base: Prisma.ImportedGameWhereInput,
  extra: Prisma.ImportedGameWhereInput,
): Prisma.ImportedGameWhereInput {
  return { AND: [base, extra] };
}

function standardVariantWhere(base: Prisma.ImportedGameWhereInput): Prisma.ImportedGameWhereInput {
  return andWhere(base, {
    OR: [
      { variant: null },
      { variant: { in: [...STANDARD_IMPORTED_GAME_VARIANTS] } },
    ],
  });
}

function isProfileUserColor(value: string | null): value is ProfileUserColor {
  return value === 'WHITE' || value === 'BLACK';
}

function openingKey(
  openingEco: string | null,
  openingName: string | null,
  userColor: string | null,
): string {
  return JSON.stringify([openingEco, openingName, userColor]);
}

function resultCounts(
  rows: Array<{ resultForUser: string | null; _count: { _all: number } }>,
): { wins: number; draws: number; losses: number } {
  const counts = { wins: 0, draws: 0, losses: 0 };
  for (const row of rows) {
    if (row.resultForUser === 'WIN') counts.wins += row._count._all;
    if (row.resultForUser === 'DRAW') counts.draws += row._count._all;
    if (row.resultForUser === 'LOSS') counts.losses += row._count._all;
  }
  return counts;
}

function weightedAccuracy(rows: Array<{
  userColor: string | null;
  _avg: { latestWhiteAccuracy: number | null; latestBlackAccuracy: number | null };
  _count: { latestWhiteAccuracy: number; latestBlackAccuracy: number };
}>): { accuracyGames: number; averageAccuracy: number | null } {
  let weightedTotal = 0;
  let accuracyGames = 0;

  for (const row of rows) {
    const average = row.userColor === 'WHITE'
      ? row._avg.latestWhiteAccuracy
      : row.userColor === 'BLACK'
        ? row._avg.latestBlackAccuracy
        : null;
    const count = row.userColor === 'WHITE'
      ? row._count.latestWhiteAccuracy
      : row.userColor === 'BLACK'
        ? row._count.latestBlackAccuracy
        : 0;
    if (average === null || count === 0) continue;
    weightedTotal += average * count;
    accuracyGames += count;
  }

  return {
    accuracyGames,
    averageAccuracy: accuracyGames > 0 ? weightedTotal / accuracyGames : null,
  };
}

async function summarizeAggregate(
  where: Prisma.ImportedGameWhereInput,
): Promise<PlayerChessProfileAggregateRow> {
  const [
    totalGames,
    indexedGames,
    analysedGames,
    namedOpeningGames,
    results,
    accuracyRows,
    openingPositiveGames,
    openingTroubleGames,
    earlyMistakeGames,
  ] = await Promise.all([
    prisma.importedGame.count({ where }),
    prisma.importedGame.count({ where: andWhere(where, { plyIndexedAt: { not: null } }) }),
    prisma.importedGame.count({ where: andWhere(where, { latestAnalysisCompletedAt: { not: null } }) }),
    prisma.importedGame.count({
      where: andWhere(where, {
        OR: [{ openingEco: { not: null } }, { openingName: { not: null } }],
      }),
    }),
    prisma.importedGame.groupBy({
      by: ['resultForUser'],
      where,
      _count: { _all: true },
    }),
    prisma.importedGame.groupBy({
      by: ['userColor'],
      where: andWhere(where, {
        OR: [
          { userColor: 'WHITE', latestWhiteAccuracy: { not: null } },
          { userColor: 'BLACK', latestBlackAccuracy: { not: null } },
        ],
      }),
      _avg: { latestWhiteAccuracy: true, latestBlackAccuracy: true },
      _count: { latestWhiteAccuracy: true, latestBlackAccuracy: true },
    }),
    prisma.importedGame.count({
      where: andWhere(where, {
        tagCodes: { hasSome: [GAME_TAG.OPENING_SUCCESS, GAME_TAG.OPENING_ADVANTAGE] },
      }),
    }),
    prisma.importedGame.count({
      where: andWhere(where, {
        tagCodes: { hasSome: [GAME_TAG.OPENING_DISASTER, GAME_TAG.OPENING_TROUBLE] },
      }),
    }),
    prisma.importedGame.count({
      where: andWhere(where, {
        tagCodes: { hasSome: [GAME_TAG.EARLY_BLUNDER, GAME_TAG.EARLY_MISTAKE] },
      }),
    }),
  ]);

  const wdl = resultCounts(results);
  const accuracy = weightedAccuracy(accuracyRows);

  return {
    totalGames,
    indexedGames,
    analysedGames,
    namedOpeningGames,
    ...wdl,
    openingPositiveGames,
    openingTroubleGames,
    earlyMistakeGames,
    ...accuracy,
  };
}

async function groupedCount(
  where: Prisma.ImportedGameWhereInput,
): Promise<Array<{
  openingEco: string | null;
  openingName: string | null;
  userColor: string | null;
  _count: { _all: number };
}>> {
  return prisma.importedGame.groupBy({
    by: ['openingEco', 'openingName', 'userColor'],
    where,
    _count: { _all: true },
  });
}

async function summarizeOpeningGroups(
  where: Prisma.ImportedGameWhereInput,
): Promise<{ rows: PlayerChessProfileOpeningGroupRow[]; truncated: boolean }> {
  const eligibleWhere = andWhere(where, {
    userColor: { in: ['WHITE', 'BLACK'] },
    OR: [{ openingEco: { not: null } }, { openingName: { not: null } }],
  });
  const topRows = await prisma.importedGame.groupBy({
    by: ['openingEco', 'openingName', 'userColor'],
    where: eligibleWhere,
    _count: { _all: true },
    orderBy: [
      { _count: { _all: 'desc' } },
      { openingName: 'asc' },
      { openingEco: 'asc' },
      { userColor: 'asc' },
    ],
    take: PLAYER_CHESS_PROFILE_OPENING_GROUP_LIMIT + 1,
  });

  const truncated = topRows.length > PLAYER_CHESS_PROFILE_OPENING_GROUP_LIMIT;
  const selectedRows = topRows.slice(0, PLAYER_CHESS_PROFILE_OPENING_GROUP_LIMIT);
  if (selectedRows.length === 0) return { rows: [], truncated };

  const selectedWhere: Prisma.ImportedGameWhereInput = {
    OR: selectedRows.map((row) => ({
      openingEco: row.openingEco,
      openingName: row.openingName,
      userColor: row.userColor,
    })),
  };
  const boundedWhere = andWhere(where, selectedWhere);

  const [
    resultRows,
    analysedRows,
    positiveRows,
    troubleRows,
    earlyMistakeRows,
    accuracyRows,
  ] = await Promise.all([
    prisma.importedGame.groupBy({
      by: ['openingEco', 'openingName', 'userColor', 'resultForUser'],
      where: boundedWhere,
      _count: { _all: true },
    }),
    groupedCount(andWhere(boundedWhere, { latestAnalysisCompletedAt: { not: null } })),
    groupedCount(andWhere(boundedWhere, {
      tagCodes: { hasSome: [GAME_TAG.OPENING_SUCCESS, GAME_TAG.OPENING_ADVANTAGE] },
    })),
    groupedCount(andWhere(boundedWhere, {
      tagCodes: { hasSome: [GAME_TAG.OPENING_DISASTER, GAME_TAG.OPENING_TROUBLE] },
    })),
    groupedCount(andWhere(boundedWhere, {
      tagCodes: { hasSome: [GAME_TAG.EARLY_BLUNDER, GAME_TAG.EARLY_MISTAKE] },
    })),
    prisma.importedGame.groupBy({
      by: ['openingEco', 'openingName', 'userColor'],
      where: andWhere(boundedWhere, {
        OR: [
          { userColor: 'WHITE', latestWhiteAccuracy: { not: null } },
          { userColor: 'BLACK', latestBlackAccuracy: { not: null } },
        ],
      }),
      _avg: { latestWhiteAccuracy: true, latestBlackAccuracy: true },
      _count: { latestWhiteAccuracy: true, latestBlackAccuracy: true },
    }),
  ]);

  const groups = new Map<string, PlayerChessProfileOpeningGroupRow>();
  for (const row of selectedRows) {
    if (!isProfileUserColor(row.userColor)) continue;
    groups.set(openingKey(row.openingEco, row.openingName, row.userColor), {
      openingEco: row.openingEco,
      openingName: row.openingName,
      userColor: row.userColor,
      games: row._count._all,
      analysedGames: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      openingPositiveGames: 0,
      openingTroubleGames: 0,
      earlyMistakeGames: 0,
      accuracyGames: 0,
      averageAccuracy: null,
    });
  }

  for (const row of resultRows) {
    const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
    if (!group) continue;
    if (row.resultForUser === 'WIN') group.wins += row._count._all;
    if (row.resultForUser === 'DRAW') group.draws += row._count._all;
    if (row.resultForUser === 'LOSS') group.losses += row._count._all;
  }
  for (const row of analysedRows) {
    const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
    if (group) group.analysedGames = row._count._all;
  }
  for (const row of positiveRows) {
    const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
    if (group) group.openingPositiveGames = row._count._all;
  }
  for (const row of troubleRows) {
    const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
    if (group) group.openingTroubleGames = row._count._all;
  }
  for (const row of earlyMistakeRows) {
    const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
    if (group) group.earlyMistakeGames = row._count._all;
  }
  for (const row of accuracyRows) {
    const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
    if (!group || !isProfileUserColor(row.userColor)) continue;
    group.averageAccuracy = row.userColor === 'WHITE'
      ? row._avg.latestWhiteAccuracy
      : row._avg.latestBlackAccuracy;
    group.accuracyGames = row.userColor === 'WHITE'
      ? row._count.latestWhiteAccuracy
      : row._count.latestBlackAccuracy;
  }

  return {
    rows: selectedRows.flatMap((row) => {
      const group = groups.get(openingKey(row.openingEco, row.openingName, row.userColor));
      return group ? [group] : [];
    }),
    truncated,
  };
}

async function listSupportingGames(
  where: Prisma.ImportedGameWhereInput,
  limit: number,
): Promise<PlayerChessProfileSupportingGameRow[]> {
  const rows = await prisma.importedGame.findMany({
    where,
    orderBy: [{ endedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
    take: limit,
    select: {
      id: true,
      provider: true,
      providerUrl: true,
      endedAt: true,
      speedCategory: true,
      userColor: true,
      resultForUser: true,
      openingEco: true,
      openingName: true,
      whiteRating: true,
      blackRating: true,
      latestAnalysisStatus: true,
      latestWhiteAccuracy: true,
      latestBlackAccuracy: true,
    },
  });

  return rows.flatMap((row) => {
    if (!isProfileUserColor(row.userColor)) return [];
    return [{
      id: row.id,
      provider: row.provider,
      providerUrl: row.providerUrl,
      endedAt: row.endedAt,
      speedCategory: row.speedCategory,
      userColor: row.userColor,
      resultForUser: row.resultForUser,
      openingEco: row.openingEco,
      openingName: row.openingName,
      userRating: row.userColor === 'WHITE' ? row.whiteRating : row.blackRating,
      opponentRating: row.userColor === 'WHITE' ? row.blackRating : row.whiteRating,
      analysisStatus: row.latestAnalysisStatus,
      accuracy: row.userColor === 'WHITE' ? row.latestWhiteAccuracy : row.latestBlackAccuracy,
    }];
  });
}

export const PlayerChessProfileRepository = {
  async load(input: PlayerChessProfileRepositoryInput): Promise<PlayerChessProfileRepositoryResult> {
    const where = standardVariantWhere(buildImportedGameWhere(input.userId, input.query));
    const [aggregate, openingGroups, supportingGames] = await Promise.all([
      summarizeAggregate(where),
      summarizeOpeningGroups(where),
      listSupportingGames(where, input.supportingGamesLimit),
    ]);

    return {
      aggregate,
      openingGroups: openingGroups.rows,
      openingGroupsTruncated: openingGroups.truncated,
      supportingGames,
    };
  },
};
