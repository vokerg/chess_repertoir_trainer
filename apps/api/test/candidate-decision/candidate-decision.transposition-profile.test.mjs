import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const chess = new Chess();
chess.move('e4');
const e4Fen = chess.fen();

const target = {
  ...newCourseRepertoireTargetExample,
  objective: {
    ...newCourseRepertoireTargetExample.objective,
    preferredCharacters: ['SHARP'],
  },
};

const population = {
  fen: 'startpos',
  normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  dataset: {
    source: 'LICHESS_GAMES',
    profileVersion: 1,
    sinceYear: 0,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 0,
  },
  cache: {
    status: 'HIT',
    fetchedAt: '2026-07-20T08:00:00.000Z',
    expiresAt: '2026-08-20T08:00:00.000Z',
  },
  opening: null,
  games: { total: 100, whiteWins: 50, draws: 0, blackWins: 50 },
  moves: [
    {
      uci: 'e2e4',
      san: 'e4',
      averageRating: 1800,
      games: { total: 60, whiteWins: 33, draws: 0, blackWins: 27 },
      opening: { eco: 'B00', name: "King's Pawn Game" },
      representativeGame: null,
    },
    {
      uci: 'd2d4',
      san: 'd4',
      averageRating: 1800,
      games: { total: 40, whiteWins: 20, draws: 0, blackWins: 20 },
      opening: { eco: 'A40', name: "Queen's Pawn Game" },
      representativeGame: null,
    },
  ],
  topGames: [],
};

const service = createCandidateDecisionService({
  engine: {
    async get() {
      return {
        id: 1,
        positionId: 1,
        normalizedFen: population.normalizedFen,
        lines: [
          { multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 25, pvUci: ['e2e4', 'e7e5'] },
          { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 20, pvUci: ['d2d4', 'd7d5'] },
        ],
        fromCache: true,
      };
    },
  },
  masters: { async get() { throw new Error('not configured'); } },
  population: { async get() { return population; } },
  personal: { async get() { throw new Error('not configured'); } },
  courses: {
    async get() {
      return {
        normalizedFen: population.normalizedFen,
        suggestions: [{
          nodeId: 2,
          fenAfter: e4Fen,
          moveUci: 'd2d4',
          isUserMove: true,
          isCorrectUserMove: true,
          lineId: 2,
          lineName: 'Existing line',
          chapterId: 2,
          chapterName: 'Existing chapter',
          courseId: 2,
          courseName: 'Existing course',
        }],
      };
    },
  },
  playerProfile: {
    async get() {
      return {
        generatedAt: '2026-07-29T09:00:00.000Z',
        coverage: { totalGames: 50 },
        preference: { items: [] },
        performance: {
          items: [{
            dimension: 'CHARACTER',
            value: 'SHARP',
            games: 30,
            scoreDelta: -10,
            resultEvidenceStrength: 'HIGH',
          }],
        },
      };
    },
  },
  classifyOpening(_fen, _hint, side) {
    return {
      status: 'AVAILABLE',
      opening: { eco: 'B00', name: 'Sharp test opening' },
      classificationVersion: '2026-07-rules-v2',
      side,
      soundness: 'SOUND',
      character: ['SHARP'],
      theoreticalStatus: 'MAINLINE',
      theoryBurden: 'MEDIUM',
      roles: ['INITIATOR'],
      confidence: 'HIGH',
      matchedRuleIds: ['sharp-test'],
      knowledge: {
        status: 'AVAILABLE',
        version: '2026-08-knowledge-v1',
        shortDescription: { text: 'A sharp reviewed opening.', confidence: 'HIGH' },
        strategicSummary: { text: 'Create active play without changing the ranking policy.', confidence: 'HIGH' },
        plans: [{
          id: 'sharp-test-plan',
          title: 'Create active play',
          summary: 'Use development and open lines to maintain the initiative.',
          conditions: [],
          caveats: [],
          confidence: 'HIGH',
        }],
        matchedRuleIds: ['knowledge-sharp-test'],
        sourceIds: ['project-editorial-rb-022'],
      },
    };
  },
  clock: () => new Date('2026-07-29T09:00:00.000Z'),
});

const response = await service.get(42, {
  fen: 'startpos',
  decisionRole: 'USER_MOVE',
  target,
  candidateLimit: 2,
});

const e4 = response.candidates.find((candidate) => candidate.moveUci === 'e2e4');
assert.ok(e4);
assert.equal(e4.targetFit.status, 'ALIGNED');
assert.equal(e4.targetFit.reasonCodes.includes('TARGET_CHARACTER_MATCH'), true);
assert.equal(e4.profileFit.status, 'CONFLICT');
assert.equal(e4.profileFit.reasonCodes.includes('PROFILE_PERFORMANCE_WARNING'), true);
assert.equal(e4.evidence.course.conflict, true);
assert.equal(e4.evidence.course.transposesToCoveredPosition, true);
assert.equal(e4.evidence.opening.knowledge.plans[0].id, 'sharp-test-plan');
assert.equal(e4.reasonCodes.includes('TRANSPOSES_TO_COVERAGE'), true);
assert.equal(e4.warningCodes.includes('COURSE_CONFLICT'), true);
