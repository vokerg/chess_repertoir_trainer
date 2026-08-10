import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const population = {
  fen: startFen,
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
    status: 'FRESH',
    fetchedAt: '2026-08-10T06:00:00.000Z',
    expiresAt: '2026-08-11T06:00:00.000Z',
  },
  opening: null,
  games: {
    total: 15,
    whiteWins: 9,
    draws: 0,
    blackWins: 6,
  },
  moves: [{
    uci: 'e2e4',
    san: 'e4',
    averageRating: 1800,
    games: {
      total: 15,
      whiteWins: 9,
      draws: 0,
      blackWins: 6,
    },
    opening: null,
    representativeGame: null,
  }],
  topGames: [],
};

function target(persona) {
  return {
    ...newCourseRepertoireTargetExample,
    coverage: {
      ...newCourseRepertoireTargetExample.coverage,
      minimumPopulationGames: 5,
    },
    objective: {
      ...newCourseRepertoireTargetExample.objective,
      persona,
    },
  };
}

function service() {
  return createCandidateDecisionService({
    engine: { async get() { return null; } },
    masters: { async get() { throw new Error('masters unavailable'); } },
    population: { async get() { return population; } },
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
}

{
  const response = await service().get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target: target('BALANCED'),
    candidateLimit: 1,
  });

  assert.equal(response.sourceSummary.population, 'INSUFFICIENT');
  assert.equal(response.candidates[0].evidence.population.status, 'INSUFFICIENT');
  assert.equal(response.candidates[0].components.population, 0);
}

{
  const response = await service().get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target: target('CUSTOM'),
    candidateLimit: 1,
  });

  assert.equal(response.sourceSummary.population, 'AVAILABLE');
  assert.equal(response.candidates[0].evidence.population.status, 'AVAILABLE');
}

console.log('Candidate Decision empirical API sample-floor tests passed.');
