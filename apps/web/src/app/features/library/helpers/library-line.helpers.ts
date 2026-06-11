import { LibraryLine, LibraryLineStatus } from '../data-access/library.models';

export function lineStatus(line: LibraryLine): LibraryLineStatus {
  if (line.totalAttempts === 0) return 'NEW';
  if (line.failedCount > line.passedCount) return 'WEAK';
  if (line.passedCount > 0 && line.failedCount === 0) return 'CLEAN';
  return 'REVIEW';
}

export function failureRate(line: LibraryLine): number {
  return line.totalAttempts ? line.failedCount / line.totalAttempts : 0;
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
