import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function corpusMove(uci, san, games, whiteWins) {
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

function explorer(source, moves) {
  const games = moves.reduce((total, move) => ({
    total: total.total + move.games.total,
    whiteWins: total.whiteWins + move.games.whiteWins,
    draws: total.draws + move.games.draws,
    blackWins: total.blackWins + move.games.blackWins,
  }), { total: 0, whiteWins: 0, draws: 0, blackWins: 0 });
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
      fetchedAt: '2026-08-10T04:00:00.000Z',
      expiresAt: '2026-09-09T04:00:00.000Z',
    },
    opening: null,
    games,
    moves,
    topGames: [],
  };
}

const population = explorer('LICHESS_GAMES', [
  corpusMove('e2e4', 'e4', 100, 50),
  corpusMove('d2d4', 'd4', 90, 48),
  corpusMove('g1f3', 'Nf3', 80, 42),
]);
const masters = explorer('LICHESS_MASTERS', [
  corpusMove('e2e4', 'e4', 100, 52),
  corpusMove('d2d4', 'd4', 90, 47),
  corpusMove('g1f3', 'Nf3', 80, 41),
]);

function unavailable() {
  throw new Error('source unavailable');
}

function classifyOpening(_fen, _hint, side) {
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
}

function serviceFor(lines) {
  return createCandidateDecisionService({
    engine: {
      async get() {
        return {
          id: 1,
          positionId: 1,
          normalizedFen: startFen,
          lines,
          fromCache: true,
        };
      },
    },
    masters: { async get() { return masters; } },
    population: { async get() { return population; } },
    personal: { get: unavailable },
    playerProfile: { get: unavailable },
    classifyOpening,
    clock: () => new Date('2026-08-10T04:05:00.000Z'),
  });
}

{
  const service = serviceFor([
    { multipv: 1, depth: 8, moveUci: 'e2e4', scoreCpWhite: 100, pvUci: ['e2e4'] },
    { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 30, pvUci: ['d2d4'] },
    { multipv: 3, depth: 18, moveUci: 'g1f3', scoreCpWhite: 20, pvUci: ['g1f3'] },
  ]);
  const response = await service.get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target: newCourseRepertoireTargetExample,
    candidateLimit: 3,
  });

  assert.equal(response.sourceSummary.engine, 'AVAILABLE');
  const shallow = response.candidates.find((candidate) => candidate.moveUci === 'e2e4');
  const deepBest = response.candidates.find((candidate) => candidate.moveUci === 'd2d4');
  const deepSecond = response.candidates.find((candidate) => candidate.moveUci === 'g1f3');
  assert.ok(shallow);
  assert.ok(deepBest);
  assert.ok(deepSecond);
  assert.equal(shallow.evidence.engine.status, 'INSUFFICIENT');
  assert.equal(shallow.evidence.engine.objectiveDeltaCp, null);
  assert.equal(shallow.warningCodes.includes('OBJECTIVE_EVIDENCE_MISSING'), true);
  assert.equal(shallow.warningCodes.includes('LOW_ENGINE_DEPTH'), true);
  assert.equal(deepBest.evidence.engine.status, 'AVAILABLE');
  assert.equal(deepBest.evidence.engine.objectiveDeltaCp, 0);
  assert.equal(deepSecond.evidence.engine.status, 'AVAILABLE');
  assert.equal(deepSecond.evidence.engine.objectiveDeltaCp, 10);
}

{
  const service = serviceFor([
    { multipv: 1, moveUci: 'e2e4', scoreCpWhite: 50, pvUci: ['e2e4'] },
  ]);
  const response = await service.get(42, {
    fen: 'startpos',
    decisionRole: 'USER_MOVE',
    target: newCourseRepertoireTargetExample,
    candidateLimit: 1,
    includeMoveUci: 'e2e4',
  });
  const candidate = response.candidates[0];

  assert.equal(response.sourceSummary.engine, 'INSUFFICIENT');
  assert.equal(candidate.evidence.engine.status, 'INSUFFICIENT');
  assert.equal(candidate.evidence.engine.objectiveDeltaCp, null);
  assert.equal(candidate.warningCodes.includes('OBJECTIVE_EVIDENCE_MISSING'), true);
}
