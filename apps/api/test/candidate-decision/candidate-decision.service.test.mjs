import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import {
  CandidateDecisionRoleMismatchError,
  createCandidateDecisionService,
  resolveCandidateOpeningEvidence,
} from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const target = {
  ...newCourseRepertoireTargetExample,
  objective: {
    ...newCourseRepertoireTargetExample.objective,
    preferredCharacters: ['BALANCED'],
  },
};

function explorer(source, moves) {
  const total = moves.reduce((sum, move) => sum + move.games.total, 0);
  return {
    fen: startFen,
    normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
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
      fetchedAt: '2026-07-20T08:00:00.000Z',
      expiresAt: '2026-08-20T08:00:00.000Z',
    },
    opening: null,
    games: { total, whiteWins: Math.floor(total / 2), draws: 0, blackWins: total - Math.floor(total / 2) },
    moves,
    topGames: [],
  };
}

function corpusMove(uci, san, games, whiteWins, openingName) {
  return {
    uci,
    san,
    averageRating: 1800,
    games: {
      total: games,
      whiteWins,
      draws: 0,
      blackWins: games - whiteWins,
    },
    opening: { eco: 'A00', name: openingName },
    representativeGame: null,
  };
}

const profile = {
  generatedAt: '2026-07-29T08:00:00.000Z',
  coverage: { totalGames: 100 },
  preference: {
    items: [{
      dimension: 'CHARACTER',
      value: 'BALANCED',
      games: 40,
      exposurePercent: 40,
    }],
  },
  performance: { items: [] },
};

const openingEvidence = {
  status: 'AVAILABLE',
  opening: { eco: 'A00', name: 'Test opening' },
  classificationVersion: '2026-07-rules-v2',
  side: 'WHITE',
  soundness: 'SOUND',
  character: ['BALANCED'],
  theoreticalStatus: 'MAINLINE',
  theoryBurden: 'MEDIUM',
  roles: ['INITIATOR'],
  confidence: 'HIGH',
  matchedRuleIds: ['test-rule'],
  knowledge: {
    status: 'AVAILABLE',
    version: '2026-08-knowledge-v1',
    shortDescription: { text: 'A reviewed test opening.', confidence: 'HIGH' },
    strategicSummary: { text: 'Use the reviewed plan for the target side.', confidence: 'HIGH' },
    plans: [{
      id: 'test-plan',
      title: 'Test plan',
      summary: 'Keep the knowledge projection separate from deterministic ranking.',
      conditions: [],
      caveats: [],
      confidence: 'HIGH',
    }],
    matchedRuleIds: ['knowledge-test-rule'],
    sourceIds: ['project-editorial-rb-022'],
  },
};

const service = createCandidateDecisionService({
  engine: {
    async get() {
      return {
        id: 1,
        positionId: 1,
        normalizedFen: startFen,
        lines: [
          { multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 30, pvUci: ['e2e4', 'e7e5'] },
          { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 20, pvUci: ['d2d4', 'd7d5'] },
          { multipv: 3, depth: 18, moveUci: 'g2g4', scoreCpWhite: -350, pvUci: ['g2g4', 'd7d5'] },
        ],
        fromCache: true,
      };
    },
  },
  masters: {
    async get() {
      return explorer('LICHESS_MASTERS', [
        corpusMove('e2e4', 'e4', 70, 40, "King's Pawn Game"),
        corpusMove('d2d4', 'd4', 30, 17, "Queen's Pawn Game"),
      ]);
    },
  },
  population: {
    async get() {
      return explorer('LICHESS_GAMES', [
        corpusMove('d2d4', 'd4', 60, 36, "Queen's Pawn Game"),
        corpusMove('e2e4', 'e4', 40, 20, "King's Pawn Game"),
      ]);
    },
  },
  personal: {
    async get() {
      return {
        fen: startFen,
        normalizedFen: startFen,
        bookOpening: null,
        sideToMove: 'WHITE',
        fullMoveNumber: 1,
        ratedOnly: true,
        occurrences: 6,
        games: { total: 6, wins: 3, draws: 1, losses: 2, scorePct: 58.3 },
        nextMoves: [{
          moveUci: 'd2d4',
          moveSan: 'd4',
          fenAfter: startFen,
          side: 'WHITE',
          moveNumber: 1,
          occurrences: 6,
          games: { total: 6, wins: 3, draws: 1, losses: 2, scorePct: 58.3 },
        }],
        appliedFilters: {},
      };
    },
  },
  courses: {
    async get() {
      return {
        normalizedFen: startFen,
        suggestions: [{
          nodeId: 1,
          fenAfter: startFen,
          moveUci: 'e2e4',
          isUserMove: true,
          isCorrectUserMove: true,
          lineId: 1,
          lineName: 'Main line',
          chapterId: 1,
          chapterName: 'Chapter',
          courseId: 1,
          courseName: 'Course',
        }],
      };
    },
  },
  playerProfile: {
    async get() {
      return profile;
    },
  },
  classifyOpening() {
    return openingEvidence;
  },
  clock: () => new Date('2026-07-29T08:00:00.000Z'),
});

