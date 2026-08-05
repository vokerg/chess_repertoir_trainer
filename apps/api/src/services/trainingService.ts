import {
  startSublineTraining,
  TrainingState,
  playUserMove,
  getExpectedUserMoveUci,
} from 'chess-domain';
import { LineService } from '../modules/courses/courses.service';
import {
  HashedAvailableSublineDto,
  DerivedLineData,
  getDerivedLineData,
  getAvailableSublineRows,
  pickRandomSubline,
} from '../modules/courses/sublines.service';
import { ActivityFeedService } from '../modules/activity-feed/activity-feed.service';
import { TRAINING_MODE_LINE } from '../modules/training/training.constants';
import prisma from '../prisma';

/**
 * In-memory map of active training sessions. The key is the session ID (number from DB) and the value
 * holds the TrainingState from chess-domain. This map is not persisted across server restarts,
 * which is acceptable for v1 as sessions are short-lived.
 */
const activeSessions: Map<number, { state: TrainingState; subline: HashedAvailableSublineDto }> = new Map();

export class PreparedLineStaleError extends Error {}

async function getOwnedSession(userId: number, sessionId: number) {
  return prisma.trainingSession.findFirst({
    where: {
      id: sessionId,
      userId,
      line: { chapter: { course: { userId } } },
    },
  });
}

async function requireOwnedSession(userId: number, sessionId: number) {
  const session = await getOwnedSession(userId, sessionId);
  if (!session) throw new Error('Training session not found');
  return session;
}

