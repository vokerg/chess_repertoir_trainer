import {
  findImportedGameById,
  findImportedGames,
  getImportedGameFacets,
  getImportedGamePgn,
  ImportedGameCursor,
  ImportedGameSearchRow,
  ImportedGameSummaryAggregateRows,
  summarizeImportedGames,
} from './imported-games.repository.prisma';
import { ImportedGameSearchQuery, ImportedGameSummaryQuery } from './imported-games.schemas';

function encodeCursor(row: Pick<ImportedGameSearchRow, 'endedAt' | 'id'>) {
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

async function searchRows(userId: number, query: ImportedGameSearchQuery) {
  const cursor = decodeCursor(query.cursor);
  const rows = await findImportedGames(userId, query, cursor);
  const visibleRows = rows.slice(0, query.limit);
  const hasMore = rows.length > query.limit;
  const lastVisibleRow = visibleRows[visibleRows.length - 1] ?? null;

  return {
    rows: visibleRows,
    pageInfo: {
      nextCursor: hasMore && lastVisibleRow ? encodeCursor(lastVisibleRow) : null,
      hasMore,
    },
  };
}

function scorePct(wins: number, draws: number, total: number) {
  if (!total) return null;
  return Math.round(((wins + draws * 0.5) / total) * 1000) / 10;
}

function mapCounts<T extends string>(
  rows: Array<Record<T, string | null> & { _count: { _all: number } }>,
  valueKey: T,
) {
  return rows
    .filter((row): row is Record<T, string> & { _count: { _all: number } } => Boolean(row[valueKey]))
    .map((row) => ({ [valueKey]: row[valueKey], count: row._count._all }))
    .sort((left, right) => right.count - left.count || String(left[valueKey]).localeCompare(String(right[valueKey])));
}

function roundedWeightedAverage(parts: Array<{ average: number | null; count: number }>) {
  const totals = parts.reduce(
    (result, part) => {
      if (part.average === null || part.count === 0) return result;
      return {
        sum: result.sum + part.average * part.count,
        count: result.count + part.count,
      };
    },
    { sum: 0, count: 0 },
  );
  return totals.count ? Math.round((totals.sum / totals.count) * 10) / 10 : null;
}

export function summarizeAggregateRows(rows: ImportedGameSummaryAggregateRows) {
  const resultCounts = new Map(rows.results.map((row) => [row.resultForUser, row._count._all]));
  const wins = resultCounts.get('WIN') ?? 0;
  const draws = resultCounts.get('DRAW') ?? 0;
  const losses = resultCounts.get('LOSS') ?? 0;
  const ratingParts = rows.ratings.flatMap((row) => {
    if (row.userColor === 'WHITE') {
      return [{
        user: { average: row._avg.whiteRating, count: row._count.whiteRating },
        opponent: { average: row._avg.blackRating, count: row._count.blackRating },
      }];
    }
    if (row.userColor === 'BLACK') {
      return [{
        user: { average: row._avg.blackRating, count: row._count.blackRating },
        opponent: { average: row._avg.whiteRating, count: row._count.whiteRating },
      }];
    }
    return [];
  });

  return {
    total: rows.total,
    wins,
    draws,
    losses,
    scorePct: scorePct(wins, draws, rows.total),
    byProvider: mapCounts(rows.providers, 'provider'),
    bySpeedCategory: mapCounts(rows.speedCategories, 'speedCategory'),
    byUserColor: mapCounts(rows.userColors, 'userColor'),
    byOpeningEco: rows.openings
      .filter((row): row is typeof row & { openingEco: string } => Boolean(row.openingEco))
      .map((row) => ({ openingEco: row.openingEco, openingName: row.openingName, count: row._count._all }))
      .sort(
        (left, right) => right.count - left.count
          || left.openingEco.localeCompare(right.openingEco)
          || (left.openingName ?? '').localeCompare(right.openingName ?? ''),
    ),
    averageUserRating: roundedWeightedAverage(ratingParts.map((part) => part.user)),
    averageOpponentRating: roundedWeightedAverage(ratingParts.map((part) => part.opponent)),
  };
}

export const ImportedGameQueryService = {
  searchPage: async (userId: number, query: ImportedGameSearchQuery) => {
    const page = await searchRows(userId, query);
    return {
      ...page,
      appliedCriteria: query,
    };
  },

  summarize: async (userId: number, query: ImportedGameSummaryQuery) => {
    const aggregateRows = await summarizeImportedGames(userId, query);
    return {
      summary: summarizeAggregateRows(aggregateRows),
      appliedCriteria: query,
    };
  },

  getDetail: async (userId: number, id: number) => {
    return findImportedGameById(userId, id);
  },

  getPgn: async (userId: number, id: number) => {
    return getImportedGamePgn(userId, id);
  },

  getFacets: async (userId: number) => {
    return getImportedGameFacets(userId);
  },
};
