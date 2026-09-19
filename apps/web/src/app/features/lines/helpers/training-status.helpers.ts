import { LineTrainingStatusValue } from '../data-access/lines.models';

export function trainingStatusLabel(status: LineTrainingStatusValue): string {
  return status === 'NEW' ? 'New' : status.charAt(0) + status.slice(1).toLowerCase();
}

export function percentLabel(value: number | null | undefined): string {
  return value == null ? 'No attempts' : `${Math.round(value * 100)}%`;
}

export function coverageLabel(trained: number, active: number): string {
  return active > 0 ? `${trained}/${active}` : '0/0';
}
