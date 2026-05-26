import {
  startTraining,
  TrainingState,
  playUserMove,
  getExpectedUserMoveUci,
} from 'chess-domain';
import { LineService } from './lineService';
import prisma from '../prisma';

/**
 * In-memory map of active training sessions. The key is the session ID (number from DB) and the value
 * holds the TrainingState from chess-domain. This map is not persisted across server restarts,
 * which is acceptable for v1 as sessions are short-lived.
 */
const activeSessions: Map<number, { state: TrainingState }> = new Map();

async function recordMissedExpectedMove(sessionId: number, state: TrainingState) {
  const expectedChild = state.expectedUserMove;
  const expectedMove = expectedChild?.node.moveUci;
  if (!expectedChild || !expectedMove) return;

  const fenBefore = state.current.node.fenAfter;

  await prisma.trainingAttemptMove.create({
    data: {
      sessionId,
      moveNodeId: expectedChild.node.id,
      fenBefore,
      expectedMoveUci: expectedMove,
      playedMoveUci: null,
      wasCorrect: false,
    },
  });

  await prisma.moveNode.update({
    where: { id: expectedChild.node.id },
    data: {
      timesSeen: { increment: 1 },
      incorrectCount: { increment: 1 },
      currentStreak: 0,
      lastSeenAt: new Date(),
    },
  });

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: {
      totalExpectedMoves: { increment: 1 },
      mistakesCount: { increment: 1 },
    },
  });
}

async function finalizeSession(sessionId: number) {
  const sessionRow = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!sessionRow) throw new Error('Training session not found');

  const resultStatus = sessionRow.mistakesCount > 0 ? 'FAILED' : 'PASSED';
  const accuracy = sessionRow.totalExpectedMoves > 0
    ? sessionRow.correctMoves / sessionRow.totalExpectedMoves
    : null;

  const updated = await prisma.trainingSession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      result: resultStatus,
      accuracy: accuracy ?? undefined,
    },
  });

  await prisma.line.update({
    where: { id: sessionRow.lineId },
    data: {
      totalAttempts: { increment: 1 },
      passedCount: { increment: resultStatus === 'PASSED' ? 1 : 0 },
      failedCount: { increment: resultStatus === 'PASSED' ? 0 : 1 },
      lastTrainedAt: new Date(),
    },
  });

  activeSessions.delete(sessionId);
  return updated;
}

export const TrainingService = {
  /**
   * Start a new training session on the given line. This builds the move tree, creates a session row
   * in the database, and returns initial data including the session ID and current board FEN.
   */
  start: async (lineId: number) => {
    const tree = await LineService.getMoveTree(lineId);
    if (!tree) throw new Error('Line not found');

    const trainingState = startTraining(tree);
    const session = await prisma.trainingSession.create({
      data: {
        lineId,
        result: 'IN_PROGRESS',
        mistakesCount: 0,
        totalExpectedMoves: 0,
        correctMoves: 0,
      },
    });

    activeSessions.set(session.id, { state: trainingState });

    const initialFen = trainingState.current.node.fenAfter;
    const expectedMove = getExpectedUserMoveUci(trainingState);
    return {
      sessionId: session.id,
      fen: initialFen,
      expectedMove,
      completed: trainingState.completed,
    };
  },

  /**
   * Play a user move in an active session. Each attempt is counted exactly once
   * against the expected trained-side move node.
   */
  playMove: async (sessionId: number, moveUci: string) => {
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

    await prisma.moveNode.update({
      where: { id: expectedChild.node.id },
      data: {
        timesSeen: { increment: 1 },
        correctCount: { increment: wasCorrect ? 1 : 0 },
        incorrectCount: { increment: wasCorrect ? 0 : 1 },
        currentStreak: wasCorrect ? { increment: 1 } : 0,
        lastSeenAt: new Date(),
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
      finalSession = await finalizeSession(sessionId);
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
  complete: async (sessionId: number) => {
    const sessionMeta = activeSessions.get(sessionId);
    if (!sessionMeta) {
      return prisma.trainingSession.findUnique({ where: { id: sessionId } });
    }

    if (!sessionMeta.state.completed) {
      await recordMissedExpectedMove(sessionId, sessionMeta.state);
      sessionMeta.state.completed = true;
      sessionMeta.state.expectedUserMove = undefined;
    }

    return finalizeSession(sessionId);
  },

  /**
   * Abandon a session. The session will be marked as ABANDONED. Statistics are not updated for lines.
   */
  abandon: async (sessionId: number) => {
    activeSessions.delete(sessionId);
    return prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        result: 'ABANDONED',
      },
    });
  },
};
