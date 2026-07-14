import { Chess } from 'chess.js';

export interface ParsedInitialPosition {
  kind: 'FEN' | 'MOVES';
  startingFen: string;
  moves: string[];
}

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

export function parseInitialPositionInput(value: string): ParsedInitialPosition {
  const input = value.trim();
  if (!input) throw new Error('Enter a FEN or a sequence of moves.');

  const fen = parseFen(input);
  if (fen) return { kind: 'FEN', startingFen: fen, moves: [] };

  const tokens = input.split(/[\s,]+/).filter(Boolean);
  if (tokens.length && tokens.every((token) => UCI_MOVE_PATTERN.test(token))) {
    return parseUciMoves(tokens);
  }

  try {
    const chess = new Chess();
    chess.loadPgn(input);
    const history = chess.history({ verbose: true });
    if (!history.length) throw new Error('No moves found.');
    return {
      kind: 'MOVES',
      startingFen: history[0].before,
      moves: history.map((move) => `${move.from}${move.to}${move.promotion || ''}`),
    };
  } catch {
    throw new Error('Could not read this as FEN, PGN, SAN, or UCI moves.');
  }
}

function parseFen(input: string): string | null {
  try {
    return new Chess(input).fen();
  } catch {
    return null;
  }
}

function parseUciMoves(tokens: readonly string[]): ParsedInitialPosition {
  const chess = new Chess();
  const startingFen = chess.fen();
  const moves = tokens.map((token, index) => {
    const uci = token.toLowerCase();
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.substring(4, 5) || undefined,
    });
    if (!move) throw new Error(`Invalid UCI move at ply ${index + 1}.`);
    return uci;
  });
  return { kind: 'MOVES', startingFen, moves };
}
