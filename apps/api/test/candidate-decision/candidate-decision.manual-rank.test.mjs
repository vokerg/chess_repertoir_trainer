import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const service = createCandidateDecisionService({
  engine: {
    async get() {
      return {
        id: 1,
        positionId: 1,
        normalizedFen: startFen,
        lines: [
          { multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 30, pvUci: ['e2e4'] },
          { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 20, pvUci: ['d2d4'] },
          { multipv: 3, depth: 18, moveUci: 'g2g4', scoreCpWhite: -350, pvUci: ['g2g4'] },
        ],
        fromCache: true,
      };
    },
  },
  masters: { async get() { throw new Error('masters unavailable'); } },
  population: { async get() { throw new Error('population unavailable'); } },
  personal: { async get() { throw new Error('personal unavailable'); } },
  playerProfile: { async get() { throw new Error('profile unavailable'); } },
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
  clock: () => new Date('2026-08-10T06:30:00.000Z'),
});

const response = await service.get(42, {
  fen: 'startpos',
  decisionRole: 'USER_MOVE',
  target: {
    ...newCourseRepertoireTargetExample,
    objective: {
      ...newCourseRepertoireTargetExample.objective,
      persona: 'BALANCED',
    },
  },
  candidateLimit: 2,
  includeMoveUci: 'g2g4',
});

assert.deepEqual(response.candidates.map((candidate) => candidate.moveUci), ['e2e4', 'g2g4']);
assert.deepEqual(response.candidates.map((candidate) => candidate.rank), [1, 3]);
assert.equal(response.candidates[1].manuallyRequested, true);
assert.equal(response.candidates[1].eligibility.status, 'EXCLUDED');

console.log('Candidate Decision manual deterministic rank tests passed.');
