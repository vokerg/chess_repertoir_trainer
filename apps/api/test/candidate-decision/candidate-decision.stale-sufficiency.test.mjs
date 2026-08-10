import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const target = {
  ...newCourseRepertoireTargetExample,
  coverage: {
    ...newCourseRepertoireTargetExample.coverage,
    minimumPopulationGames: 50,
  },
  objective: {
    ...newCourseRepertoireTargetExample.objective,
    persona: 'BALANCED',
  },
};

function move(uci, san, games, whiteWins) {
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
    opening: null,
    representativeGame: null,
  };
}

function stalePopulation(moves) {
  const total = moves.reduce((sum, item) => sum + item.games.total, 0);
  const whiteWins = moves.reduce((sum, item) => sum + item.games.whiteWins, 0);
  return {
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
      status: 'STALE',
      fetchedAt: '2026-08-01T08:00:00.000Z',
      expiresAt: '2026-08-02T08:00:00.000Z',
    },
    opening: null,
    games: {
      total,
      whiteWins,
      draws: 0,
      blackWins: total - whiteWins,
    },
    moves,
    topGames: [],
  };
}

function serviceFor(population) {
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
  const response = await serviceFor(stalePopulation([
    move('d2d4', 'd4', 60, 36),
    move('e2e4', 'e4', 40, 24),
  ])).get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target,
    candidateLimit: 2,
  });

  assert.equal(response.sourceSummary.population, 'STALE');
  const d4 = response.candidates.find((candidate) => candidate.moveUci === 'd2d4');
  const e4 = response.candidates.find((candidate) => candidate.moveUci === 'e2e4');
  assert.ok(d4);
  assert.ok(e4);
  assert.equal(d4.evidence.population.status, 'STALE');
  assert.equal(e4.evidence.population.status, 'INSUFFICIENT');
  assert.equal(e4.components.population, 0);
}

{
  const response = await serviceFor(stalePopulation([
    move('e2e4', 'e4', 40, 24),
  ])).get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target,
    candidateLimit: 1,
  });

  assert.equal(response.sourceSummary.population, 'INSUFFICIENT');
  assert.equal(response.candidates[0].evidence.population.status, 'INSUFFICIENT');
}
