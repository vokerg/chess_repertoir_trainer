import type { OpeningExplorerPlayer } from '@chess-trainer/contracts/opening-explorer';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function gameResultLabel(winner: 'WHITE' | 'BLACK' | null): string {
  if (winner === 'WHITE') return '1–0';
  if (winner === 'BLACK') return '0–1';
  return '½–½';
}

export function gameDateLabel(year: number, month: string | null): string {
  if (!month) return String(year);

  const match = month.match(/^(?:\d{4}-)?(\d{1,2})$/);
  const monthNumber = match ? Number(match[1]) : 0;
  if (monthNumber >= 1 && monthNumber <= 12) {
    return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
  }

  return month.includes(String(year)) ? month : `${month} ${year}`;
}

export function playerLabel(player: OpeningExplorerPlayer): string {
  return player.rating === null ? player.name : `${player.name} · ${player.rating}`;
}
