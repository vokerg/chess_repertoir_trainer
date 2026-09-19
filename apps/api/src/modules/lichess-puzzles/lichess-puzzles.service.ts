import type {
  CreateLichessPuzzleRoundBody,
  LichessPuzzleRound,
  LichessPuzzleRoundOutcome,
  SubmitLichessPuzzleMoveBody,
  SubmitLichessPuzzleMoveResponse,
} from '@chess-trainer/contracts/lichess-puzzles';
import { getLichessPuzzleAccessToken } from './lichess-puzzle-access.service';
import {
  applyLichessPuzzleUciMove,
  parseStoredLichessPuzzleMoveAttempts,
  type StoredLichessPuzzleMoveAttempt,
} from './lichess-puzzle-round.logic';
import { LichessPuzzlesClient } from './lichess-puzzles.client';
import {
  LichessPuzzleRoundError,
  throwMappedLichessPuzzleError,
} from './lichess-puzzles.errors';
import { mapLichessPuzzleRound } from './lichess-puzzles.mapper';
import {
  claimLichessPuzzleRoundSync,
  createFreshLichessPuzzleRound,
  findOwnedLichessPuzzleRound,
  type LichessPuzzleRoundWithPuzzle,
  markLichessPuzzleRoundSyncFailed,
  markLichessPuzzleRoundSyncSucceeded,
  updateOwnedLichessPuzzleRound,
} from './lichess-puzzles.repository.prisma';

const MAX_USER_ATTEMPTS = 100;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

      return mapLichessPuzzleRound(await repository.createFreshRound(userId, {
        angle: input.angle,
        difficulty: input.difficulty,
        rated: input.rated,
        puzzle,
      }));
    } catch (error) {
      throwMappedLichessPuzzleError(error);
    }
  }

  async function getRound(userId: number, roundId: number): Promise<LichessPuzzleRound> {
    try {
      const round = await repository.findOwnedRound(userId, roundId);
      if (!round) {
        throw new LichessPuzzleRoundError(
          'Lichess puzzle round not found.',
          404,
          'LICHESS_PUZZLE_ROUND_NOT_FOUND',
        );
      }
      return mapLichessPuzzleRound(round);
    } catch (error) {
      throwMappedLichessPuzzleError(error);
    }
  }

  async function submitMove(
    userId: number,
    roundId: number,
    input: SubmitLichessPuzzleMoveBody,
  ): Promise<SubmitLichessPuzzleMoveResponse> {
    try {
      const round = await requireInProgressRound(userId, roundId);
      const attempts = parseStoredLichessPuzzleMoveAttempts(round.moveAttempts);
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

      const playedFen = applyLichessPuzzleUciMove(round.currentFen, input.moveUci);
      const attemptedAt = now();
      if (input.moveUci !== expectedMoveUci) {
        const firstFailure = round.firstWrongAt === null;
        const updated = await repository.updateOwnedRound(round, {
          moveAttempts: appendAttempt(attempts, {
            moveUci: input.moveUci,
            expectedMoveUci,
            correct: false,
            fenBefore: round.currentFen,
            fenAfter: playedFen,
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
          round: mapLichessPuzzleRound(await syncIfNeeded(updated)),
        };
      }

      let currentFen = playedFen;
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
        currentFen = applyLichessPuzzleUciMove(currentFen, forcedMoveUci);
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
          fenAfter: playedFen,
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
        round: mapLichessPuzzleRound(await syncIfNeeded(updated)),
      };
    } catch (error) {
      throwMappedLichessPuzzleError(error);
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
      return mapLichessPuzzleRound(await syncIfNeeded(updated));
    } catch (error) {
      throwMappedLichessPuzzleError(error);
    }
  }

  async function retrySync(userId: number, roundId: number): Promise<LichessPuzzleRound> {
    try {
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
      return mapLichessPuzzleRound(await syncIfNeeded(round));
    } catch (error) {
      throwMappedLichessPuzzleError(error);
    }
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

function appendAttempt(
  attempts: readonly StoredLichessPuzzleMoveAttempt[],
  attempt: StoredLichessPuzzleMoveAttempt,
): StoredLichessPuzzleMoveAttempt[] {
  return [...attempts, attempt];
}
