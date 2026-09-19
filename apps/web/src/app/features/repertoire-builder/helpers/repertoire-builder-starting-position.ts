import type { RepertoireTargetStartingPoint } from '@chess-trainer/contracts/repertoire-target';
import { Chess } from 'chess.js';
import type {
  RepertoireBuilderSetup,
  RepertoireBuilderStartingScope,
} from '../state/repertoire-builder.models';

export interface RepertoireBuilderStartingScopeOption {
  value: RepertoireBuilderStartingScope;
  label: string;
}

export interface RepertoireBuilderResolvedStartingPosition {
  startingFen: string;
  startingPoint: RepertoireTargetStartingPoint;
}

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

const PRESET_MOVES: Readonly<Record<Exclude<RepertoireBuilderStartingScope, 'FULL' | 'CUSTOM'>, string>> = {
  E4: 'e2e4',
  D4: 'd2d4',
  C4: 'c2c4',
  NF3: 'g1f3',
};

export function repertoireBuilderStartingScopeOptions(
  side: RepertoireBuilderSetup['side'],
): readonly RepertoireBuilderStartingScopeOption[] {
  if (side === 'WHITE') {
    return [
      { value: 'FULL', label: 'Full White repertoire' },
      { value: 'E4', label: 'Start with 1.e4' },
      { value: 'D4', label: 'Start with 1.d4' },
      { value: 'C4', label: 'Start with 1.c4' },
      { value: 'NF3', label: 'Start with 1.Nf3' },
      { value: 'CUSTOM', label: 'Other position or move sequence' },
    ];
  }
  return [
    { value: 'FULL', label: 'All White first moves' },
    { value: 'E4', label: 'Against 1.e4' },
    { value: 'D4', label: 'Against 1.d4' },
    { value: 'C4', label: 'Against 1.c4' },
    { value: 'NF3', label: 'Against 1.Nf3' },
    { value: 'CUSTOM', label: 'Other position or move sequence' },
  ];
}

export function resolveRepertoireBuilderStartingPosition(
  setup: RepertoireBuilderSetup,
): RepertoireBuilderResolvedStartingPosition {
  if (setup.startingScope === 'FULL') {
    return {
      startingFen: 'startpos',
      startingPoint: { kind: 'INITIAL_POSITION' },
    };
  }

  if (setup.startingScope === 'CUSTOM') {
    const startingFen = resolveManualStartingFen(setup.customStartingPosition);
    return {
      startingFen,
      startingPoint: { kind: 'FEN', fen: startingFen },
    };
  }

  const startingFen = fenAfterMoves([PRESET_MOVES[setup.startingScope]]);
  return {
    startingFen,
    startingPoint: { kind: 'FEN', fen: startingFen },
  };
}

export function validateRepertoireBuilderStartingPosition(setup: RepertoireBuilderSetup): string | null {
  try {
    resolveRepertoireBuilderStartingPosition(setup);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Could not read this starting position.';
  }
}

function resolveManualStartingFen(value: string): string {
  const input = value.trim();
  if (!input) throw new Error('Enter a FEN, PGN, SAN, or UCI move sequence.');

  const fen = parseFen(input);
  if (fen) return fen;

  const tokens = input.split(/[\s,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => UCI_MOVE_PATTERN.test(token))) {
    return fenAfterMoves(tokens);
  }

  try {
    const chess = new Chess();
    chess.loadPgn(input);
    if (chess.history().length === 0) throw new Error('No moves found.');
    return chess.fen();
  } catch {
    throw new Error('Could not read this as FEN, PGN, SAN, or UCI moves.');
  }
}

function parseFen(input: string): string | null {
  const parts = input.split(/\s+/);
  const candidate = parts.length === 4 ? `${input} 0 1` : input;
  try {
    return new Chess(candidate).fen();
  } catch {
    return null;
  }
}

function fenAfterMoves(moves: readonly string[]): string {
  const chess = new Chess();
  for (const [index, rawMove] of moves.entries()) {
    const uci = rawMove.toLowerCase();
    const move = chess.move({
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.substring(4, 5) || undefined,
    });
    if (!move) throw new Error(`Invalid UCI move at ply ${index + 1}.`);
  }
  return chess.fen();
}
