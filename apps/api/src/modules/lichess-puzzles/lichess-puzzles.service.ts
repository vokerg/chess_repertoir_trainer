import { Chess } from 'chess.js';
import type {
  CreateLichessPuzzleRoundBody,
  LichessPuzzleRound,
  LichessPuzzleRoundOutcome,
  SubmitLichessPuzzleMoveBody,
  SubmitLichessPuzzleMoveResponse,
} from '@chess-trainer/contracts/lichess-puzzles';
import { LichessPuzzlesClient, LichessPuzzlesClientError } from './lichess-puzzles.client';
import { getLichessPuzzleAccessToken, LichessPuzzleAccessError } from './lichess-puzzle-access.service';
import {
  claimLichessPuzzleRoundSync,
  createFreshLichessPuzzleRound,
  findOwnedLichessPuzzleRound,
  LichessPuzzleRoundConflictError,
  type LichessPuzzleRoundWithPuzzle,
  markLichessPuzzleRoundSyncFailed,
  markLichessPuzzleRoundSyncSucceeded,
  updateOwnedLichessPuzzleRound,
} from './lichess-puzzles.repository.prisma';

const MAX_USER_ATTEMPTS = 100;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface StoredMoveAttempt {
  moveUci: string;
  expectedMoveUci: string;
  correct: boolean;
  fenBefore: string;
  fenAfter: string;
  forcedMoveUci: string | null;
  attemptedAt: string;
}

export class LichessPuzzleRoundError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 401 | 404 | 409 | 429 | 502,
    readonly code: string,
  ) {
    super(message);
  }
}

export interface LichessPuzzlesServiceDependencies {
  client: Pick<LichessPuzzlesClient, 'getBatch' | 'submitBatch'>;
  getAccessToken: typeof getLichessPuzzleAccessToken;
  repository: {
    createFreshRound: typeof createFreshLichessPuzzleRound;
    findOwnedRound: typeof findOwnedLichessPuzzleRound;
    updateOwnedRound: typeof updateOwnedLichessPuzzleRound;
    claimSync: typeof claimLichessPuzzleRoundSync;
    markSyncSucceeded: typeof markLichessPuzzleRoundSyncSucceeded;
    markSyncFailed: typeof markLichessPuzzleRoundSyncFailed;
  };
  now: () => Date;
}

const defaultDependencies: LichessPuzzlesServiceDependencies = {
  client: new LichessPuzzlesClient(),
  getAccessToken: getLichessPuzzleAccessToken,
  repository: {
    createFreshRound: createFreshLichessPuzzleRound,
    findOwnedRound: findOwnedLichessPuzzleRound,
    updateOwnedRound: updateOwnedLichessPuzzleRound,
    claimSync: claimLichessPuzzleRoundSync,
    markSyncSucceeded: markLichessPuzzleRoundSyncSucceeded,
    markSyncFailed: markLichessPuzzleRoundSyncFailed,
  },
  now: () => new Date(),
};

