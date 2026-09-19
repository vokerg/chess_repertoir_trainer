import { MonthlyGamesRow } from '../data-access/monthly-games.models';

export function monthLabel(row: MonthlyGamesRow): string {
  return `${row.year}-${String(row.month).padStart(2, '0')}`;
}

export function wdlLabel(row: Pick<MonthlyGamesRow, 'wins' | 'draws' | 'losses'>): string {
  return `${row.wins}-${row.draws}-${row.losses}`;
}

export function percentLabel(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(1)}%`;
}

export function ratingLabel(value: number | null): string {
  return value === null ? '-' : Math.round(value).toString();
}
