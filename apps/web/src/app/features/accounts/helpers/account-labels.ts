import { AccountProvider } from '../data-access/accounts.models';

export function providerLabel(provider?: AccountProvider | null): string {
  if (provider === 'CHESS_COM') return 'Chess.com';
  if (provider === 'LICHESS') return 'Lichess';
  return 'Provider';
}

export function providerClass(provider?: AccountProvider | null): string {
  return provider === 'CHESS_COM' ? 'provider-chess-com' : 'provider-lichess';
}

export function syncStatusLabel(status: string): string {
  if (status === 'COMPLETED') return 'Sync completed';
  if (status === 'FAILED') return 'Sync failed';
  if (status === 'RUNNING') return 'Sync running';
  return status || 'Sync result';
}

export function dateLabel(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()} ${hours}:${minutes}`;
}
