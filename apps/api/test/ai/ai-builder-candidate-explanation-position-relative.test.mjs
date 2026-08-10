import assert from 'node:assert/strict';
import { buildCandidateExplanationContext } from '../../dist/modules/ai/repertoire-builder/candidate-explanation/candidate-explanation-context.js';

const candidate = {
  rank: 1,
  moveUci: 'e2e4',
  moveSan: 'e4',
  resultingFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  previewUci: ['e2e4'],
  manuallyRequested: false,
  eligibility: { status: 'ELIGIBLE', reasonCodes: ['POPULATION_STRONG_SCORE'], warningCodes: [] },
  targetFit: { status: 'NEUTRAL', reasonCodes: [] },
  profileFit: { status: 'UNKNOWN', reasonCodes: [] },
  components: {
    objective: 90,
    population: 70,
    masters: 40,
    personal: 0,
    targetFit: 0,
    profileFit: 0,
    course: 0,
  },
  reasonCodes: ['POPULATION_STRONG_SCORE'],
  warningCodes: [],
  coverage: null,
  evidence: {
    engine: {
      status: 'AVAILABLE',
      depth: 18,
      multipv: 1,
      scoreCpForTarget: 25,
      mateForTarget: null,
      objectiveDeltaCp: 20,
      pvUci: ['e2e4'],
    },
    population: {
      status: 'STALE',
      games: 200,
      frequencyPercent: 18,
      scorePercentForTarget: 47,
      positionBaselineScorePercentForTarget: 42,
      scoreDeltaVsPositionPercent: 5,
      averageRating: 1800,
      datasetVersion: 'population-v1',
      fetchedAt: '2026-08-10T05:00:00.000Z',
      representativeGameId: null,
    },
    masters: {
      status: 'AVAILABLE',
      games: 80,
      frequencyPercent: 9,
      scorePercentForTarget: 46,
      positionBaselineScorePercentForTarget: 44,
      scoreDeltaVsPositionPercent: 2,
      averageRating: 2400,
      datasetVersion: 'masters-v1',
      fetchedAt: '2026-08-10T05:00:00.000Z',
      representativeGameId: null,
    },
    personal: { status: 'INSUFFICIENT', occurrences: 0, games: 0, scorePercent: null },
    opening: {
      status: 'INSUFFICIENT',
      opening: null,
      classificationVersion: null,
      side: 'WHITE',
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
    },
    course: {
      status: 'INSUFFICIENT',
      covered: false,
      conflict: false,
      transposesToCoveredPosition: false,
      references: [],
    },
    playerProfile: { status: 'UNAVAILABLE', generatedAt: null, matches: [] },
  },
};

const response = {
  sourceSummary: {
    engine: 'AVAILABLE',
    masters: 'AVAILABLE',
    population: 'STALE',
    personal: 'INSUFFICIENT',
    opening: 'INSUFFICIENT',
    courses: 'INSUFFICIENT',
    playerProfile: 'UNAVAILABLE',
  },
};

const context = buildCandidateExplanationContext(response, candidate, null);
const byId = new Map(context.facts.map((fact) => [fact.id, fact]));

assert.equal(byId.get('source.population')?.missing, false);
assert.equal(byId.get('selected.population_status')?.missing, false);
assert.equal(byId.get('selected.engine_objective_delta')?.value, '20 cp');
assert.equal(byId.get('selected.population_position_baseline_score')?.value, '42%');
assert.equal(byId.get('selected.population_score_delta_vs_position')?.value, '+5 pp');
assert.equal(byId.get('selected.masters_position_baseline_score')?.value, '44%');
assert.equal(byId.get('selected.masters_score_delta_vs_position')?.value, '+2 pp');

const explanation = {
  summary: 'The population score is 5 percentage points above the position baseline.',
  tradeoffs: [],
  evidenceReferenceIds: [
    'selected.population_score_delta_vs_position',
    'selected.population_position_baseline_score',
  ],
  missingEvidenceReferenceId: null,
};

assert.deepEqual(context.reconcile(explanation), explanation);
assert.deepEqual(
  context.referencedFacts(explanation).map((fact) => fact.id),
  explanation.evidenceReferenceIds,
);

const engineExplanation = {
  summary: 'The objective delta is 20 centipawns.',
  tradeoffs: [],
  evidenceReferenceIds: ['selected.engine_objective_delta'],
  missingEvidenceReferenceId: null,
};
assert.deepEqual(context.reconcile(engineExplanation), engineExplanation);

assert.throws(
  () => context.reconcile({
    summary: 'The score is 47%.',
    tradeoffs: [],
    evidenceReferenceIds: ['selected.move'],
    missingEvidenceReferenceId: null,
  }),
  (error) => error?.code === 'AI_INVALID_RESPONSE',
);

const comparison = structuredClone(candidate);
comparison.rank = 2;
comparison.moveUci = 'd2d4';
comparison.moveSan = 'd4';
comparison.resultingFen = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1';
comparison.previewUci = ['d2d4'];
comparison.evidence.population.frequencyPercent = 12;
const comparisonContext = buildCandidateExplanationContext(response, candidate, comparison);
const frequencyComparison = {
  summary: 'The selected population frequency is higher.',
  tradeoffs: [],
  evidenceReferenceIds: ['selected.population_frequency', 'comparison.population_frequency'],
  missingEvidenceReferenceId: null,
};
assert.deepEqual(comparisonContext.reconcile(frequencyComparison), frequencyComparison);

console.log('AI Builder position-relative candidate explanation tests passed.');
