import { CurrentUserService } from '../../services/currentUserService';
import { rowMatchesImportedGamePostFilters } from './imported-game-analysis.helpers';
import {
  findImportedGameById,
  findImportedGames,
  getImportedGameFacets,
  getImportedGamePgn,
  ImportedGameCursor,
  ImportedGameListRow,
} from './imported-games.repository.prisma';
import { ImportedGameSearchQuery } from './imported-games.schemas';

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

export const ImportedGameQueryService = {
  searchPage: async (query: ImportedGameSearchQuery) => {
    await CurrentUserService.getOrCreate();
    const page = await searchRows(query);
    return {
      ...page,
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