export function createLichessPuzzlesService(
  dependencies: LichessPuzzlesServiceDependencies = defaultDependencies,
) {
  const { client, getAccessToken, repository, now } = dependencies;

  async function createRound(
    userId: number,
    input: CreateLichessPuzzleRoundBody,
  ): Promise<LichessPuzzleRound> {
    try {
      const accessToken = await getAccessToken(userId, 'puzzle:read');
      const puzzles = await client.getBatch(accessToken, {
        angle: input.angle,
        difficulty: input.difficulty,
        count: 1,
      });
      const puzzle = puzzles[0];
      if (!puzzle) {
        throw new LichessPuzzleRoundError(
          'Lichess returned no puzzle for those settings.',
          404,
          'LICHESS_PUZZLE_UNAVAILABLE',
        );
      }

      return mapRound(await repository.createFreshRound(userId, {
        angle: input.angle,
        difficulty: input.difficulty,
        rated: input.rated,
        puzzle,
      }));
    } catch (error) {
      throw normalizeError(error, 'Could not start a Lichess puzzle round.');
    }
  }

  async function getRound(userId: number, roundId: number): Promise<LichessPuzzleRound> {
    const round = await repository.findOwnedRound(userId, roundId);
    if (!round) {
      throw new LichessPuzzleRoundError(
        'Lichess puzzle round not found.',
        404,
        'LICHESS_PUZZLE_ROUND_NOT_FOUND',
      );
    }
    return mapRound(round);
  }

  async function submitMove(
    userId: number,
    roundId: number,
    input: SubmitLichessPuzzleMoveBody,
  ): Promise<SubmitLichessPuzzleMoveResponse> {
    try {
      const round = await requireInProgressRound(userId, roundId);
      const attempts = readMoveAttempts(round.moveAttempts);
      if (attempts.length >= MAX_USER_ATTEMPTS) {
        throw new LichessPuzzleRoundError(
          'This puzzle round has reached the attempt limit.',
          409,
          'LICHESS_PUZZLE_ATTEMPT_LIMIT',
        );
      }
      if (round.currentStep % 2 !== 0) {
        throw new LichessPuzzleRoundError(
          'The persisted puzzle round is not at a user-move boundary.',
          409,
          'LICHESS_PUZZLE_ROUND_STATE_INVALID',
        );
      }

      const expectedMoveUci = round.puzzle.solutionUci[round.currentStep];
      if (!expectedMoveUci) {
        throw new LichessPuzzleRoundError(
          'The persisted puzzle solution is exhausted.',
          409,
          'LICHESS_PUZZLE_ROUND_STATE_INVALID',
        );
      }

      const played = applyUci(round.currentFen, input.moveUci);
      const attemptedAt = now();
      if (input.moveUci !== expectedMoveUci) {
        const firstFailure = round.firstWrongAt === null;
        const updated = await repository.updateOwnedRound(round, {
          moveAttempts: appendAttempt(attempts, {
            moveUci: input.moveUci,
            expectedMoveUci,
            correct: false,
            fenBefore: round.currentFen,
            fenAfter: played.fen,
            forcedMoveUci: null,
            attemptedAt: attemptedAt.toISOString(),
          }),
          firstWrongAt: round.firstWrongAt ?? attemptedAt,
          upstreamOutcome: round.ratedRequested ? 'LOSS' : null,
          upstreamStatus: round.ratedRequested && round.upstreamOutcome === null
            ? 'PENDING'
            : round.upstreamStatus,
        }, {
          recordFailure: firstFailure,
          failureDueAt: new Date(attemptedAt.getTime() + ONE_DAY_MS),
        });

        return {
          correct: false,
          forcedMoveUci: null,
          round: mapRound(await syncIfNeeded(updated)),
        };
      }

      let currentFen = played.fen;
      let currentStep = round.currentStep + 1;
      let forcedMoveUci: string | null = null;

      if (currentStep < round.puzzle.solutionUci.length) {
        forcedMoveUci = round.puzzle.solutionUci[currentStep] ?? null;
        if (!forcedMoveUci) {
          throw new LichessPuzzleRoundError(
            'The persisted puzzle solution is incomplete.',
            409,
            'LICHESS_PUZZLE_ROUND_STATE_INVALID',
          );
        }
        currentFen = applyUci(currentFen, forcedMoveUci).fen;
        currentStep += 1;
      }

      const completed = currentStep >= round.puzzle.solutionUci.length;
      const completedOutcome: LichessPuzzleRoundOutcome = round.firstWrongAt ? 'LOSS' : 'WIN';
      const firstUpstreamOutcome = completed && round.ratedRequested && round.upstreamOutcome === null;

      const updated = await repository.updateOwnedRound(round, {
        currentFen,
        currentStep,
        moveAttempts: appendAttempt(attempts, {
          moveUci: input.moveUci,
          expectedMoveUci,
          correct: true,
          fenBefore: round.currentFen,
          fenAfter: played.fen,
          forcedMoveUci,
          attemptedAt: attemptedAt.toISOString(),
        }),
        ...(completed ? {
          status: 'COMPLETED',
          outcome: completedOutcome,
          learningCompletedAt: attemptedAt,
          completedAt: attemptedAt,
          upstreamOutcome: round.ratedRequested ? (round.upstreamOutcome ?? completedOutcome) : null,
          upstreamStatus: firstUpstreamOutcome ? 'PENDING' : round.upstreamStatus,
        } : {}),
      });

      return {
        correct: true,
        forcedMoveUci,
        round: mapRound(await syncIfNeeded(updated)),
      };
    } catch (error) {
      throw normalizeError(error, 'Could not submit the Lichess puzzle move.');
    }
  }

  async function abandonRound(userId: number, roundId: number): Promise<LichessPuzzleRound> {
    try {
      const round = await requireInProgressRound(userId, roundId);
      const completedAt = now();
      const updated = await repository.updateOwnedRound(round, {
        status: 'ABANDONED',
        outcome: round.firstWrongAt ? 'LOSS' : 'ABANDONED',
        completedAt,
      });
      return mapRound(await syncIfNeeded(updated));
    } catch (error) {
      throw normalizeError(error, 'Could not abandon the Lichess puzzle round.');
    }
  }

  async function retrySync(userId: number, roundId: number): Promise<LichessPuzzleRound> {
    const round = await repository.findOwnedRound(userId, roundId);
    if (!round) {
      throw new LichessPuzzleRoundError(
        'Lichess puzzle round not found.',
        404,
        'LICHESS_PUZZLE_ROUND_NOT_FOUND',
      );
    }
    if (!round.upstreamOutcome) {
      throw new LichessPuzzleRoundError(
        'This puzzle round has no Lichess result to synchronize.',
        409,
        'LICHESS_PUZZLE_SYNC_NOT_REQUIRED',
      );
    }
    return mapRound(await syncIfNeeded(round));
  }

  async function requireInProgressRound(
    userId: number,
    roundId: number,
  ): Promise<LichessPuzzleRoundWithPuzzle> {
    const round = await repository.findOwnedRound(userId, roundId);
    if (!round) {
      throw new LichessPuzzleRoundError(
        'Lichess puzzle round not found.',
        404,
        'LICHESS_PUZZLE_ROUND_NOT_FOUND',
      );
    }
    if (round.status !== 'IN_PROGRESS') {
      throw new LichessPuzzleRoundError(
        'This Lichess puzzle round is already finished.',
        409,
        'LICHESS_PUZZLE_ROUND_FINISHED',
      );
    }
    return round;
  }

  async function syncIfNeeded(
    round: LichessPuzzleRoundWithPuzzle,
  ): Promise<LichessPuzzleRoundWithPuzzle> {
    if (
      !round.ratedRequested
      || !round.upstreamOutcome
      || round.upstreamStatus === 'NOT_REQUIRED'
      || round.upstreamStatus === 'SYNCED'
      || round.upstreamStatus === 'SYNCING'
    ) {
      return round;
    }

    const claimed = await repository.claimSync(round.userId, round.id);
    if (!claimed || claimed.upstreamStatus !== 'SYNCING' || !claimed.upstreamOutcome) {
      return claimed ?? round;
    }

    try {
      const accessToken = await getAccessToken(round.userId, 'puzzle:write');
      const response = await client.submitBatch(accessToken, claimed.angle, [{
        id: claimed.puzzleId,
        win: claimed.upstreamOutcome === 'WIN',
        rated: true,
      }]);
      const providerRound = response.rounds.find((candidate) => candidate.id === claimed.puzzleId);
      if (!providerRound) {
        throw new Error('Lichess did not return the submitted puzzle result');
      }
      return repository.markSyncSucceeded(round.userId, round.id, providerRound.ratingDiff);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not synchronize with Lichess';
      return repository.markSyncFailed(round.userId, round.id, message);
    }
  }

  return {
    createRound,
    getRound,
    submitMove,
    abandonRound,
    retrySync,
  };
}

