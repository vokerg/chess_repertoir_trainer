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
  if (!Number.isInteger(initialPly) || initialPly < 2) {
    throw new LichessPuzzlePositionError('Lichess puzzle initialPly must identify a ply after the trigger move');
  }

  const game = new Chess();
  try {
    game.loadPgn(gamePgn);
  } catch {
    throw new LichessPuzzlePositionError('Could not parse Lichess puzzle game PGN');
  }

  const moves = game.history({ verbose: true }) as VerboseMoveLike[];
  const expectedPgnPlies = initialPly - 1;
  if (moves.length !== expectedPgnPlies) {
    throw new LichessPuzzlePositionError(
      `Lichess puzzle initialPly ${initialPly} expects ${expectedPgnPlies} PGN plies, received ${moves.length}`,
    );
  }

  const triggerMove = moves.at(-1);
  if (!triggerMove?.from || !triggerMove.to || !triggerMove.after) {
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
