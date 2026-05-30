import { Chess } from 'chess.js';

export const STARTING_FEN = 'startpos';
export const INITIAL_FEN = new Chess().fen();

export function fenForChessJs(fen: string): string {
  return fen === STARTING_FEN ? INITIAL_FEN : fen;
}

export function uciToSan(fen: string, uci?: string | null): string | null {
  if (!uci) return null;
  const chess = new Chess(fenForChessJs(fen));
  const move = chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4, 5) || undefined,
  });
  return move?.san ?? null;
}

export function playUci(fen: string, uci: string): string | null {
  const chess = new Chess(fenForChessJs(fen));
  const move = chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4, 5) || undefined,
  });
  return move ? chess.fen() : null;
}

export function lastMoveFromUci(uci?: string | null): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}
