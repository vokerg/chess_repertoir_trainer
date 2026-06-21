import { LibraryLine, LibraryLineStatus } from '../data-access/library.models';

export function lineStatus(line: LibraryLine): LibraryLineStatus {
  return line.trainingStats.status ?? statusFromPassRate(line.trainingStats.totalAttempts, line.trainingStats.passRate);
}

export function failureRate(line: LibraryLine): number {
  return line.trainingStats.totalAttempts ? line.trainingStats.failedCount / line.trainingStats.totalAttempts : 0;
}

export function statusLabel(status: LibraryLineStatus): string {
  return status === 'NEW' ? 'New' : status.charAt(0) + status.slice(1).toLowerCase();
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

export function masteryLabel(passRate: number | null | undefined): string {
  return passRate == null ? 'No attempts' : `${Math.round(passRate * 100)}%`;
}

export function coverageLabel(trained: number, active: number): string {
  return active > 0 ? `${trained}/${active}` : '0/0';
}

function statusFromPassRate(recentAttempts: number, passRate: number): LibraryLineStatus {
  if (recentAttempts === 0) return 'NEW';
  if (passRate < 0.4) return 'WEAK';
  if (passRate < 0.7) return 'REVIEW';
  if (passRate < 0.9) return 'STABLE';
  return 'STRONG';
}
