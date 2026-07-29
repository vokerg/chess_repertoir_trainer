import { LichessPuzzleAccessError } from './lichess-puzzle-access.service';
import { LichessPuzzleRoundLogicError } from './lichess-puzzle-round.logic';
import { LichessPuzzlesClientError } from './lichess-puzzles.client';
import { LichessPuzzleRoundConflictError } from './lichess-puzzles.repository.prisma';

export type LichessPuzzleErrorStatusCode = 400 | 401 | 404 | 409 | 429 | 502;

export class LichessPuzzleRoundError extends Error {
  constructor(
    message: string,
    readonly statusCode: LichessPuzzleErrorStatusCode,
    readonly code: string,
  ) {
    super(message);
    this.name = 'LichessPuzzleRoundError';
  }
}

export function throwMappedLichessPuzzleError(error: unknown): never {
  if (error instanceof LichessPuzzleRoundError) throw error;

  if (error instanceof LichessPuzzleRoundConflictError) {
    throw new LichessPuzzleRoundError(
      'The puzzle round changed in another request. Reload it and try again.',
      409,
      'LICHESS_PUZZLE_ROUND_CONFLICT',
    );
  }

  if (error instanceof LichessPuzzleAccessError) {
    throw new LichessPuzzleRoundError(
      error.message,
      error.statusCode === 401 ? 401 : 400,
      error.code,
    );
  }

  if (error instanceof LichessPuzzlesClientError) {
    throw new LichessPuzzleRoundError(
      error.message,
      error.statusCode === 429 ? 429 : 502,
      'LICHESS_PUZZLE_UPSTREAM_ERROR',
    );
  }

  if (error instanceof LichessPuzzleRoundLogicError) {
    if (error.code === 'ILLEGAL_MOVE') {
      throw new LichessPuzzleRoundError(
        error.message,
        400,
        'LICHESS_PUZZLE_MOVE_ILLEGAL',
      );
    }
    throw new LichessPuzzleRoundError(
      error.message,
      409,
      'LICHESS_PUZZLE_ROUND_STATE_INVALID',
    );
  }

  throw error;
}
