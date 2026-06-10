import { Chess } from 'chess.js';

/**
 * Formats a sequence of moves into a SAN string with move numbers.
 *
 * Example: "1. e4 e5 2. Nf3 Nc6"
 */
export function formatMoveSequence(moves: { san: string; plyNumber: number }[]): string {
  return moves
    .map((move, index) => {
      const moveNumber = Math.ceil(move.plyNumber / 2);
      if (move.plyNumber % 2 === 1) {
        return `${moveNumber}. ${move.san}`;
      }
      if (index === 0) {
        return `${moveNumber}... ${move.san}`;
      }
      return move.san;
    })
    .join(' ');
}

/**
 * Given a starting FEN and a list of UCI moves, returns a SAN move sequence.
 */
export function getMoveSequenceFromUci(startingFen: string, uciMoves: string[]): string {
  const chess =
    startingFen === 'startpos' || !startingFen ? new Chess() : new Chess(startingFen);
  const moves: { san: string; plyNumber: number }[] = [];
  let currentPly = (chess.moveNumber() - 1) * 2 + (chess.turn() === 'w' ? 1 : 2);

  for (const uci of uciMoves) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      if (!move) break;
      moves.push({ san: move.san, plyNumber: currentPly });
      currentPly++;
    } catch {
      break;
    }
  }

  return formatMoveSequence(moves);
}
