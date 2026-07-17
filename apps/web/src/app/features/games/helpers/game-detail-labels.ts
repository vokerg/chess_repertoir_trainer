import {
  ImportedGameDetail,
  ImportedGamePlayer,
  Provider,
  ResultForUser,
  UserColor,
} from '../data-access/games.models';

export function providerLabel(provider?: Provider | null): string {
  if (provider === 'CHESS_COM') return 'Chess.com';
  if (provider === 'LICHESS') return 'Lichess';
  return 'Provider';
}

export function playerLabel(player?: ImportedGamePlayer | null): string {
  if (!player) return 'Unknown';
  return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
}

export function resultLabel(result?: ResultForUser | null): string {
  if (result === 'WIN') return 'Win';
  if (result === 'DRAW') return 'Draw';
  if (result === 'LOSS') return 'Loss';
  return 'Unknown';
}

export function colorLabel(color?: UserColor | null): string {
  if (color === 'WHITE') return 'You had White';
  if (color === 'BLACK') return 'You had Black';
  return 'Colour unknown';
}

export function accuracyLabel(value?: number | null): string {
  return typeof value === 'number' ? `${Math.round(value)}%` : '-';
}

export function gameDateLabel(value?: string | null): string {
  if (!value) return 'Date unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function timeControlLabel(game: ImportedGameDetail): string {
  return formatTimeControl(game.timeControl.initial, game.timeControl.increment, game.timeControl.raw);
}

export function formatTimeControl(
  initial?: number | null,
  increment?: number | null,
  raw?: string | null,
): string {
  if (typeof initial === 'number' && typeof increment === 'number') {
    return `${formatInitialMinutes(initial)}+${increment}`;
  }

  const rawMatch = raw?.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (rawMatch) return `${formatInitialMinutes(Number(rawMatch[1]))}+${rawMatch[2]}`;
  return raw || 'Time control unknown';
}

function formatInitialMinutes(initialSeconds: number): string {
  if (initialSeconds < 60) return `${initialSeconds}s`;
  const minutes = initialSeconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
}
