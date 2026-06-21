import { LibraryLine, LibraryLineStatus } from '../data-access/library.models';

export function lineStatus(line: LibraryLine): LibraryLineStatus {
  const stats = line.trainingStats;
  if (stats.totalAttempts === 0) return 'NEW';
  if (stats.failedCount > stats.passedCount) return 'WEAK';
  if (stats.passedCount > 0 && stats.failedCount === 0) return 'CLEAN';
  return 'REVIEW';
}

export function failureRate(line: LibraryLine): number {
  return line.trainingStats.totalAttempts ? line.trainingStats.failedCount / line.trainingStats.totalAttempts : 0;
}

export function statusLabel(status: LibraryLineStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function statusClass(status: LibraryLineStatus): string {
  return status.toLowerCase();
}

export function sideLabel(side: 'WHITE' | 'BLACK'): string {
  return side === 'WHITE' ? 'White' : 'Black';
}

export function startingPositionLabel(line: LibraryLine): string {
  return line.startingFen === 'startpos' ? 'Start position' : 'Custom FEN';
}
