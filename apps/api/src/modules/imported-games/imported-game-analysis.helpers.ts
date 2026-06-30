import { ImportedGameDetailRow, ImportedGameListRow } from './imported-games.repository.prisma';

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

