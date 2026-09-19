import { Chess } from 'chess.js';

export function normalizeFenForPosition(fen: string): string {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  const parts = chess.fen().split(/\s+/);
  return parts.slice(0, 4).join(' ');
}
