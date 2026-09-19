export const LICHESS_PUZZLE_READ_SCOPE = 'puzzle:read';
export const LICHESS_PUZZLE_WRITE_SCOPE = 'puzzle:write';

export type LichessPuzzleDifficulty =
  | 'easiest'
  | 'easier'
  | 'normal'
  | 'harder'
  | 'hardest';

export type LichessPuzzleColor = 'white' | 'black';

export interface LichessPuzzleBatchOptions {
  angle?: string;
  difficulty?: LichessPuzzleDifficulty;
  color?: LichessPuzzleColor;
  count?: number;
}

export interface LichessPuzzleSolutionSubmission {
  id: string;
  win: boolean;
  rated: boolean;
}

export interface LichessPuzzleGamePayload {
  id: string;
  pgn: string;
  rated: boolean;
  clock?: string;
  perf?: {
    key?: string;
    name?: string;
  };
}

export interface LichessPuzzlePayload {
  id: string;
  initialPly: number;
  plays: number;
  rating: number;
  solution: string[];
  themes: string[];
  fen?: string;
  lastMove?: string;
}

export interface LichessPuzzleBatchItemPayload {
  game: LichessPuzzleGamePayload;
  puzzle: LichessPuzzlePayload;
}

export interface LichessPuzzleBatchPayload {
  puzzles: LichessPuzzleBatchItemPayload[];
  glicko?: unknown;
}

export interface LichessPuzzleRoundPayload {
  id: string;
  win: boolean;
  ratingDiff: number;
}

export interface LichessPuzzleBatchSolvePayload extends LichessPuzzleBatchPayload {
  rounds: LichessPuzzleRoundPayload[];
}

export interface NormalizedLichessPuzzle {
  providerPuzzleId: string;
  providerGameId: string;
  gamePgn: string;
  initialPly: number;
  startFen: string;
  lastMoveUci: string;
  sideToMove: 'WHITE' | 'BLACK';
  rating: number;
  plays: number;
  themes: string[];
  solutionUci: string[];
}
