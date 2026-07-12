import {
  ImportedGameSearchItem,
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

export function providerClass(provider?: Provider | null): string {
  return provider === 'CHESS_COM' ? 'provider-chess-com' : 'provider-lichess';
}

export function profileUrl(provider?: Provider | null, username?: string | null): string | null {
  if (!provider || !username) return null;
  const encoded = encodeURIComponent(username);
  if (provider === 'LICHESS') return `https://lichess.org/@/${encoded}`;
  return `https://www.chess.com/member/${encoded}`;
}

export function resultLabel(result?: ResultForUser | null): string {
  if (result === 'WIN') return 'Win';
  if (result === 'DRAW') return 'Draw';
  if (result === 'LOSS') return 'Loss';
  return 'Unknown';
}

export function resultClass(result?: ResultForUser | null): string {
  if (result === 'WIN') return 'result-win';
  if (result === 'DRAW') return 'result-draw';
  if (result === 'LOSS') return 'result-loss';
  return 'result-unknown';
}

export function playerLabel(player?: ImportedGamePlayer | null): string {
  if (!player) return 'Unknown';
  return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
}

export function colorLabel(color?: UserColor | null): string {
  if (color === 'WHITE') return 'White';
  if (color === 'BLACK') return 'Black';
  return '—';
}

export function timeClassLabel(speed?: string | null): string {
  return speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Unknown';
}

export function gameDateLabel(game: ImportedGameSearchItem): string {
  if (!game.endedAt) return `#${game.id}`;
  const date = new Date(game.endedAt);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

export function displayTimeControl(game: ImportedGameSearchItem): string {
  const fromParts = formatTimeControl(game.timeControl?.initial, game.timeControl?.increment);
  if (fromParts) return fromParts;
  return timeControlFromRaw(game.timeControl?.raw) || '—';
}

export function accuracyLabel(value?: number | null): string {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}

function timeControlFromRaw(raw?: string | null): string {
  if (!raw) return '';
  const match = raw.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (!match) return raw;
  return formatTimeControl(Number(match[1]), Number(match[2])) || raw;
}

function formatTimeControl(initial?: number | null, increment?: number | null): string | null {
  if (typeof initial !== 'number' || typeof increment !== 'number') return null;
  return `${formatInitialMinutes(initial)}+${increment}`;
}

function formatInitialMinutes(initialSeconds: number): string {
  if (initialSeconds < 60) return `${initialSeconds}s`;
  const minutes = initialSeconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
}