async function finalizeSession(
  userId: number,
  sessionId: number,
  missedState?: TrainingState,
) {
  const completedAt = new Date();
  const updated = await prisma.$transaction(async (transaction) => {
    const locked = await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "TrainingSession"
      WHERE "id" = ${sessionId} AND "userId" = ${userId}
      FOR UPDATE
    `;
    if (!locked[0]) throw new Error('Training session not found');

    const sessionRow = await transaction.trainingSession.findFirst({
      where: {
        id: sessionId,
        userId,
        line: { chapter: { course: { userId } } },
      },
    });
    if (!sessionRow) throw new Error('Training session not found');
    if (sessionRow.result !== 'IN_PROGRESS') return sessionRow;

    let mistakesCount = sessionRow.mistakesCount;
    let totalExpectedMoves = sessionRow.totalExpectedMoves;
    const expectedChild = missedState?.expectedUserMove;
    const expectedMove = expectedChild?.node.moveUci;
    if (expectedChild && expectedMove && missedState) {
      await transaction.trainingAttemptMove.create({
        data: {
          sessionId,
          moveNodeId: expectedChild.node.id,
          fenBefore: missedState.current.node.fenAfter,
          expectedMoveUci: expectedMove,
          playedMoveUci: null,
          wasCorrect: false,
        },
      });
      mistakesCount += 1;
      totalExpectedMoves += 1;
    }

    const resultStatus = mistakesCount > 0 ? 'FAILED' : 'PASSED';
    const accuracy = totalExpectedMoves > 0
      ? sessionRow.correctMoves / totalExpectedMoves
      : null;
    const terminal = await transaction.trainingSession.update({
      where: { id: sessionId },
      data: {
        completedAt,
        result: resultStatus,
        mistakesCount,
        totalExpectedMoves,
        accuracy: accuracy ?? undefined,
      },
    });

    await transaction.trainingSublineAttempt.updateMany({
      where: { userId, trainingSessionId: sessionId, result: 'IN_PROGRESS' },
      data: {
        result: resultStatus,
        passed: resultStatus === 'PASSED',
        mistakesCount,
        totalExpectedMoves,
        correctMoves: sessionRow.correctMoves,
        accuracy: accuracy ?? undefined,
        completedAt,
      },
    });
    await ActivityFeedService.recordIncrement({
      userId,
      type: 'REPERTOIRE_LINES_TRAINED',
      occurredAt: completedAt,
    }, transaction);
    return terminal;
  });

  activeSessions.delete(sessionId);
  return updated;
}

async function startForSubline(
  userId: number,
  subline: HashedAvailableSublineDto,
  trainingMode: string,
) {
  const tree = await LineService.getMoveTree(userId, subline.lineId);
  if (!tree) throw new Error('Line not found');

  const trainingState = startSublineTraining(tree, {
    leafNodeId: subline.leafNodeId,
    moves: subline.moves,
  });
  const session = await prisma.trainingSession.create({
    data: {
      userId,
      lineId: subline.lineId,
      result: 'IN_PROGRESS',
      mistakesCount: 0,
      totalExpectedMoves: 0,
      correctMoves: 0,
    },
  });

  await prisma.trainingSublineAttempt.create({
    data: {
      userId,
      lineId: subline.lineId,
      trainingSessionId: session.id,
      sublineHash: subline.hash,
      sublineKeyVersion: subline.canonicalKeyVersion,
      movesJson: subline.moves,
      moveText: subline.moveText,
      trainingMode,
      result: 'IN_PROGRESS',
      mistakesCount: 0,
      totalExpectedMoves: 0,
      correctMoves: 0,
    },
  });

  activeSessions.set(session.id, { state: trainingState, subline });

  if (trainingState.completed) {
    await finalizeSession(userId, session.id);
  }

  return {
    sessionId: session.id,
    fen: trainingState.current.node.fenAfter,
    expectedMove: getExpectedUserMoveUci(trainingState),
    completed: trainingState.completed,
    sublineHash: subline.hash,
    sublineMoveText: subline.moveText,
  };
}

async function startForPreparedSubline(
  userId: number,
  preparedLine: DerivedLineData,
  subline: HashedAvailableSublineDto,
  trainingMode: string,
) {
  const owned = await prisma.line.findFirst({
    where: { id: preparedLine.line.id, chapter: { course: { userId } } },
    select: { id: true, updatedAt: true },
  });
  if (!owned || subline.lineId !== preparedLine.line.id) throw new Error('Line not found');
  if (owned.updatedAt.getTime() !== preparedLine.line.updatedAt.getTime()) {
    throw new PreparedLineStaleError('Prepared line changed.');
  }

  const trainingState = startSublineTraining(preparedLine.tree, { leafNodeId: subline.leafNodeId, moves: subline.moves });
  return createTrainingSession(userId, subline, trainingMode, trainingState);
}

async function createTrainingSession(userId: number, subline: HashedAvailableSublineDto, trainingMode: string, trainingState: TrainingState) {
  const session = await prisma.trainingSession.create({ data: { userId, lineId: subline.lineId, result: 'IN_PROGRESS', mistakesCount: 0, totalExpectedMoves: 0, correctMoves: 0 } });
  await prisma.trainingSublineAttempt.create({ data: { userId, lineId: subline.lineId, trainingSessionId: session.id, sublineHash: subline.hash, sublineKeyVersion: subline.canonicalKeyVersion, movesJson: subline.moves, moveText: subline.moveText, trainingMode, result: 'IN_PROGRESS', mistakesCount: 0, totalExpectedMoves: 0, correctMoves: 0 } });
  activeSessions.set(session.id, { state: trainingState, subline });
  if (trainingState.completed) await finalizeSession(userId, session.id);
  return { sessionId: session.id, fen: trainingState.current.node.fenAfter, expectedMove: getExpectedUserMoveUci(trainingState), completed: trainingState.completed, sublineHash: subline.hash, sublineMoveText: subline.moveText };
}

export const TrainingService = {
  /**
   * Start a new training session on the given line. This builds the move tree, creates a session row
   * in the database, and returns initial data including the session ID and current board FEN.
   */
  start: async (userId: number, lineId: number) => {
    const sublines = await getAvailableSublineRows(userId, { type: 'LINE', id: lineId });
    if (sublines === null) throw new Error('Line not found');
    const subline = pickRandomSubline(sublines);
    if (!subline) {
      throw new Error('Line has no available sublines to train.');
    }

    return startForSubline(userId, subline, TRAINING_MODE_LINE);
  },

  startForSubline,
  startForPreparedSubline,

  /**
   * Play a user move in an active session. Each attempt is counted exactly once
   * against the expected trained-side move node.
   */
  playMove: async (userId: number, sessionId: number, moveUci: string) => {
    await requireOwnedSession(userId, sessionId);
    const sessionMeta = activeSessions.get(sessionId);
    if (!sessionMeta) throw new Error('Session not found or already completed');

    const { state } = sessionMeta;
    const expectedChild = state.expectedUserMove;
    const expectedMove = expectedChild?.node.moveUci;
    if (!expectedChild || !expectedMove) throw new Error('No user move is expected in this position');

    const fenBefore = state.current.node.fenAfter;
    const pathLengthBefore = state.path.length;
    const result = playUserMove(state, moveUci);
    const wasCorrect = result.correct;
    const playedMoves = wasCorrect
      ? state.path.slice(pathLengthBefore).map((pathNode) => ({
          moveUci: pathNode.node.moveUci,
          moveSan: pathNode.node.moveSan,
          isUserMove: pathNode.node.isUserMove,
        }))
      : [];

    await prisma.trainingAttemptMove.create({
      data: {
        sessionId,
        moveNodeId: expectedChild.node.id,
        fenBefore,
        expectedMoveUci: expectedMove,
        playedMoveUci: moveUci,
        wasCorrect,
      },
    });

    const updatedSession = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        totalExpectedMoves: { increment: 1 },
        correctMoves: { increment: wasCorrect ? 1 : 0 },
        mistakesCount: { increment: wasCorrect ? 0 : 1 },
      },
    });

    const newFen = state.current.node.fenAfter;
    const nextExpected = getExpectedUserMoveUci(state);

    let finalSession = null;
    if (result.completed) {
      finalSession = await finalizeSession(userId, sessionId);
    }

    return {
      correct: wasCorrect,
      expectedMove,
      playedMoves,
      fen: newFen,
      nextExpectedMove: nextExpected,
      completed: result.completed,
      result: finalSession?.result,
      accuracy: finalSession?.accuracy ?? (updatedSession.totalExpectedMoves > 0 ? updatedSession.correctMoves / updatedSession.totalExpectedMoves : null),
      mistakesCount: finalSession?.mistakesCount ?? updatedSession.mistakesCount,
      correctMoves: finalSession?.correctMoves ?? updatedSession.correctMoves,
      totalExpectedMoves: finalSession?.totalExpectedMoves ?? updatedSession.totalExpectedMoves,
    };
  },

  /**
   * Explicitly complete a session early. The current counters are finalized as-is.
   */
  complete: async (userId: number, sessionId: number) => {
    await requireOwnedSession(userId, sessionId);
    const sessionMeta = activeSessions.get(sessionId);
    if (!sessionMeta) {
      const session = await getOwnedSession(userId, sessionId);
      if (session?.result === 'IN_PROGRESS') return finalizeSession(userId, sessionId);
      return session;
    }

    if (!sessionMeta.state.completed) {
      const completed = await finalizeSession(userId, sessionId, sessionMeta.state);
      sessionMeta.state.completed = true;
      sessionMeta.state.expectedUserMove = undefined;
      return completed;
    }

    return finalizeSession(userId, sessionId);
  },

  /**
   * Abandon a session. The session will be marked as ABANDONED. Statistics are not updated for lines.
   */
  abandon: async (userId: number, sessionId: number) => {
    await requireOwnedSession(userId, sessionId);
    activeSessions.delete(sessionId);
    const completedAt = new Date();
    return prisma.$transaction(async (transaction) => {
      const transitioned = await transaction.trainingSession.updateMany({
        where: { id: sessionId, userId, result: 'IN_PROGRESS' },
        data: { completedAt, result: 'ABANDONED' },
      });
      if (transitioned.count === 1) {
        await transaction.trainingSublineAttempt.updateMany({
          where: { userId, trainingSessionId: sessionId, result: 'IN_PROGRESS' },
          data: {
            result: 'ABANDONED',
            passed: null,
            completedAt,
          },
        });
      }
      return transaction.trainingSession.findUniqueOrThrow({ where: { id: sessionId } });
    });
  },

  getSession: async (userId: number, sessionId: number) => getOwnedSession(userId, sessionId),

  getReview: async (userId: number, sessionId: number) => {
    const session = await getOwnedSession(userId, sessionId);
    if (!session) return null;

    const mistakes = await prisma.trainingAttemptMove.findMany({
      where: { sessionId, session: { userId }, wasCorrect: false },
      orderBy: { createdAt: 'asc' },
      include: {
        moveNode: {
          select: {
            id: true,
            moveSan: true,
            moveUci: true,
            comment: true,
            annotation: true,
            branchLabel: true,
          },
        },
      },
    });

    return {
      ...session,
      mistakes: mistakes.map((attempt) => ({
        id: attempt.id,
        moveNodeId: attempt.moveNodeId,
        fenBefore: attempt.fenBefore,
        expectedMoveUci: attempt.expectedMoveUci,
        playedMoveUci: attempt.playedMoveUci,
        moveSan: attempt.moveNode?.moveSan ?? null,
        comment: attempt.moveNode?.comment ?? null,
        annotation: attempt.moveNode?.annotation ?? null,
        branchLabel: attempt.moveNode?.branchLabel ?? null,
        createdAt: attempt.createdAt,
      })),
    };
  },

  listHistory: async (userId: number) => prisma.trainingSession.findMany({
    where: { userId, line: { chapter: { course: { userId } } } },
    orderBy: { startedAt: 'desc' },
    include: {
      line: {
        select: {
          id: true,
          name: true,
          chapter: { select: { id: true, name: true, courseId: true } },
        },
      },
      sublineAttempt: {
        select: {
          sublineHash: true,
          sublineKeyVersion: true,
          moveText: true,
          trainingMode: true,
        },
      },
    },
  }),
};
