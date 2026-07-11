import { moveClassificationLabel, normalizeStoredEngineLines } from 'chess-domain';
import type {
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameListItem,
  ImportedGameProvider,
  ImportedGameSearchResponse,
  ImportedGameTagDefinitionsResponse,
} from '@chess-trainer/contracts/imported-games';
import { firstUciMove } from '../analysis/position-analysis-normalization';
import {
  criticalMoveCount,
  deriveAnalysisStatus,
  derivePlyIndexStatus,
  ImportedGameAnalysisStatus,
  latestRun,
  userAccuracy,
} from './imported-game-analysis.helpers';
import { GameTaggingService } from './game-tagging.service';
import { ImportedGameQueryService } from './imported-game-query.service';
import {
  ImportedGameDetailRow,
  ImportedGameListRow,
} from './imported-games.repository.prisma';
import { ImportedGameSearchQuery } from './imported-games.schemas';

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export class PersistedImportedGameAnalysisError extends Error {
  constructor() {
    super('Stored imported-game analysis lines are not an array');
    this.name = 'PersistedImportedGameAnalysisError';
  }
}

function toPlyItem(ply: ImportedGameDetailRow['plies'][number]) {
  const analysis = ply.position.analysis;
  if (analysis?.lines !== null && analysis?.lines !== undefined && !Array.isArray(analysis.lines)) {
    throw new PersistedImportedGameAnalysisError();
  }
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
        bestMoveUci: firstUciMove(analysis.bestMoveUci) ?? null,
        bestScoreCpWhite: analysis.bestScoreCpWhite ?? null,
        bestMateWhite: analysis.bestMateWhite ?? null,
        lines: normalizeStoredEngineLines(Array.isArray(analysis.lines) ? analysis.lines : []),
      }
      : null,
  };
}

function resolveTags(tagCodes: number[] | null | undefined, tagNamesByCode: Map<number, string>) {
  return (tagCodes ?? [])
    .map((code) => {
      const name = tagNamesByCode.get(code);
      return name ? { code, name } : null;
    })
    .filter((tag): tag is { code: number; name: string } => tag !== null);
}

function toListItem(
  row: ImportedGameListRow | ImportedGameDetailRow,
  tagNamesByCode: Map<number, string>,
): ImportedGameListItem {
  const run = latestRun(row);
  return {
    id: row.id,
    accountId: row.accountId,
    provider: row.provider as ImportedGameProvider,
    providerGameId: row.providerGameId,
    providerUrl: row.providerUrl,
    endedAt: toIso(row.endedAt),
    startedAt: toIso(row.startedAt),
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
    userColor: row.userColor as ImportedGameListItem['userColor'],
    opponentUsername: row.opponentUsername,
    result: row.result,
    resultForUser: row.resultForUser as ImportedGameListItem['resultForUser'],
    status: row.status,
    opening: {
      eco: row.openingEco,
      name: row.openingName,
    },
    tagCodes: row.tagCodes ?? [],
    tags: resolveTags(row.tagCodes, tagNamesByCode),
    plyIndex: {
      status: derivePlyIndexStatus(row),
      indexedAt: toIso(row.plyIndexedAt),
      error: row.plyIndexError ?? null,
    },
    analysis: {
      status: deriveAnalysisStatus(row),
      runId: run?.id ?? null,
      depth: null,
      completedAt: toIso(run?.completedAt),
      createdAt: toIso(run?.createdAt),
      whiteAccuracy: run?.whiteAccuracy ?? null,
      blackAccuracy: run?.blackAccuracy ?? null,
      userAccuracy: userAccuracy(row),
      summary: run?.summary ?? null,
      criticalMoveCount: criticalMoveCount(run?.summary),
    },
  };
}

function toDetail(row: ImportedGameDetailRow, tagNamesByCode: Map<number, string>): ImportedGameDetail {
  return {
    ...toListItem(row, tagNamesByCode),
    pgn: row.pgn,
    plies: row.plies.map(toPlyItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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

function analysisStatusFacetRows(totalGames: number, rows: Array<{ importedGameId: number; status: string }>) {
  const counts: Record<ImportedGameAnalysisStatus, number> = {
    NOT_ANALYZED: totalGames,
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
  const seenGameIds = new Set<number>();

  for (const row of rows) {
    if (seenGameIds.has(row.importedGameId)) continue;
    seenGameIds.add(row.importedGameId);
    counts.NOT_ANALYZED -= 1;

    if (row.status === 'RUNNING') counts.RUNNING += 1;
    else if (row.status === 'COMPLETED') counts.COMPLETED += 1;
    else if (row.status) counts.FAILED += 1;
  }

  return Object.entries(counts).map(([value, count]) => ({ value, count }));
}

export const ImportedGamesService = {
  search: async (userId: number, query: ImportedGameSearchQuery): Promise<ImportedGameSearchResponse> => {
    const [page, definitionsResponse] = await Promise.all([
      ImportedGameQueryService.searchPage(userId, query),
      GameTaggingService.definitions(),
    ]);
    const tagNamesByCode = new Map(definitionsResponse.items.map((item) => [item.code, item.name]));

    return {
      items: page.rows.map((row) => toListItem(row, tagNamesByCode)),
      pageInfo: page.pageInfo,
      appliedFilters: {
        ...page.appliedCriteria,
        from: page.appliedCriteria.from?.toISOString(),
        to: page.appliedCriteria.to?.toISOString(),
      },
    };
  },

  get: async (userId: number, id: number) => {
    const [row, definitionsResponse] = await Promise.all([
      ImportedGameQueryService.getDetail(userId, id),
      GameTaggingService.definitions(),
    ]);
    if (!row) return null;
    const tagNamesByCode = new Map(definitionsResponse.items.map((item) => [item.code, item.name]));
    return toDetail(row, tagNamesByCode);
  },

  getPgn: async (userId: number, id: number) => ImportedGameQueryService.getPgn(userId, id),

  tagDefinitions: async (): Promise<ImportedGameTagDefinitionsResponse> => GameTaggingService.definitions(),

  refreshTags: async (userId: number, id: number) => GameTaggingService.refreshOne(userId, id),

  facets: async (userId: number): Promise<ImportedGameFacetsResponse> => {
    const [facets, definitionsResponse] = await Promise.all([
      ImportedGameQueryService.getFacets(userId),
      GameTaggingService.definitions(),
    ]);
    return {
      accounts: facets.accounts.map((account) => ({
        id: account.id,
        provider: account.provider as ImportedGameProvider,
        username: account.username,
        displayName: account.displayName,
        gameCount: account._count.importedGames,
      })),
      providers: countFacetRows(facets.providers, 'provider') as ImportedGameFacetsResponse['providers'],
      speeds: countFacetRows(facets.speeds, 'speedCategory') as ImportedGameFacetsResponse['speeds'],
      variants: countFacetRows(facets.variants, 'variant') as ImportedGameFacetsResponse['variants'],
      results: countFacetRows(facets.results, 'resultForUser') as ImportedGameFacetsResponse['results'],
      colors: countFacetRows(facets.colors, 'userColor') as ImportedGameFacetsResponse['colors'],
      openings: facets.openings.flatMap((opening) => opening.openingEco ? [{
        eco: opening.openingEco,
        name: opening.openingName,
        count: groupCount(opening, 'openingEco'),
      }] : []),
      analysisStatuses: analysisStatusFacetRows(
        facets.totalGames,
        facets.analysisRunRows,
      ) as ImportedGameFacetsResponse['analysisStatuses'],
      tags: definitionsResponse.items.map((tag) => ({
        value: tag.code,
        name: tag.name,
      })),
    };
  },
};
