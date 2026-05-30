import { AnalysisStatus, PlyIndexStatus, ResultForUser, UserColor } from '@/api/dto';

export function resultForUserLabel(result?: ResultForUser | null): string {
  if (result === 'WIN') return 'Win';
  if (result === 'DRAW') return 'Draw';
  if (result === 'LOSS') return 'Loss';
  return 'Unknown';
}

export function colorLabel(color?: UserColor | null): string {
  if (color === 'WHITE') return 'White';
  if (color === 'BLACK') return 'Black';
  return 'Unknown';
}

export function analysisStatusLabel(status?: AnalysisStatus | null): string {
  return status ? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (value) => value.toUpperCase()) : 'Unknown';
}

export function plyIndexStatusLabel(status?: PlyIndexStatus | null): string {
  return status ? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (value) => value.toUpperCase()) : 'Unknown';
}
