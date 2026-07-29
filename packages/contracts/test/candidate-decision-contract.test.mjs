import assert from 'node:assert/strict';
import {
  CANDIDATE_DECISION_CONTRACT_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  candidateDecisionRequestSchema,
  candidateDecisionResponseSchema,
} from '../dist/candidate-decision/index.js';
import { newCourseRepertoireTargetExample } from '../dist/repertoire-target/index.js';

const request = candidateDecisionRequestSchema.parse({
  fen: 'startpos',
  decisionRole: 'USER_MOVE',
  target: newCourseRepertoireTargetExample,
});

assert.equal(request.candidateLimit, 6);
assert.equal(request.includeMoveUci, undefined);
assert.equal(candidateDecisionRequestSchema.safeParse({
  ...request,
  includeMoveUci: 'e2e9',
}).success, false);

const unavailableCorpus = {
  status: 'UNAVAILABLE',
  games: 0,
  frequencyPercent: null,
  scorePercentForTarget: null,
  averageRating: null,
  datasetVersion: null,
  fetchedAt: null,
  representativeGameId: null,
};

const response = {
  contractVersion: CANDIDATE_DECISION_CONTRACT_VERSION,
  rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
  generatedAt: '2026-07-29T08:00:00.000Z',
  targetId: newCourseRepertoireTargetExample.targetId,
  decisionRole: 'USER_MOVE',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  normalizedFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
  sideToMove: 'WHITE',
  legalMoveCount: 20,
  returnedCandidateCount: 1,
  omittedLegalMoveCount: 19,
  requestedMoveIncluded: false,
  sourceSummary: {
    engine: 'AVAILABLE',
    masters: 'UNAVAILABLE',
    population: 'UNAVAILABLE',
    personal: 'INSUFFICIENT',
    opening: 'AVAILABLE',
    courses: 'INSUFFICIENT',
    playerProfile: 'UNAVAILABLE',
  },
  candidates: [{
    rank: 1,
    moveUci: 'e2e4',
    moveSan: 'e4',
    resultingFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    previewUci: ['e2e4', 'e7e5'],
    manuallyRequested: false,
    eligibility: {
      status: 'ELIGIBLE',
      reasonCodes: ['ENGINE_BEST'],
      warningCodes: [],
    },
    targetFit: {
      status: 'ALIGNED',
      reasonCodes: ['TARGET_CHARACTER_MATCH'],
    },
    profileFit: {
      status: 'UNKNOWN',
      reasonCodes: [],
    },
    components: {
      objective: 100,
      population: 0,
      masters: 0,
      personal: 0,
      targetFit: 40,
      profileFit: 0,
      course: 0,
    },
    reasonCodes: ['ENGINE_BEST', 'TARGET_CHARACTER_MATCH'],
    warningCodes: ['SOURCE_UNAVAILABLE'],
    coverage: null,
    evidence: {
      engine: {
        status: 'AVAILABLE',
        depth: 18,
        multipv: 1,
        scoreCpForTarget: 24,
        mateForTarget: null,
        objectiveDeltaCp: 0,
        pvUci: ['e2e4', 'e7e5'],
      },
      masters: unavailableCorpus,
      population: unavailableCorpus,
      personal: {
        status: 'INSUFFICIENT',
        occurrences: 0,
        games: 0,
        scorePercent: null,
      },
      opening: {
        status: 'AVAILABLE',
        opening: { eco: 'B00', name: "King's Pawn Game" },
        classificationVersion: '2026-07-rules-v2',
        side: 'WHITE',
        soundness: 'SOUND',
        character: ['BALANCED'],
        theoreticalStatus: 'MAINLINE',
        theoryBurden: 'MEDIUM',
        roles: ['INITIATOR'],
        confidence: 'HIGH',
        matchedRuleIds: ['family-kings-pawn'],
      },
      course: {
        status: 'INSUFFICIENT',
        covered: false,
        conflict: false,
        transposesToCoveredPosition: false,
        references: [],
      },
      playerProfile: {
        status: 'UNAVAILABLE',
        generatedAt: null,
        matches: [],
      },
    },
  }],
};

assert.deepEqual(candidateDecisionResponseSchema.parse(response), response);
assert.equal('total' in response.candidates[0].components, false);
assert.equal(candidateDecisionResponseSchema.safeParse({
  ...response,
  candidates: [{
    ...response.candidates[0],
    components: { ...response.candidates[0].components, objective: 101 },
  }],
}).success, false);
