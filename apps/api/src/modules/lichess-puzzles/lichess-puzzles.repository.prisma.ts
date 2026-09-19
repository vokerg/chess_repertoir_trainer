import { Prisma } from '@prisma/client';
import type { LichessPuzzleDifficulty } from '@chess-trainer/contracts/lichess-puzzles';
import { ActivityFeedService } from '../activity-feed/activity-feed.service';
import prisma from '../../prisma';
import type { StoredLichessPuzzleMoveAttempt } from './lichess-puzzle-round.logic';
import type { NormalizedLichessPuzzle } from './lichess-puzzle.types';

const roundInclude = {
  puzzle: true,
} satisfies Prisma.LichessPuzzleRoundInclude;

export type LichessPuzzleRoundWithPuzzle = Prisma.LichessPuzzleRoundGetPayload<{
  include: typeof roundInclude;
}>;

export type LichessPuzzleRoundStateUpdate = Omit<
  Prisma.LichessPuzzleRoundUpdateManyMutationInput,
  'moveAttempts'
> & {
  moveAttempts?: StoredLichessPuzzleMoveAttempt[];
};

export class LichessPuzzleRoundConflictError extends Error {
  constructor() {
    super('Lichess puzzle round changed before the request could be saved');
    this.name = 'LichessPuzzleRoundConflictError';
  }
}

export async function createFreshLichessPuzzleRound(
  userId: number,
  input: {
    angle: string;
    difficulty: LichessPuzzleDifficulty;
    rated: boolean;
    puzzle: NormalizedLichessPuzzle;
  },
): Promise<LichessPuzzleRoundWithPuzzle> {
  return prisma.$transaction(async (tx) => {
    const puzzle = await tx.lichessPuzzle.upsert({
      where: { id: input.puzzle.providerPuzzleId },
      update: {
        gameId: input.puzzle.providerGameId,
        gamePgn: input.puzzle.gamePgn,
        initialPly: input.puzzle.initialPly,
        startFen: input.puzzle.startFen,
        lastMoveUci: input.puzzle.lastMoveUci,
        sideToMove: input.puzzle.sideToMove,
        solutionUci: input.puzzle.solutionUci,
        themes: input.puzzle.themes,
        rating: input.puzzle.rating,
        plays: input.puzzle.plays,
        fetchedAt: new Date(),
      },
      create: {
        id: input.puzzle.providerPuzzleId,
        gameId: input.puzzle.providerGameId,
        gamePgn: input.puzzle.gamePgn,
        initialPly: input.puzzle.initialPly,
        startFen: input.puzzle.startFen,
        lastMoveUci: input.puzzle.lastMoveUci,
        sideToMove: input.puzzle.sideToMove,
        solutionUci: input.puzzle.solutionUci,
        themes: input.puzzle.themes,
        rating: input.puzzle.rating,
        plays: input.puzzle.plays,
      },
    });

    return tx.lichessPuzzleRound.create({
      data: {
        userId,
        puzzleId: puzzle.id,
        source: 'FRESH',
        angle: input.angle,
        difficulty: input.difficulty,
        ratedRequested: input.rated,
        currentFen: puzzle.startFen,
        moveAttempts: [],
      },
      include: roundInclude,
    });
  });
}

export async function findOwnedLichessPuzzleRound(
  userId: number,
  roundId: number,
): Promise<LichessPuzzleRoundWithPuzzle | null> {
  return prisma.lichessPuzzleRound.findFirst({
    where: { id: roundId, userId },
    include: roundInclude,
  });
}

