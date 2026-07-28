import { Chess } from 'chess.js';

export interface ReconstructedLichessPuzzlePosition {
  startFen: string;
  lastMoveUci: string;
  sideToMove: 'WHITE' | 'BLACK';
}

export class LichessPuzzlePositionError extends Error {}

interface VerboseMoveLike {
  from?: string;
  to?: string;
  promotion?: string;
  after?: string;
}

export function reconstructLichessPuzzlePosition(
  gamePgn: string,
  initialPly: number,
): ReconstructedLichessPuzzlePosition {
  if (!gamePgn.trim()) {
    throw new LichessPuzzlePositionError('Lichess puzzle game PGN is empty');
  }
  if (!Number.isInteger(initialPly) || initialPly < 0) {
    throw new LichessPuzzlePositionError('Lichess puzzle initialPly must be a non-negative integer');
  }

  const game = new Chess();
  try {
    game.loadPgn(gamePgn);
  } catch {
    throw new LichessPuzzlePositionError('Could not parse Lichess puzzle game PGN');
  }

  const moves = game.history({ verbose: true }) as VerboseMoveLike[];
  const triggerMove = moves[initialPly];
  if (!triggerMove) {
    throw new LichessPuzzlePositionError(
      `Lichess puzzle initialPly ${initialPly} is outside the ${moves.length}-ply game PGN`,
    );
  }
  if (!triggerMove.from || !triggerMove.to || !triggerMove.after) {
    throw new LichessPuzzlePositionError('Could not reconstruct the Lichess puzzle trigger move');
  }

  let challenge: Chess;
  try {
    challenge = new Chess(triggerMove.after);
  } catch {
    throw new LichessPuzzlePositionError('Lichess puzzle trigger move produced an invalid FEN');
  }

  return {
    startFen: challenge.fen(),
    lastMoveUci: `${triggerMove.from}${triggerMove.to}${triggerMove.promotion ?? ''}`,
    sideToMove: challenge.turn() === 'b' ? 'BLACK' : 'WHITE',
  };
}
