import { Chess } from 'chess.js';

export interface StoredLichessPuzzleMoveAttempt {
  moveUci: string;
  expectedMoveUci: string;
  correct: boolean;
  fenBefore: string;
  fenAfter: string;
  forcedMoveUci: string | null;
  attemptedAt: string;
}

export type LichessPuzzleRoundLogicErrorCode = 'ILLEGAL_MOVE' | 'INVALID_STATE';

export class LichessPuzzleRoundLogicError extends Error {
  constructor(
    readonly code: LichessPuzzleRoundLogicErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LichessPuzzleRoundLogicError';
  }
}

export function applyLichessPuzzleUciMove(fen: string, moveUci: string): string {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    throw new LichessPuzzleRoundLogicError(
      'INVALID_STATE',
      'The persisted puzzle position is invalid.',
    );
  }

  try {
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci.slice(4, 5) || undefined,
    });
    if (!move) throw new Error('Illegal move');
    return chess.fen();
  } catch {
    throw new LichessPuzzleRoundLogicError(
      'ILLEGAL_MOVE',
      'That move is not legal in the current puzzle position.',
    );
  }
}

export function parseStoredLichessPuzzleMoveAttempts(
  value: unknown,
): StoredLichessPuzzleMoveAttempt[] {
  if (!Array.isArray(value)) {
    throw new LichessPuzzleRoundLogicError(
      'INVALID_STATE',
      'The persisted puzzle attempts are invalid.',
    );
  }

  const attempts: StoredLichessPuzzleMoveAttempt[] = [];
  for (const entry of value) {
    if (!isStoredMoveAttempt(entry)) {
      throw new LichessPuzzleRoundLogicError(
        'INVALID_STATE',
        'The persisted puzzle attempts are invalid.',
      );
    }
    attempts.push({ ...entry });
  }
  return attempts;
}

export function resolveLichessPuzzleLastMoveUci(
  currentStep: number,
  attempts: readonly StoredLichessPuzzleMoveAttempt[],
  triggerMoveUci: string,
): string {
  if (currentStep === 0) return triggerMoveUci;

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (attempt?.correct) return attempt.forcedMoveUci ?? attempt.moveUci;
  }

  return triggerMoveUci;
}

function isStoredMoveAttempt(value: unknown): value is StoredLichessPuzzleMoveAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record['moveUci'] === 'string'
    && typeof record['expectedMoveUci'] === 'string'
    && typeof record['correct'] === 'boolean'
    && typeof record['fenBefore'] === 'string'
    && typeof record['fenAfter'] === 'string'
    && (typeof record['forcedMoveUci'] === 'string' || record['forcedMoveUci'] === null)
    && typeof record['attemptedAt'] === 'string';
}
