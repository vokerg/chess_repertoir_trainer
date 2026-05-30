import { Chess } from 'chess.js';
import { INITIAL_FEN } from '@/utils/chess';

export type GameMoveNode = {
  id: number;
  plyNumber: number;
  moveNumber: number;
  side: 'WHITE' | 'BLACK';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  source: 'GAME' | 'LOCAL';
};

export type GameTree = {
  root: {
    id: 0;
    fenAfter: string;
  };
  moves: GameMoveNode[];
};

export function parsePgnMoves(pgn: string): GameMoveNode[] {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess.history({ verbose: true }).map((move, index) => ({
    id: index + 1,
    plyNumber: index + 1,
    moveNumber: Math.ceil((index + 1) / 2),
    side: move.color === 'b' ? 'BLACK' : 'WHITE',
    san: move.san,
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    fenBefore: move.before,
    fenAfter: move.after,
    source: 'GAME',
  }));
}

export function buildGameTree(pgn: string): GameTree {
  const moves = parsePgnMoves(pgn);
  return {
    root: { id: 0, fenAfter: moves[0]?.fenBefore ?? INITIAL_FEN },
    moves,
  };
}

export function nextLocalSidelineId(existingLocalCount: number): number {
  return 1_000_000 + existingLocalCount;
}
