import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import {
  createCandidateDecisionOpponentPreparationService,
} from '../../dist/modules/candidate-decision/candidate-decision-opponent-preparation.service.js';

const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const normalizedFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -';

const populationMoves = [
  corpusMove('e7e5', 'e5', 450),
  corpusMove('c7c5', 'c5', 250),
  corpusMove('e7e6', 'e6', 150),
  corpusMove('c7c6', 'c6', 60),
  corpusMove('d7d5', 'd5', 40),
  corpusMove('g7g6', 'g6', 20),
  corpusMove('b8c6', 'Nc6', 10),
  corpusMove('a7a6', 'a6', 10),
];

const personalMoves = [
  personalMove('e7e5', 'e5', 1),
  personalMove('c7c5', 'c5', 1),
  personalMove('e7e6', 'e6', 1),
  personalMove('c7c6', 'c6', 1),
  personalMove('d7d5', 'd5', 1),
  personalMove('h7h6', 'h6', 4),
];

const service = createCandidateDecisionOpponentPreparationService({
  engine: {
    async get() {
      return null;
    },
  },
  masters: {
    async get() {
      return explorer('LICHESS_MASTERS', []);
    },
  },
  population: {
    async get() {
      return explorer('LICHESS_GAMES', populationMoves);
    },
  },
  personal: {
    async get() {
      return {
        fen,
        normalizedFen,
        bookOpening: null,
        sideToMove: 'BLACK',
        fullMoveNumber: 1,
        ratedOnly: true,
        occurrences: 9,
        games: { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null },
        nextMoves: personalMoves,
        appliedFilters: {},
      };
    },
  },
  playerProfile: {
    async get() {
      return {
        generatedAt: '2026-08-10T12:00:00.000Z',
        coverage: { totalGames: 0 },
        preference: { items: [] },
        performance: { items: [] },
      };
    },
  },
  courses: {
    async get() {
      return {
        normalizedFen,
        suggestions: [
          courseSuggestion('h7h6', 'h6', false, 11),
          courseSuggestion('e7e5', 'e5', true, 12),
        ],
      };
    },
  },
});

const response = await service.get(42, {
  fen,
  decisionRole: 'OPPONENT_RESPONSE',
  target: newCourseRepertoireTargetExample,
  candidateLimit: 6,
});

assert.equal(response.rankingPolicyVersion, '2026-08-opponent-preparation-v1');
assert.equal(response.sourceSummary.courses, 'AVAILABLE');
assert.equal(response.candidates.length, 6);
assert.deepEqual(response.candidates.map((candidate) => candidate.rank), [1, 2, 3, 4, 5, 6]);

const repeatedTail = response.candidates.find((candidate) => candidate.moveUci === 'h7h6');
assert.ok(repeatedTail, 'A sixth personal reply outside the old seed/top-six boundary must be discoverable.');
assert.equal(repeatedTail.reasonCodes.includes('PERSONALLY_ENCOUNTERED'), true);
assert.equal(repeatedTail.reasonCodes.includes('COMMON_AT_TARGET_LEVEL'), false);
assert.equal(repeatedTail.reasonCodes.includes('MANUAL_CANDIDATE'), false);
assert.equal(repeatedTail.manuallyRequested, false);
assert.equal(repeatedTail.evidence.course.covered, true);
assert.equal(repeatedTail.evidence.course.references.length, 1);

const e5 = response.candidates.find((candidate) => candidate.moveUci === 'e7e5');
assert.ok(e5);
assert.equal(e5.evidence.course.covered, false, 'User-move course suggestions must not count as opponent coverage.');

for (const candidate of response.candidates) {
  assert.equal(candidate.targetFit.status, 'UNKNOWN');
  assert.deepEqual(candidate.targetFit.reasonCodes, []);
  assert.equal(candidate.profileFit.status, 'UNKNOWN');
  assert.deepEqual(candidate.profileFit.reasonCodes, []);
  assert.equal(candidate.components.targetFit, 0);
  assert.equal(candidate.components.profileFit, 0);
  assert.equal(candidate.coverage?.cumulativePercent, null);
}

const manualResponse = await service.get(42, {
  fen,
  decisionRole: 'OPPONENT_RESPONSE',
  target: newCourseRepertoireTargetExample,
  candidateLimit: 6,
  includeMoveUci: 'a7a6',
});
const manual = manualResponse.candidates.find((candidate) => candidate.moveUci === 'a7a6');
assert.ok(manual);
assert.equal(manualResponse.requestedMoveIncluded, true);
assert.equal(manual.manuallyRequested, true);
assert.equal(manual.reasonCodes.includes('MANUAL_CANDIDATE'), true);
assert.deepEqual(manualResponse.candidates.map((candidate) => candidate.rank), [1, 2, 3, 4, 5, 6]);

function explorer(source, moves) {
  const total = moves.reduce((sum, move) => sum + move.games.total, 0);
  return {
    fen,
    normalizedFen,
    dataset: {
      source,
      profileVersion: 1,
      sinceYear: source === 'LICHESS_MASTERS' ? 2000 : 0,
      untilYear: 2026,
      movesLimit: 12,
      topGamesLimit: source === 'LICHESS_MASTERS' ? 15 : 0,
    },
    cache: {
      status: 'HIT',
      fetchedAt: '2026-08-10T12:00:00.000Z',
      expiresAt: '2026-08-11T12:00:00.000Z',
    },
    opening: null,
    games: { total, whiteWins: Math.floor(total / 2), draws: 0, blackWins: total - Math.floor(total / 2) },
    moves,
    topGames: [],
  };
}

function corpusMove(uci, san, games) {
  return {
    uci,
    san,
    averageRating: 1600,
    games: {
      total: games,
      whiteWins: Math.floor(games / 2),
      draws: 0,
      blackWins: games - Math.floor(games / 2),
    },
    opening: null,
    representativeGame: null,
  };
}

function personalMove(moveUci, moveSan, gameCount) {
  return {
    moveUci,
    moveSan,
    fenAfter: fen,
    side: 'BLACK',
    moveNumber: 1,
    occurrences: gameCount,
    games: { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null },
    gameCount,
    moveSharePercent: Math.round((gameCount / 9) * 1000) / 10,
    scoreDeltaVsPositionPercent: null,
    lastPlayedAt: '2026-08-01T12:00:00.000Z',
  };
}

function courseSuggestion(moveUci, moveSan, isUserMove, nodeId) {
  return {
    nodeId,
    fenBefore: fen,
    fenAfter: fen,
    moveUci,
    moveSan,
    isUserMove,
    isCorrectUserMove: isUserMove,
    lineId: 21,
    lineName: 'Main line',
    chapterId: 31,
    chapterName: 'Chapter',
    courseId: 41,
    courseName: 'Course',
  };
}
