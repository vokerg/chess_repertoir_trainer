import { moveClassificationLabel } from 'chess-domain';
import {
  criticalMoveCount,
  deriveAnalysisStatus,
  derivePlyIndexStatus,
  ImportedGameAnalysisStatus,
  latestRun,
  userAccuracy,
} from '../imported-games/imported-game-analysis.helpers';
import {
  getImportedGameFacets,
  ImportedGameDetailRow,
  ImportedGameListRow,
} from '../imported-games/imported-games.repository.prisma';

function isoDate(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

export function toMcpGameSummary(row: ImportedGameListRow | ImportedGameDetailRow) {
  const run = latestRun(row);
  return {
    id: row.id,
    provider: row.provider,
    providerGameId: row.providerGameId,
    providerUrl: row.providerUrl,
    endedAt: isoDate(row.endedAt),
    startedAt: isoDate(row.startedAt),
    rated: row.rated,
    variant: row.variant,
    speedCategory: row.speedCategory,
    timeControl: {
      raw: row.timeControlRaw,
      initial: row.timeControlInitial,
      increment: row.timeControlIncrement,
    },
    white: { username: row.whiteUsername, rating: row.whiteRating },
    black: { username: row.blackUsername, rating: row.blackRating },
    userColor: row.userColor,
    opponentUsername: row.opponentUsername,
    result: row.result,
    resultForUser: row.resultForUser,
    status: row.status,
    opening: { eco: row.openingEco, name: row.openingName },
    plyIndex: {
      status: derivePlyIndexStatus(row),
      indexedAt: isoDate(row.plyIndexedAt),
      error: row.plyIndexError,
    },
    analysis: {
      status: deriveAnalysisStatus(row),
      runId: run?.id ?? null,
      completedAt: isoDate(run?.completedAt),
      createdAt: isoDate(run?.createdAt),
      whiteAccuracy: run?.whiteAccuracy ?? null,
      blackAccuracy: run?.blackAccuracy ?? null,
      userAccuracy: userAccuracy(row),
      criticalMoveCount: criticalMoveCount(run?.summary),
    },
  };
}

export function toMcpPlyItem(ply: ImportedGameDetailRow['plies'][number]) {
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

export function toMcpGameDetail(row: ImportedGameDetailRow, options: { includePlies?: boolean } = {}) {
  return {
    ...toMcpGameSummary(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    pgnAvailable: Boolean(row.pgn),
    ...(options.includePlies === false ? {} : { plies: row.plies.map(toMcpPlyItem) }),
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
    .map((row) => ({ value: row[valueKey] as string, count: groupCount(row, valueKey) }));
}

export function toMcpFacets(facets: Awaited<ReturnType<typeof getImportedGameFacets>>) {
  const analysisCounts: Record<ImportedGameAnalysisStatus, number> = {
    NOT_ANALYZED: 0,
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const row of facets.latestAnalysisRows) {
    const status = row.analysisRuns[0]?.status;
    if (!status) analysisCounts.NOT_ANALYZED += 1;
    else if (status === 'RUNNING') analysisCounts.RUNNING += 1;
    else if (status === 'COMPLETED') analysisCounts.COMPLETED += 1;
    else analysisCounts.FAILED += 1;
  }

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
    analysisStatuses: Object.entries(analysisCounts).map(([value, count]) => ({
      value: value as ImportedGameAnalysisStatus,
      count,
    })),
  };
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  return String(value);
}

export function toMcpError(message: string, code = 'INTERNAL_ERROR') {
  return {
    content: [{ type: 'text' as const, text: message }],
    structuredContent: { error: message, code },
    isError: true,
  };
}