{
  const response = await service.get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target,
    candidateLimit: 2,
    includeMoveUci: 'g2g4',
  });

  assert.equal(response.contractVersion, '2026-08-v3');
  assert.equal(response.rankingPolicyVersion, '2026-08-empirical-persona-v2');
  assert.equal(response.candidates.length, 2);
  assert.equal(response.requestedMoveIncluded, true);
  assert.equal(response.sourceSummary.engine, 'AVAILABLE');
  assert.equal(response.sourceSummary.population, 'AVAILABLE');
  assert.equal(response.sourceSummary.personal, 'AVAILABLE');
  assert.equal(response.sourceSummary.courses, 'INSUFFICIENT');
  assert.equal(response.candidates.some((candidate) => candidate.moveUci === 'g2g4'), true);

  const manual = response.candidates.find((candidate) => candidate.moveUci === 'g2g4');
  assert.equal(manual.manuallyRequested, true);
  assert.equal(manual.eligibility.status, 'EXCLUDED');
  assert.equal(manual.reasonCodes.includes('MANUAL_CANDIDATE'), true);
  assert.equal(manual.warningCodes.includes('OBJECTIVE_LOSS'), true);
  assert.equal(manual.evidence.opening.knowledge.plans[0].id, 'test-plan');
  assert.deepEqual(Object.keys(manual.components).sort(), [
    'course',
    'masters',
    'objective',
    'personal',
    'population',
    'profileFit',
    'targetFit',
  ]);

  const ranked = response.candidates.find((candidate) => candidate.moveUci !== 'g2g4');
  assert.equal(ranked.evidence.population.positionBaselineScorePercentForTarget, 50);
  assert.equal(ranked.evidence.population.scoreDeltaVsPositionPercent !== undefined, true);

  const e4 = response.candidates.find((candidate) => candidate.moveUci === 'e2e4');
  if (e4) {
    assert.equal(e4.evidence.course.covered, false);
    assert.equal(e4.reasonCodes.includes('COURSE_ALREADY_COVERS'), false);
    assert.equal(e4.targetFit.status, 'ALIGNED');
    assert.equal(e4.profileFit.status, 'ALIGNED');
  }
}

{
  const nonBookFen = '8/8/8/8/8/4k3/8/4K3 w - - 0 1';
  const white = resolveCandidateOpeningEvidence(
    nonBookFen,
    { eco: 'C00', name: 'French Defense' },
    'WHITE',
  );
  const black = resolveCandidateOpeningEvidence(
    nonBookFen,
    { eco: 'C00', name: 'French Defense' },
    'BLACK',
  );

  assert.equal(white.status, 'AVAILABLE');
  assert.equal(white.knowledge.status, 'AVAILABLE');
  assert.equal(white.knowledge.version, '2026-08-knowledge-v3');
  assert.ok(white.knowledge.plans.some((plan) => plan.id === 'french-white-use-space-and-pawn-chain'));
  assert.ok(black.knowledge.plans.some((plan) => plan.id === 'french-black-undermine-centre'));
  assert.notEqual(white.knowledge.strategicSummary.text, black.knowledge.strategicSummary.text);
  assert.ok(white.knowledge.plans.length <= 3);
}

{
  const insufficient = resolveCandidateOpeningEvidence(
    '8/8/8/8/8/4k3/8/4K3 w - - 0 1',
    null,
    'WHITE',
  );

  assert.equal(insufficient.status, 'INSUFFICIENT');
  assert.deepEqual(insufficient.knowledge, {
    status: 'UNAVAILABLE',
    version: null,
    shortDescription: null,
    strategicSummary: null,
    plans: [],
    matchedRuleIds: [],
    sourceIds: [],
  });
}

await assert.rejects(
  () => service.get(42, {
    fen: 'startpos',
    decisionRole: 'OPPONENT_RESPONSE',
    target,
    candidateLimit: 2,
  }),
  CandidateDecisionRoleMismatchError,
);