export async function updateOwnedLichessPuzzleRound(
  snapshot: LichessPuzzleRoundWithPuzzle,
  data: LichessPuzzleRoundStateUpdate,
  options: {
    recordFailure?: boolean;
    failureDueAt?: Date;
  } = {},
): Promise<LichessPuzzleRoundWithPuzzle> {
  const { moveAttempts, ...scalarData } = data;
  const prismaData: Prisma.LichessPuzzleRoundUpdateManyMutationInput = {
    ...scalarData,
    ...(moveAttempts !== undefined
      ? { moveAttempts: moveAttempts as unknown as Prisma.InputJsonValue }
      : {}),
  };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lichessPuzzleRound.updateMany({
      where: {
        id: snapshot.id,
        userId: snapshot.userId,
        status: snapshot.status,
        currentStep: snapshot.currentStep,
        updatedAt: snapshot.updatedAt,
      },
      data: prismaData,
    });

    if (updated.count !== 1) throw new LichessPuzzleRoundConflictError();

    if (snapshot.status === 'IN_PROGRESS' && data.status === 'COMPLETED') {
      if (!(data.completedAt instanceof Date)) {
        throw new Error('Completed Lichess puzzle rounds require completedAt');
      }
      await ActivityFeedService.recordIncrement({
        userId: snapshot.userId,
        type: 'LICHESS_PUZZLES_COMPLETED',
        occurredAt: data.completedAt,
      }, tx);
    }

    if (options.recordFailure) {
      const dueAt = options.failureDueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
      await tx.lichessPuzzleReviewState.upsert({
        where: {
          userId_puzzleId: {
            userId: snapshot.userId,
            puzzleId: snapshot.puzzleId,
          },
        },
        update: {
          dueAt,
          intervalStage: 0,
          consecutiveSuccesses: 0,
          failureCount: { increment: 1 },
          lastRoundId: snapshot.id,
        },
        create: {
          userId: snapshot.userId,
          puzzleId: snapshot.puzzleId,
          dueAt,
          intervalStage: 0,
          consecutiveSuccesses: 0,
          failureCount: 1,
          lastRoundId: snapshot.id,
        },
      });
    }

    const round = await tx.lichessPuzzleRound.findFirst({
      where: { id: snapshot.id, userId: snapshot.userId },
      include: roundInclude,
    });
    if (!round) throw new Error('Lichess puzzle round not found after update');
    return round;
  });
}

export async function claimLichessPuzzleRoundSync(
  userId: number,
  roundId: number,
): Promise<LichessPuzzleRoundWithPuzzle | null> {
  await prisma.lichessPuzzleRound.updateMany({
    where: {
      id: roundId,
      userId,
      upstreamOutcome: { not: null },
      upstreamStatus: { in: ['PENDING', 'FAILED'] },
    },
    data: {
      upstreamStatus: 'SYNCING',
      upstreamError: null,
    },
  });

  return findOwnedLichessPuzzleRound(userId, roundId);
}

export async function markLichessPuzzleRoundSyncSucceeded(
  userId: number,
  roundId: number,
  ratingDiff: number,
): Promise<LichessPuzzleRoundWithPuzzle> {
  const updated = await prisma.lichessPuzzleRound.updateMany({
    where: { id: roundId, userId, upstreamStatus: 'SYNCING' },
    data: {
      upstreamStatus: 'SYNCED',
      upstreamError: null,
      ratingDiff,
      syncedAt: new Date(),
    },
  });
  if (updated.count !== 1) throw new LichessPuzzleRoundConflictError();
  const round = await findOwnedLichessPuzzleRound(userId, roundId);
  if (!round) throw new Error('Lichess puzzle round not found after synchronization');
  return round;
}

export async function markLichessPuzzleRoundSyncFailed(
  userId: number,
  roundId: number,
  message: string,
): Promise<LichessPuzzleRoundWithPuzzle> {
  const updated = await prisma.lichessPuzzleRound.updateMany({
    where: { id: roundId, userId, upstreamStatus: 'SYNCING' },
    data: {
      upstreamStatus: 'FAILED',
      upstreamError: message,
    },
  });
  if (updated.count !== 1) throw new LichessPuzzleRoundConflictError();
  const round = await findOwnedLichessPuzzleRound(userId, roundId);
  if (!round) throw new Error('Lichess puzzle round not found after synchronization failure');
  return round;
}
