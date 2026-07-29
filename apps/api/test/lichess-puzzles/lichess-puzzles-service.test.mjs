import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createLichessPuzzlesService } from '../../dist/modules/lichess-puzzles/lichess-puzzles.service.js';

function puzzlePosition() {
  const chess = new Chess();
  chess.move('e4');
  chess.move('e5');
  return chess.fen();
}

function createHarness() {
  const nowValues = [
    new Date('2026-07-29T05:00:00.000Z'),
    new Date('2026-07-29T05:01:00.000Z'),
    new Date('2026-07-29T05:02:00.000Z'),
    new Date('2026-07-29T05:03:00.000Z'),
  ];
  let nowIndex = 0;
  let round = null;
  let nextId = 1;
  const submitted = [];
  const requestedScopes = [];
  let recordedFailures = 0;

  const normalizedPuzzle = {
    providerPuzzleId: 'abcde',
    providerGameId: 'game1',
    gamePgn: '1. e4 e5',
    initialPly: 3,
    startFen: puzzlePosition(),
    lastMoveUci: 'e7e5',
    sideToMove: 'WHITE',
    rating: 1600,
    plays: 200,
    themes: ['opening', 'short'],
    solutionUci: ['g1f3', 'b8c6', 'f1b5'],
  };

  const repository = {
    async createFreshRound(userId, input) {
      const startedAt = new Date('2026-07-29T04:59:00.000Z');
      round = {
        id: nextId++,
        userId,
        puzzleId: normalizedPuzzle.providerPuzzleId,
        source: 'FRESH',
        angle: input.angle,
        difficulty: input.difficulty,
        ratedRequested: input.rated,
        status: 'IN_PROGRESS',
        outcome: null,
        currentStep: 0,
        currentFen: normalizedPuzzle.startFen,
        moveAttempts: [],
        firstWrongAt: null,
        revealedAt: null,
        learningCompletedAt: null,
        upstreamOutcome: null,
        upstreamStatus: 'NOT_REQUIRED',
        upstreamError: null,
        ratingDiff: null,
        syncedAt: null,
        startedAt,
        completedAt: null,
        createdAt: startedAt,
        updatedAt: startedAt,
        puzzle: {
          id: normalizedPuzzle.providerPuzzleId,
          gameId: normalizedPuzzle.providerGameId,
          gamePgn: normalizedPuzzle.gamePgn,
          initialPly: normalizedPuzzle.initialPly,
          startFen: normalizedPuzzle.startFen,
          lastMoveUci: normalizedPuzzle.lastMoveUci,
          sideToMove: normalizedPuzzle.sideToMove,
          solutionUci: normalizedPuzzle.solutionUci,
          themes: normalizedPuzzle.themes,
          rating: normalizedPuzzle.rating,
          plays: normalizedPuzzle.plays,
          fetchedAt: startedAt,
          updatedAt: startedAt,
        },
      };
      return round;
    },
    async findOwnedRound(userId, roundId) {
      return round && round.userId === userId && round.id === roundId ? round : null;
    },
    async updateOwnedRound(snapshot, data, options = {}) {
      assert.equal(snapshot.id, round.id);
      round = {
        ...round,
        ...data,
        updatedAt: new Date(round.updatedAt.getTime() + 1),
      };
      if (options.recordFailure) recordedFailures += 1;
      return round;
    },
    async claimSync(userId, roundId) {
      if (!round || round.userId !== userId || round.id !== roundId) return null;
      if (!['PENDING', 'FAILED'].includes(round.upstreamStatus)) return round;
      round = { ...round, upstreamStatus: 'SYNCING', upstreamError: null };
      return round;
    },
    async markSyncSucceeded(userId, roundId, ratingDiff) {
      assert.equal(userId, round.userId);
      assert.equal(roundId, round.id);
      round = {
        ...round,
        upstreamStatus: 'SYNCED',
        upstreamError: null,
        ratingDiff,
        syncedAt: new Date('2026-07-29T05:10:00.000Z'),
      };
      return round;
    },
    async markSyncFailed(userId, roundId, message) {
      assert.equal(userId, round.userId);
      assert.equal(roundId, round.id);
      round = { ...round, upstreamStatus: 'FAILED', upstreamError: message };
      return round;
    },
  };

  const service = createLichessPuzzlesService({
    client: {
      async getBatch() {
        return [normalizedPuzzle];
      },
      async submitBatch(_token, angle, solutions) {
        submitted.push({ angle, solutions });
        return {
          puzzles: [],
          rounds: [{
            id: solutions[0].id,
            win: solutions[0].win,
            ratingDiff: solutions[0].win ? 7 : -8,
          }],
        };
      },
    },
    async getAccessToken(_userId, scope) {
      requestedScopes.push(scope);
      return `token-${scope}`;
    },
    repository,
    now: () => nowValues[nowIndex++] ?? nowValues.at(-1),
  });

  return {
    service,
    submitted,
    requestedScopes,
    getRecordedFailures: () => recordedFailures,
  };
}

const createInput = {
  source: 'FRESH',
  angle: 'mix',
  difficulty: 'normal',
  rated: true,
};

{
  const harness = createHarness();
  const created = await harness.service.createRound(7, createInput);
  assert.equal(created.puzzle.id, 'abcde');
  assert.equal(created.puzzle.solutionPlies, 3);
  assert.equal('solutionUci' in created.puzzle, false);
  assert.deepEqual(harness.requestedScopes, ['puzzle:read']);

  const wrong = await harness.service.submitMove(7, created.id, { moveUci: 'd2d4' });
  assert.equal(wrong.correct, false);
  assert.equal(wrong.round.currentStep, 0);
  assert.equal(wrong.round.status, 'IN_PROGRESS');
  assert.equal(wrong.round.upstreamStatus, 'SYNCED');
  assert.equal(wrong.round.ratingDiff, -8);
  assert.equal(harness.getRecordedFailures(), 1);
  assert.equal(harness.submitted.length, 1);
  assert.equal(harness.submitted[0].solutions[0].win, false);

  const firstCorrect = await harness.service.submitMove(7, created.id, { moveUci: 'g1f3' });
  assert.equal(firstCorrect.correct, true);
  assert.equal(firstCorrect.forcedMoveUci, 'b8c6');
  assert.equal(firstCorrect.round.currentStep, 2);
  assert.equal(firstCorrect.round.status, 'IN_PROGRESS');

  const completed = await harness.service.submitMove(7, created.id, { moveUci: 'f1b5' });
  assert.equal(completed.round.status, 'COMPLETED');
  assert.equal(completed.round.outcome, 'LOSS');
  assert.equal(completed.round.upstreamStatus, 'SYNCED');
  assert.equal(harness.submitted.length, 1);
}

{
  const harness = createHarness();
  const created = await harness.service.createRound(7, createInput);
  await harness.service.submitMove(7, created.id, { moveUci: 'g1f3' });
  const completed = await harness.service.submitMove(7, created.id, { moveUci: 'f1b5' });
  assert.equal(completed.round.outcome, 'WIN');
  assert.equal(completed.round.ratingDiff, 7);
  assert.equal(harness.submitted.length, 1);
  assert.equal(harness.submitted[0].solutions[0].win, true);
}

{
  const harness = createHarness();
  const created = await harness.service.createRound(7, createInput);
  const abandoned = await harness.service.abandonRound(7, created.id);
  assert.equal(abandoned.status, 'ABANDONED');
  assert.equal(abandoned.outcome, 'ABANDONED');
  assert.equal(abandoned.upstreamStatus, 'NOT_REQUIRED');
  assert.equal(harness.submitted.length, 0);
}
