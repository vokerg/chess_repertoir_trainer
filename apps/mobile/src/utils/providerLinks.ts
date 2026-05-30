import { Provider } from '@/api/dto';

export function profileUrl(provider?: Provider | null, username?: string | null): string | null {
  if (!provider || !username) return null;
  const encoded = encodeURIComponent(username);
  if (provider === 'LICHESS') return `https://lichess.org/@/${encoded}`;
  if (provider === 'CHESS_COM') return `https://www.chess.com/member/${encoded}`;
  return null;
}
