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

export type ImportedGameAnalysisStatus = 'NOT_ANALYZED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED';
export type ImportedGamePlyIndexStatus = 'NOT_INDEXED' | 'INDEXED' | 'FAILED';

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
    if (!parsed || typeof parsed.id !== 'number') throw new Error('Invalid imported-games cursor');
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
  if (run.status === 'QUEUED') return 'QUEUED';
  if (run.status === 'RUNNING') return 'RUNNING';
  if (run.status === 'COMPLETED') return 'COMPLETED';
  if (run.status === 'INTERRUPTED') return 'INTERRUPTED';
  return 'FAILED';
}

function derivePlyIndexStatus(row: ImportedGameListRow | ImportedGameDetailRow): ImportedGamePlyIndexStatus {
  if (row.plyIndexedAt) return 'INDEXED';
  if (row.plyIndexError) return 'FAILED';
  return 'NOT_INDEXED';
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

function classificationCount(summary: unknown, classification: string) {
  if (!summary || typeof summary !== 'object') return 0;
  const white = (summary as any).white;
  const black = (summary as any).black;
  const whiteCount = white && typeof white === 'object' && typeof white[classification] === 'number' ? white[classification] : 0;
  const blackCount = black && typeof black === 'object' && typeof black[classification] === 'number' ? black[classification] : 0;
  return whiteCount + blackCount;
}

function rowMatchesAnalysisFilters(row: ImportedGameListRow, query: ImportedGameSearchQuery) {
  if (query.analysisStatus?.length && !query.analysisStatus.includes(deriveAnalysisStatus(row))) {
    return false;
  }

  const accuracy = userAccuracy(row);
  if (query.minAccuracy !== undefined && (accuracy === null || accuracy < query.minAccuracy)) {
    return false;
  }
  if (query.maxAccuracy !== undefined && (accuracy === null || accuracy > query.maxAccuracy)) {
    return false;
  }

  if (query.classification?.length) {
    const run = latestRun(row);
    if (!run) return false;
    return query.classification.some((classification) => classificationCount(run.summary, classification) > 0);
  }

  return true;
}

function toCursor(row: Pick<ImportedGameListRow, 'endedAt' | 'id'>): ImportedGameCursor {
  return {
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    id: row.id,
  };
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
    plyIndex: {
      status: derivePlyIndexStatus(row),
      indexedAt: row.plyIndexedAt ?? null,
      error: row.plyIndexError ?? null,
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

function groupCount(row: Record<string, any>, valueKey?: string | number | symbol) {
  const count = row['_count'];
  if (count && typeof count === 'object') {
    if (typeof count._all === 'number') return count._all;
    if (valueKey !== undefined && typeof count[valueKey] === 'number') return count[valueKey];
  }
  return typeof count === 'number' ? count : 0;
}

function countFacetRows<T extends Record<string, any>>(rows: T[], valueKey: keyof T) {
  return rows
    .filter((row) => row[valueKey] !== null && row[valueKey] !== undefined)
    .map((row) => ({ value: row[valueKey], count: groupCount(row, valueKey) }));
}

function analysisStatusFacetRows(rows: Array<{ analysisRuns: Array<{ status: string }> }>) {
  const counts: Record<ImportedGameAnalysisStatus, number> = {
    NOT_ANALYZED: 0,
    QUEUED: 0,
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
    INTERRUPTED: 0,
  };

  for (const row of rows) {
    const status = row.analysisRuns[0]?.status;
    if (!status) counts.NOT_ANALYZED += 1;
    else if (status === 'QUEUED') counts.QUEUED += 1;
    else if (status === 'RUNNING') counts.RUNNING += 1;
    else if (status === 'COMPLETED') counts.COMPLETED += 1;
    else if (status === 'INTERRUPTED') counts.INTERRUPTED += 1;
    else counts.FAILED += 1;
  }

  return Object.entries(counts).map(([value, count]) => ({ value, count }));
}

async function searchRows(query: ImportedGameSearchQuery) {
  let cursor = decodeCursor(query.cursor);
  const visibleRows: ImportedGameListRow[] = [];
  let lastScannedRow: ImportedGameListRow | null = null;

  for (let page = 0; page < 25; page += 1) {
    const rows = await findImportedGames(query, cursor);
    const candidates = rows.slice(0, query.limit);
    const batchHasMore = rows.length > query.limit;

    for (let index = 0; index < candidates.length; index += 1) {
      const row = candidates[index];
      lastScannedRow = row;
      if (!rowMatchesAnalysisFilters(row, query)) continue;
      visibleRows.push(row);
      if (visibleRows.length === query.limit) {
        return {
          rows: visibleRows,
          hasMore: batchHasMore || index < candidates.length - 1,
          nextCursor: toCursor(row),
        };
      }
    }

    if (!batchHasMore) {
      return { rows: visibleRows, hasMore: false, nextCursor: null };
    }

    const cursorSource = candidates[candidates.length - 1] ?? lastScannedRow;
    if (!cursorSource) return { rows: visibleRows, hasMore: false, nextCursor: null };
    cursor = toCursor(cursorSource);
  }

  return {
    rows: visibleRows,
    hasMore: true,
    nextCursor: lastScannedRow ? toCursor(lastScannedRow) : null,
  };
}

export const ImportedGamesService = {
  search: async (query: ImportedGameSearchQuery) => {
    await CurrentUserService.getOrCreate();
    const result = await searchRows(query);
    return {
      items: result.rows.map(toListItem),
      pageInfo: {
        hasMore: result.hasMore,
        nextCursor: result.hasMore && result.nextCursor ? encodeCursor(result.nextCursor) : null,
      },
      appliedFilters: query,
    };
  },

  getById: async (id: number) => {
    await CurrentUserService.getOrCreate();
    const row = await findImportedGameById(id);
    if (!row) throw new Error('Imported game not found');
    return toDetail(row);
  },

  getPgn: async (id: number) => {
    await CurrentUserService.getOrCreate();
    const row = await getImportedGamePgn(id);
    if (!row?.pgn) throw new Error('Imported game PGN not found');
    return row;
  },

  facets: async () => {
    await CurrentUserService.getOrCreate();
    return getImportedGameFacets();
  },
};
