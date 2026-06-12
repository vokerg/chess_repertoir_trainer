import { ImportedGameSearchQuery, ImportedGameSummaryQuery } from './imported-games.schemas';
import { ImportedGameDetailRow, ImportedGameListRow } from './imported-games.repository.prisma';

type ImportedGameFilterQuery = ImportedGameSearchQuery | ImportedGameSummaryQuery;

export type ImportedGameAnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ImportedGamePlyIndexStatus = 'NOT_INDEXED' | 'INDEXED' | 'FAILED';

export function latestRun(row: ImportedGameListRow | ImportedGameDetailRow) {
  return row.analysisRuns[0] ?? null;
}

export function deriveAnalysisStatus(row: ImportedGameListRow | ImportedGameDetailRow): ImportedGameAnalysisStatus {
  const run = latestRun(row);
  if (!run) return 'NOT_ANALYZED';
  if (run.status === 'RUNNING') return 'RUNNING';
  if (run.status === 'COMPLETED') return 'COMPLETED';
  return 'FAILED';
}

export function derivePlyIndexStatus(row: ImportedGameListRow | ImportedGameDetailRow): ImportedGamePlyIndexStatus {
  if (row.plyIndexedAt) return 'INDEXED';
  if (row.plyIndexError) return 'FAILED';
  return 'NOT_INDEXED';
}

export function userAccuracy(row: ImportedGameListRow | ImportedGameDetailRow) {
  const run = latestRun(row);
  if (!run) return null;
  if (row.userColor === 'WHITE') return run.whiteAccuracy;
  if (row.userColor === 'BLACK') return run.blackAccuracy;
  return null;
}

export function criticalMoveCount(summary: unknown) {
  if (!summary || typeof summary !== 'object') return null;
  const critical = (summary as any).criticalPlyNumbers;
  return Array.isArray(critical) ? critical.length : null;
}

export function classificationCount(summary: unknown, classification: string) {
  if (!summary || typeof summary !== 'object') return 0;
  const white = (summary as any).white;
  const black = (summary as any).black;
  const whiteCount = white && typeof white === 'object' && typeof white[classification] === 'number' ? white[classification] : 0;
  const blackCount = black && typeof black === 'object' && typeof black[classification] === 'number' ? black[classification] : 0;
  return whiteCount + blackCount;
}

export function rowMatchesAnalysisFilters(row: ImportedGameListRow, query: ImportedGameFilterQuery) {
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

export function rowMatchesPlyIndexFilters(row: ImportedGameListRow, query: ImportedGameFilterQuery) {
  if (query.plyIndexStatus?.length && !query.plyIndexStatus.includes(derivePlyIndexStatus(row))) {
    return false;
  }

  return true;
}

export function rowMatchesImportedGamePostFilters(row: ImportedGameListRow, query: ImportedGameFilterQuery) {
  return rowMatchesAnalysisFilters(row, query) && rowMatchesPlyIndexFilters(row, query);
}
