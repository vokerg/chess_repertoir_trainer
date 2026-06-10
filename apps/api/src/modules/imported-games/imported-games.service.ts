import { moveClassificationLabel } from 'chess-domain';
import {
  criticalMoveCount,
  deriveAnalysisStatus,
  derivePlyIndexStatus,
  ImportedGameAnalysisStatus,
  latestRun,
  userAccuracy,
} from './imported-game-analysis.helpers';
import { ImportedGameQueryService } from './imported-game-query.service';
import {
  ImportedGameDetailRow,
  ImportedGameListRow,
} from './imported-games.repository.prisma';
import { ImportedGameSearchQuery } from './imported-games.schemas';

function toPlyItem(ply: ImportedGameDetailRow['plies'][number]) {
  const analysis = ply.position.analysis;
  return {
    plyNumber: ply.plyNumber,
    moveUci: ply.moveUci,
    normalizedFen: ply.position.normalizedFen,
    scoreLossCp: ply.scoreLossCp ?? null,
    classificationCode: ply.classificationCode ?? null,
    classification: moveClassificationLabel(ply.classificationCode),
    positionAnalysis: analysis
      ? {
        id: analysis.id,
        bestMoveUci: analysis.bestMoveUci ?? null,
        bestScoreCpWhite: analysis.bestScoreCpWhite ?? null,
        bestMateWhite: analysis.bestMateWhite ?? null,
        lines: Array.isArray(analysis.lines) ? analysis.lines : [],
      }
      : null,
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
      depth: null,
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
    plies: row.plies.map(toPlyItem),
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
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const row of rows) {
    const status = row.analysisRuns[0]?.status;
    if (!status) counts.NOT_ANALYZED += 1;
    else if (status === 'RUNNING') counts.RUNNING += 1;
    else if (status === 'COMPLETED') counts.COMPLETED += 1;
    else counts.FAILED += 1;
  }

  return Object.entries(counts).map(([value, count]) => ({ value, count }));
}

export const ImportedGamesService = {
  search: async (query: ImportedGameSearchQuery) => {
    const page = await ImportedGameQueryService.searchPage(query);

    return {
      items: page.rows.map(toListItem),
      pageInfo: page.pageInfo,
      appliedFilters: page.appliedCriteria,
    };
  },

  get: async (id: number) => {
    const row = await ImportedGameQueryService.getDetail(id);
    return row ? toDetail(row) : null;
  },

  getPgn: async (id: number) => ImportedGameQueryService.getPgn(id),

  facets: async () => {
    const facets = await ImportedGameQueryService.getFacets();
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
        count: groupCount(opening, 'openingEco'),
      })),
      analysisStatuses: analysisStatusFacetRows(facets.latestAnalysisRows),
    };
  },
};
