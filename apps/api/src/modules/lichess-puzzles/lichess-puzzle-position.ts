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

const GAME_RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*']);

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

  const moves = parseLichessGameMoves(gamePgn);
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

function parseLichessGameMoves(gamePgn: string): VerboseMoveLike[] {
  const pgnGame = new Chess();
  try {
    pgnGame.loadPgn(gamePgn);
    return pgnGame.history({ verbose: true }) as VerboseMoveLike[];
  } catch {
    return parseBareSanSequence(gamePgn);
  }
}

function parseBareSanSequence(moveText: string): VerboseMoveLike[] {
  const game = new Chess();
  const tokens = moveText
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;[^\r\n]*/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^\d+\.(?:\.\.)?$/.test(token))
    .filter((token) => !GAME_RESULT_TOKENS.has(token));

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    try {
      game.move(token);
    } catch {
      throw new LichessPuzzlePositionError(
        `Could not parse Lichess puzzle SAN token ${index + 1}: ${token}`,
      );
    }
  }

  const moves = game.history({ verbose: true }) as VerboseMoveLike[];
  if (moves.length !== tokens.length) {
    throw new LichessPuzzlePositionError('Could not parse Lichess puzzle game PGN');
  }
  return moves;
}
