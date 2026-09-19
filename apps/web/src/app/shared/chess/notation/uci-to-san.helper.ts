import { Chess } from 'chess.js';

export function uciMovesToSan(fen: string, uciMoves: readonly string[]): string[] {
  const chess = new Chess(fen);

  return uciMoves.map((uci, index) => {
    const normalized = uci.trim().toLowerCase();
    const move = chess.move({
      from: normalized.substring(0, 2),
      to: normalized.substring(2, 4),
      promotion: normalized.substring(4, 5) || undefined,
    });
    if (!move) throw new Error(`Invalid UCI move at ply ${index + 1}: ${uci}`);
    return move.san;
  });
}

export function uciMoveToSan(fen: string, uciMove: string): string {
  return uciMovesToSan(fen, [uciMove])[0];
}