export const LichessPuzzlesService = createLichessPuzzlesService();

function applyUci(fen: string, moveUci: string): { fen: string } {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci.slice(4, 5) || undefined,
    });
    if (!move) throw new Error('Illegal move');
    return { fen: chess.fen() };
  } catch {
    throw new LichessPuzzleRoundError(
      'That move is not legal in the current puzzle position.',
      400,
      'LICHESS_PUZZLE_MOVE_ILLEGAL',
    );
  }
}

function readMoveAttempts(value: unknown): StoredMoveAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is StoredMoveAttempt => Boolean(
    entry
    && typeof entry === 'object'
    && typeof (entry as StoredMoveAttempt).moveUci === 'string',
  ));
}

function appendAttempt(
  attempts: StoredMoveAttempt[],
  attempt: StoredMoveAttempt,
): StoredMoveAttempt[] {
  return [...attempts, attempt];
}

function mapRound(round: LichessPuzzleRoundWithPuzzle): LichessPuzzleRound {
  return {
    id: round.id,
    source: round.source as LichessPuzzleRound['source'],
    angle: round.angle,
    difficulty: round.difficulty as LichessPuzzleRound['difficulty'],
    ratedRequested: round.ratedRequested,
    status: round.status as LichessPuzzleRound['status'],
    outcome: round.outcome as LichessPuzzleRound['outcome'],
    currentFen: round.currentFen,
    currentStep: round.currentStep,
    firstWrongAt: round.firstWrongAt?.toISOString() ?? null,
    learningCompletedAt: round.learningCompletedAt?.toISOString() ?? null,
    upstreamStatus: round.upstreamStatus as LichessPuzzleRound['upstreamStatus'],
    ratingDiff: round.ratingDiff,
    startedAt: round.startedAt.toISOString(),
    completedAt: round.completedAt?.toISOString() ?? null,
    puzzle: {
      id: round.puzzle.id,
      rating: round.puzzle.rating,
      themes: round.puzzle.themes,
      startFen: round.puzzle.startFen,
      lastMoveUci: round.puzzle.lastMoveUci,
      sideToMove: round.puzzle.sideToMove as LichessPuzzleRound['puzzle']['sideToMove'],
      solutionPlies: round.puzzle.solutionUci.length,
    },
  };
}

function normalizeError(error: unknown, fallback: string): LichessPuzzleRoundError {
  if (error instanceof LichessPuzzleRoundError) return error;
  if (error instanceof LichessPuzzleRoundConflictError) {
    return new LichessPuzzleRoundError(
      'The puzzle round changed in another request. Reload it and try again.',
      409,
      'LICHESS_PUZZLE_ROUND_CONFLICT',
    );
  }
  if (error instanceof LichessPuzzleAccessError) {
    return new LichessPuzzleRoundError(error.message, error.statusCode, error.code);
  }
  if (error instanceof LichessPuzzlesClientError) {
    const statusCode = error.statusCode === 429 ? 429 : 502;
    return new LichessPuzzleRoundError(error.message, statusCode, 'LICHESS_PUZZLE_UPSTREAM_ERROR');
  }
  return new LichessPuzzleRoundError(
    error instanceof Error ? error.message : fallback,
    400,
    'LICHESS_PUZZLE_REQUEST_FAILED',
  );
}
