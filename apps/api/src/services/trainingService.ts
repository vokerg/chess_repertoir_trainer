import { startTraining, TrainingState, playUserMove, getExpectedUserMoveUci } from 'chess-domain';
import { LineService } from './lineService';
import prisma from '../prisma';

/**
 * In-memory map of active training sessions. The key is the session ID (number from DB) and the value
 * holds the TrainingState from chess-domain along with aggregate counters. This map is not persisted
 * across server restarts, which is acceptable for v1 as sessions are short-lived. When a session
 * completes or is abandoned, it is removed from this map.
 */
const activeSessions: Map<number, { state: TrainingState }> = new Map();

export const TrainingService = {
  /**
   * Start a new training session on the given line. This builds the move tree, creates a session row
   * in the database, and returns initial data including the session ID and current board FEN.
   */
  start: async (lineId: number) => {
    // Build move tree from database
    const tree = await LineService.getMoveTree(lineId);
    if (!tree) throw new Error('Line not found');
    // Start training state using domain package
    const trainingState = startTraining(tree);
    // Create DB session
    const session = await prisma.trainingSession.create({
      data: {
        lineId,
        result: 'IN_PROGRESS',
        mistakesCount: 0,
        totalExpectedMoves: 0,
        correctMoves: 0,
      },
    });
    // Store in memory
    activeSessions.set(session.id, { state: trainingState });
    // Determine initial FEN (fenAfter of current node). The root node's fenAfter is starting position.
    const initialFen = trainingState.current.node.fenAfter;
    const expectedMove = getExpectedUserMoveUci(trainingState);
    return { sessionId: session.id, fen: initialFen, expectedMove };
  },
  /**
   * Play a user move in an active session. Returns whether the move was correct, the expected move,
   * the new fen after processing (including opponent auto moves), and whether the session is completed.
   */
  playMove: async (sessionId: number, moveUci: string) => {
    const sessionMeta = activeSessions.get(sessionId);
    if (!sessionMeta) throw new Error('Session not found or already completed');
    const { state } = sessionMeta;
    // Retrieve expected move before playing
    const expectedMove = getExpectedUserMoveUci(state);
    // Record attempt in DB; need fenBefore (current state's fenAfter)
    const fenBefore = state.current.node.fenAfter;
    // Evaluate move via domain engine
    const result = playUserMove(state, moveUci);
    const wasCorrect = result.correct;
    // Determine the moveNodeId if we advanced (correct) and the next node is user move or opponent? We use expected move's node id
    let moveNodeId: number | null = null;
    if (wasCorrect && expectedMove) {
      // After correct user move, state.current will be at the node representing the user move's node
      const currentNode = state.current;
      moveNodeId = currentNode.node.id;
    }
    // Persist attempt
    await prisma.trainingAttemptMove.create({
      data: {
        sessionId,
        moveNodeId: moveNodeId || undefined,
        fenBefore,
        expectedMoveUci: expectedMove,
        playedMoveUci: moveUci,
        wasCorrect: wasCorrect,
      },
    });
    // Update move node stats if was user move attempt
    if (expectedMove) {
      // Find node by expectedMove under current state's parent? We can rely on moveNodeId if correct, else find by matching UCI
      if (moveNodeId) {
        // Correct move: increment timesSeen, correctCount, currentStreak
        await prisma.moveNode.update({
          where: { id: moveNodeId },
          data: {
            timesSeen: { increment: 1 },
            correctCount: { increment: 1 },
            currentStreak: { increment: 1 },
            lastSeenAt: new Date(),
          },
        });
      } else {
        // Incorrect: find expected node first
        // We need to find node by UCI and parent state.current? The state.current may still be same because we didn't advance; expected move is child of current
        const currentNode = state.current;
        const children = currentNode.children;
        const expectedChild = children.find((c) => c.node.moveUci === expectedMove);
        if (expectedChild) {
          await prisma.moveNode.update({
            where: { id: expectedChild.node.id },
            data: {
              timesSeen: { increment: 1 },
              incorrectCount: { increment: 1 },
              currentStreak: 0,
              lastSeenAt: new Date(),
            },
          });
        }
      }
    }
    // Update TrainingSession counters
    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        totalExpectedMoves: { increment: expectedMove ? 1 : 0 },
        correctMoves: { increment: wasCorrect ? 1 : 0 },
        mistakesCount: { increment: wasCorrect ? 0 : 1 },
      },
    });
    // After applying, compute new FEN and expected move
    const newFen = state.current.node.fenAfter;
    const nextExpected = getExpectedUserMoveUci(state);
    // If session completed, mark result accordingly and update line stats
    let completed = result.completed;
    if (completed) {
      // Finalize session now
      const sessionRow = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
      if (sessionRow) {
        const hasMistakes = sessionRow.mistakesCount > 0;
        const resultStatus = hasMistakes ? 'FAILED' : 'PASSED';
        const totalExpected = sessionRow.totalExpectedMoves + (expectedMove ? 1 : 0);
        const correctTotal = sessionRow.correctMoves + (wasCorrect ? 1 : 0);
        const accuracy = totalExpected > 0 ? correctTotal / totalExpected : null;
        await prisma.trainingSession.update({
          where: { id: sessionId },
          data: {
            completedAt: new Date(),
            result: resultStatus,
            totalExpectedMoves: totalExpected,
            correctMoves: correctTotal,
            accuracy: accuracy || undefined,
          },
        });
        // Update line stats
        await prisma.line.update({
          where: { id: sessionRow.lineId },
          data: {
            totalAttempts: { increment: 1 },
            passedCount: { increment: resultStatus === 'PASSED' ? 1 : 0 },
            failedCount: { increment: resultStatus === 'PASSED' ? 0 : 1 },
            lastTrainedAt: new Date(),
          },
        });
      }
      // Remove from activeSessions
      activeSessions.delete(sessionId);
    }
    return { correct: wasCorrect, expectedMove, fen: newFen, nextExpectedMove: nextExpected, completed };
  },
  /**
   * Explicitly complete a session (e.g. if user finishes training early). This will mark the session
   * as completed and update statistics accordingly. If the session has not run through all moves,
   * it will be considered a failure if any mistakes were made.
   */
  complete: async (sessionId: number) => {
    const sessionMeta = activeSessions.get(sessionId);
    if (!sessionMeta) {
      // Session may already be completed; return current row
      const row = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
      return row;
    }
    // Remove active state
    activeSessions.delete(sessionId);
    const sessionRow = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
    if (!sessionRow) throw new Error('Training session not found');
    const hasMistakes = sessionRow.mistakesCount > 0;
    const resultStatus = hasMistakes ? 'FAILED' : 'PASSED';
    const accuracy = sessionRow.totalExpectedMoves > 0 ? sessionRow.correctMoves / sessionRow.totalExpectedMoves : null;
    const updated = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        result: resultStatus,
        accuracy: accuracy || undefined,
      },
    });
    // Update line stats
    await prisma.line.update({
      where: { id: sessionRow.lineId },
      data: {
        totalAttempts: { increment: 1 },
        passedCount: { increment: resultStatus === 'PASSED' ? 1 : 0 },
        failedCount: { increment: resultStatus === 'PASSED' ? 0 : 1 },
        lastTrainedAt: new Date(),
      },
    });
    return updated;
  },
  /**
   * Abandon a session. The session will be marked as ABANDONED. Statistics are not updated for lines.
   */
  abandon: async (sessionId: number) => {
    // Remove active state
    activeSessions.delete(sessionId);
    const updated = await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        result: 'ABANDONED',
      },
    });
    return updated;
  },
};