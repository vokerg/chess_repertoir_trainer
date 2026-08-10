import assert from 'node:assert/strict';
import { alternatePersonaRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import { createCandidateDecisionService } from '../../dist/modules/candidate-decision/candidate-decision.service.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function move(uci, san, games, scorePercent) {
  const whiteWins = Math.round((games * scorePercent) / 100);
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
  const games = moves.reduce((total, candidate) => ({
    total: total.total + candidate.games.total,
    whiteWins: total.whiteWins + candidate.games.whiteWins,
    draws: total.draws + candidate.games.draws,
    blackWins: total.blackWins + candidate.games.blackWins,
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
      fetchedAt: '2026-08-09T08:00:00.000Z',
      expiresAt: '2026-09-08T08:00:00.000Z',
    },
    opening: null,
    games,
    moves,
    topGames: [],
  };
}

const populationMoves = [
  move('e2e4', 'e4', 220, 50),
  move('d2d4', 'd4', 190, 51),
  move('g1f3', 'Nf3', 160, 50),
  move('c2c4', 'c4', 140, 52),
  move('g2g3', 'g3', 110, 50),
  move('b2b3', 'b3', 90, 51),
  move('b1c3', 'Nc3', 70, 50),
  move('f2f4', 'f4', 55, 52),
  move('h2h3', 'h3', 40, 70),
  move('a2a3', 'a3', 30, 50),
  move('c2c3', 'c3', 25, 50),
  move('d2d3', 'd3', 20, 50),
];

const mastersMoves = [
  move('e2e4', 'e4', 500, 52),
  move('d2d4', 'd4', 450, 52),
  move('g1f3', 'Nf3', 250, 51),
  move('c2c4', 'c4', 180, 51),
  move('g2g3', 'g3', 80, 50),
  move('h2h3', 'h3', 12, 50),
];

const service = createCandidateDecisionService({
  engine: {
    async get() {
      return {
        id: 1,
        positionId: 1,
        normalizedFen: startFen,
        lines: [
          { multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 25, pvUci: ['e2e4'] },
          { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 20, pvUci: ['d2d4'] },
          { multipv: 3, depth: 18, moveUci: 'g1f3', scoreCpWhite: 18, pvUci: ['g1f3'] },
        ],
        fromCache: true,
      };
    },
  },
  masters: {
    async get() {
      return explorer('LICHESS_MASTERS', mastersMoves);
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
        fen: startFen,
        normalizedFen: startFen,
        bookOpening: null,
        sideToMove: 'WHITE',
        fullMoveNumber: 1,
        ratedOnly: true,
        occurrences: 0,
        games: { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null },
        nextMoves: [],
        appliedFilters: {},
      };
    },
  },
  playerProfile: {
    async get() {
      throw new Error('profile intentionally unavailable');
    },
  },
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
  clock: () => new Date('2026-08-09T10:00:00.000Z'),
});

const target = {
  ...alternatePersonaRepertoireTargetExample,
  startingPoint: { kind: 'INITIAL_POSITION' },
};

const response = await service.get(42, {
  fen: 'startpos',
  decisionRole: 'USER_MOVE',
  target,
  candidateLimit: 8,
});

assert.equal(response.contractVersion, '2026-08-v3');
assert.equal(response.rankingPolicyVersion, '2026-08-empirical-persona-v2');
assert.equal(response.candidates.length, 8);

const uncommon = response.candidates.find((candidate) => candidate.moveUci === 'h2h3');
assert.ok(uncommon, 'Surprise must be able to discover a supported move beyond the default first eight population seeds.');
assert.equal(uncommon.evidence.population.status, 'AVAILABLE');
assert.ok(uncommon.evidence.population.scoreDeltaVsPositionPercent > 10);
assert.equal(uncommon.evidence.engine.status, 'INSUFFICIENT');
assert.equal(uncommon.warningCodes.includes('OBJECTIVE_EVIDENCE_MISSING'), true);
