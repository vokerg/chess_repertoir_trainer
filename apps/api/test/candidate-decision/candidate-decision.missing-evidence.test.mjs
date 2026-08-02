import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

function unavailable() {
  throw new Error('provider unavailable');
}

const service = createCandidateDecisionService({
  engine: { get: unavailable },
  masters: { get: unavailable },
  population: { get: unavailable },
  personal: { get: unavailable },
  courses: { get: unavailable },
  playerProfile: { get: unavailable },
  classifyOpening(_fen, _hint, side) {
    return {
      status: 'INSUFFICIENT',
      opening: null,
      classificationVersion: null,
      side,
      soundness: null,
      character: [],
      theoreticalStatus: null,
      theoryBurden: null,
      roles: [],
      confidence: null,
      matchedRuleIds: [],
      knowledge: {
        status: 'UNAVAILABLE',
        version: null,
        shortDescription: null,
        strategicSummary: null,
        plans: [],
        matchedRuleIds: [],
        sourceIds: [],
      },
    };
  },
  clock: () => new Date('2026-07-29T09:00:00.000Z'),
});

const response = await service.get(42, {
  fen: 'startpos',
  decisionRole: 'USER_MOVE',
  target: newCourseRepertoireTargetExample,
  candidateLimit: 2,
});

assert.equal(response.candidates.length, 2);
assert.equal(response.legalMoveCount, 20);
assert.equal(response.omittedLegalMoveCount, 18);
assert.deepEqual(response.sourceSummary, {
  engine: 'UNAVAILABLE',
  masters: 'UNAVAILABLE',
  population: 'UNAVAILABLE',
  personal: 'UNAVAILABLE',
  opening: 'INSUFFICIENT',
  courses: 'UNAVAILABLE',
  playerProfile: 'UNAVAILABLE',
});
for (const candidate of response.candidates) {
  assert.equal(candidate.reasonCodes.includes('LOW_EVIDENCE'), true);
  assert.equal(candidate.warningCodes.includes('SOURCE_UNAVAILABLE'), true);
  assert.equal(candidate.evidence.personal.games, 0);
  assert.equal(candidate.evidence.opening.knowledge.status, 'UNAVAILABLE');
  assert.equal(candidate.profileFit.status, 'UNKNOWN');
}
