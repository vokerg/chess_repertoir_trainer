import { CurrentUserService } from '../../services/currentUserService';
import { ImportedGameSearchQuery } from './imported-games.schemas';
import {
  findImportedGameById,
  findImportedGames,
  getImportedGameFacets,
  getImportedGamePgn,
  ImportedGameCursor,
  ImportedGameDetailRow,
  ImportedGameListRow,
} from './imported-games.repository.prisma';

export type ImportedGameAnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

function encodeCursor(row: Pick<ImportedGameListRow, 'endedAt' | 'id'>) {
  const payload: ImportedGameCursor = {
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor?: string): ImportedGameCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.id !== 'number') return null;
    return {
      endedAt: typeof parsed.endedAt === 'string' ? parsed.endedAt : null,
      id: parsed.id,
    };
  } catch {
    throw new Error('Invalid imported-games cursor');
  }
}

function latestRun(row: ImportedGameListRow | ImportedGameDetailRow) {
  return row.analysisRuns[0] ?? null;
}

function deriveAnalysisStatus(row: ImportedGameListRow | ImportedGameDetailRow): ImportedGameAnalysisStatus {
  const run = latestRun(row);
  if (!run) return 'NOT_ANALYZED';
  if (run.status === 'RUNNING') return 'RUNNING';
  if (run.status === 'COMPLETED') return 'COMPLETED';
  return 'FAILED';
}

function userAccuracy(row: ImportedGameListRow | ImportedGameDetailRow) {
  const run = latestRun(row);
  if (!run) return null;
  if (row.userColor === 'WHITE') return run.whiteAccuracy;
  if (row.userColor === 'BLACK') return run.blackAccuracy;
  return null;
}

function criticalMoveCount(summary: unknown) {
  if (!summary || typeof summary !== 'object') return null;
  const critical = (summary as any).criticalPlyNumbers;
  return Array.isArray(critical) ? critical.length : null;
}

function toListItem(row: ImportedGameListRow | ImportedGameDetailRow) {
  const run = latestRun(row);
  return {
    id: row.id,
    accountId: row.accountId,
    provider: row.provider,
    providerGameId: row.providerGameId,
    providerUrl: row.providerUrl,
    endedAt: row.endedAt,
    startedAt: row.startedAt,
    speedCategory: row.speedCategory,
    rated: row.rated,
    variant: row.variant,
    timeControl: {
      raw: row.timeControlRaw,
      initial: row.timeControlInitial,
      increment: row.timeControlIncrement,
    },
    white: {
      username: row.whiteUsername,
      rating: row.whiteRating,
    },
    black: {
      username: row.blackUsername,
      rating: row.blackRating,
    },
    userColor: row.userColor,
    opponentUsername: row.opponentUsername,
    result: row.result,
    resultForUser: row.resultForUser,
    status: row.status,
    opening: {
      eco: row.openingEco,
      name: row.openingName,
    },
    analysis: {
      status: deriveAnalysisStatus(row),
      runId: run?.id ?? null,
      depth: run?.depth ?? null,
      completedAt: run?.completedAt ?? null,
      createdAt: run?.createdAt ?? null,
      whiteAccuracy: run?.whiteAccuracy ?? null,
      blackAccuracy: run?.blackAccuracy ?? null,
      userAccuracy: userAccuracy(row),
      summary: run?.summary ?? null,
      criticalMoveCount: criticalMoveCount(run?.summary),
    },
  };
}

function toDetail(row: ImportedGameDetailRow) {
  return {
    ...toListItem(row),
    pgn: row.pgn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function countFacetRows<T extends Record<string, any>>(rows: T[], valueKey: keyof T) {
  return rows
    .filter((row) => row[valueKey] !== null && row[valueKey] !== undefined)
    .map((row) => ({ value: row[valueKey], count: row._count }));
}

export const ImportedGamesService = {
  search: async (query: ImportedGameSearchQuery) => {
    await CurrentUserService.getOrCreate();
    const cursor = decodeCursor(query.cursor);
    const rows = await findImportedGames(query, cursor);
    const visibleRows = rows.slice(0, query.limit);
    const hasMore = rows.length > query.limit;
    const nextCursor = hasMore && visibleRows.length ? encodeCursor(visibleRows[visibleRows.length - 1]) : null;

    return {
      items: visibleRows.map(toListItem),
      pageInfo: {
        nextCursor,
        hasMore,
      },
      appliedFilters: query,
    };
  },

  get: async (id: number) => {
    await CurrentUserService.getOrCreate();
    const row = await findImportedGameById(id);
    return row ? toDetail(row) : null;
  },

  getPgn: async (id: number) => {
    await CurrentUserService.getOrCreate();
    return getImportedGamePgn(id);
  },

  facets: async () => {
    await CurrentUserService.getOrCreate();
    const facets = await getImportedGameFacets();
    return {
      accounts: facets.accounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        username: account.username,
        displayName: account.displayName,
        gameCount: account._count.importedGames,
      })),
      providers: countFacetRows(facets.providers, 'provider'),
      speeds: countFacetRows(facets.speeds, 'speedCategory'),
      variants: countFacetRows(facets.variants, 'variant'),
      results: countFacetRows(facets.results, 'resultForUser'),
      colors: countFacetRows(facets.colors, 'userColor'),
      openings: facets.openings.map((opening) => ({
        eco: opening.openingEco,
        name: opening.openingName,
        count: opening._count,
      })),
      analysisStatuses: [
        { value: 'ANALYZED', count: facets.totalAnalyzed },
        { value: 'NOT_ANALYZED', count: Math.max(0, facets.totalGames - facets.totalAnalyzed) },
      ],
    };
  },
};
