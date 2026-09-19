import assert from 'node:assert/strict';
import { newCourseRepertoireTargetExample } from '@chess-trainer/contracts/repertoire-target';
import {
  createCandidateDecisionService,
  resolveCandidateOpeningEvidence,
} from '../../dist/modules/candidate-decision/candidate-decision.service.js';
import { OpeningLookupService } from '../../dist/services/opening-book/openingLookupService.js';
import { OpeningClassificationService } from '../../dist/services/opening-book/openingClassificationService.js';

const parentFen = 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2';
const steinitzFen = 'rnbqkbnr/pp2pppp/8/2pp4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 0 3';
const parent = OpeningLookupService.lookupByFen(parentFen);

assert.ok(parent);
assert.equal(parent.name, "Queen's Pawn Game: Accelerated London System");

const parentClassification = OpeningClassificationService.classify(parent);
assert.ok(parentClassification.matchedRuleIds.includes('family-london-system'));
assert.ok(parentClassification.white.character.includes('SOLID'));

const exactChild = resolveCandidateOpeningEvidence(steinitzFen, null, 'WHITE', parent);
assert.equal(exactChild.status, 'AVAILABLE');
assert.equal(
  exactChild.opening?.name,
  "Queen's Pawn Game: Accelerated London System, Steinitz Countergambit",
);
assert.equal(exactChild.knowledge.status, 'AVAILABLE');
assert.ok(exactChild.matchedRuleIds.includes('family-london-system'));

function unavailable() {
  throw new Error('provider unavailable');
}

const population = {
  fen: parentFen,
  normalizedFen: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq -',
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
    fetchedAt: '2026-08-08T05:00:00.000Z',
    expiresAt: '2026-08-08T06:00:00.000Z',
  },
  opening: null,
  games: { total: 20, whiteWins: 8, draws: 4, blackWins: 8 },
  moves: [{
    uci: 'e7e6',
    san: 'e6',
    averageRating: 1600,
    games: { total: 20, whiteWins: 8, draws: 4, blackWins: 8 },
    opening: null,
    representativeGame: null,
  }],
  topGames: [],
};

const service = createCandidateDecisionService({
  engine: { get: unavailable },
  masters: { get: unavailable },
  population: {
    async get() {
      return population;
    },
  },
  personal: { get: unavailable },
  playerProfile: { get: unavailable },
  clock: () => new Date('2026-08-08T05:00:00.000Z'),
});

const response = await service.get(42, {
  fen: parentFen,
  decisionRole: 'OPPONENT_RESPONSE',
  target: newCourseRepertoireTargetExample,
  candidateLimit: 1,
});

assert.equal(response.candidates.length, 1);
const e6 = response.candidates[0];
assert.equal(e6.moveUci, 'e7e6');
assert.equal(e6.evidence.opening.status, 'AVAILABLE');
assert.equal(e6.evidence.opening.opening?.name, "Queen's Pawn Game: Accelerated London System");
assert.ok(e6.evidence.opening.matchedRuleIds.includes('family-london-system'));
assert.equal(e6.evidence.opening.knowledge.status, 'AVAILABLE');
assert.ok(
  e6.evidence.opening.knowledge.plans.some(
    (plan) => plan.id === 'london-white-complete-setup-then-adapt',
  ),
);
