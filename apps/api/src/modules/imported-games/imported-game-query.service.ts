import { CurrentUserService } from '../../services/currentUserService';
import { rowMatchesImportedGamePostFilters } from './imported-game-analysis.helpers';
import {
  findImportedGameById,
  findImportedGamesForSummary,
  findImportedGames,
  getImportedGameFacets,
  getImportedGamePgn,
  ImportedGameCursor,
  ImportedGameListRow,
} from './imported-games.repository.prisma';
import { ImportedGameSearchQuery, ImportedGameSummaryQuery } from './imported-games.schemas';

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

function toCursor(row: Pick<ImportedGameListRow, 'endedAt' | 'id'>): ImportedGameCursor {
  return {
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    id: row.id,
  };
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
      if (!rowMatchesImportedGamePostFilters(row, query)) continue;

      visibleRows.push(row);
      if (visibleRows.length === query.limit) {
        const hasMore = batchHasMore || index < candidates.length - 1;
        return {
          rows: visibleRows,
          pageInfo: {
            nextCursor: hasMore ? encodeCursor(row) : null,
            hasMore,
          },
        };
      }
    }

    if (!candidates.length || !batchHasMore) {
      return {
        rows: visibleRows,
        pageInfo: { nextCursor: null, hasMore: false },
      };
    }

    cursor = toCursor(candidates[candidates.length - 1]);
  }

  return {
    rows: visibleRows,
    pageInfo: {
      nextCursor: lastScannedRow ? encodeCursor(lastScannedRow) : null,
      hasMore: lastScannedRow !== null,
    },
  };
}

function scorePct(wins: number, draws: number, total: number) {
  if (!total) return null;
  return Math.round(((wins + draws * 0.5) / total) * 1000) / 10;
}

function increment(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function incrementOpening(map: Map<string, { openingEco: string; openingName: string | null; count: number }>, row: ImportedGameListRow) {
  if (!row.openingEco) return;
  const key = `${row.openingEco}\u0000${row.openingName ?? ''}`;
  const current = map.get(key);
  if (current) {
    current.count += 1;
    return;
  }
  map.set(key, { openingEco: row.openingEco, openingName: row.openingName, count: 1 });
}

function userRating(row: ImportedGameListRow) {
  if (row.userColor === 'WHITE') return row.whiteRating;
  if (row.userColor === 'BLACK') return row.blackRating;
  return null;
}

function opponentRating(row: ImportedGameListRow) {
  if (row.userColor === 'WHITE') return row.blackRating;
  if (row.userColor === 'BLACK') return row.whiteRating;
  return null;
}

function average(values: Array<number | null>) {
  const numericValues = values.filter((value): value is number => typeof value === 'number');
  if (!numericValues.length) return null;
  return Math.round((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length) * 10) / 10;
}

function mapCounts(map: Map<string, number>, valueKey: string) {
  return Array.from(map.entries())
    .map(([value, count]) => ({ [valueKey]: value, count }))
    .sort((left, right) => right.count - left.count || String(left[valueKey]).localeCompare(String(right[valueKey])));
}

function summarizeRows(rows: ImportedGameListRow[]) {
  const byProvider = new Map<string, number>();
  const bySpeedCategory = new Map<string, number>();
  const byUserColor = new Map<string, number>();
  const byOpeningEco = new Map<string, { openingEco: string; openingName: string | null; count: number }>();

  let wins = 0;
  let draws = 0;
  let losses = 0;
  const userRatings: Array<number | null> = [];
  const opponentRatings: Array<number | null> = [];

  for (const row of rows) {
    if (row.resultForUser === 'WIN') wins += 1;
    else if (row.resultForUser === 'DRAW') draws += 1;
    else if (row.resultForUser === 'LOSS') losses += 1;

    increment(byProvider, row.provider);
    increment(bySpeedCategory, row.speedCategory);
    increment(byUserColor, row.userColor);
    incrementOpening(byOpeningEco, row);
    userRatings.push(userRating(row));
    opponentRatings.push(opponentRating(row));
  }

  return {
    total: rows.length,
    wins,
    draws,
    losses,
    scorePct: scorePct(wins, draws, rows.length),
    byProvider: mapCounts(byProvider, 'provider'),
    bySpeedCategory: mapCounts(bySpeedCategory, 'speedCategory'),
    byUserColor: mapCounts(byUserColor, 'userColor'),
    byOpeningEco: Array.from(byOpeningEco.values()).sort(
      (left, right) => right.count - left.count || left.openingEco.localeCompare(right.openingEco),
    ),
    averageUserRating: average(userRatings),
    averageOpponentRating: average(opponentRatings),
  };
}

export const ImportedGameQueryService = {
  searchPage: async (query: ImportedGameSearchQuery) => {
    await CurrentUserService.getOrCreate();
    const page = await searchRows(query);
    return {
      ...page,
      appliedCriteria: query,
    };
  },

  summarize: async (query: ImportedGameSummaryQuery) => {
    const rows = await findImportedGamesForSummary(query);
    return {
      summary: summarizeRows(rows.filter((row) => rowMatchesImportedGamePostFilters(row, query))),
      appliedCriteria: query,
    };
  },

  getDetail: async (id: number) => {
    await CurrentUserService.getOrCreate();
    return findImportedGameById(id);
  },

  getPgn: async (id: number) => {
    await CurrentUserService.getOrCreate();
    return getImportedGamePgn(id);
  },

  getFacets: async () => {
    await CurrentUserService.getOrCreate();
    return getImportedGameFacets();
  },
};
