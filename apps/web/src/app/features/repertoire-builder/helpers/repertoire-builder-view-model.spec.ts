import type {
  CandidateDecisionCandidate,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import {
  buildRepertoireBuilderEvidenceReference,
  buildRepertoireBuilderSourceItems,
} from './repertoire-builder-view-model';

describe('repertoire builder opening knowledge view model', () => {
  it('renders the target-side summary and bounded plans in focused evidence', () => {
    const items = buildRepertoireBuilderSourceItems(candidate);

    expect(items.find((item) => item.id === 'opening-knowledge')).toEqual(jasmine.objectContaining({
      label: 'Opening knowledge · Black',
      status: 'PARTIAL',
      detail: 'Counter in the centre before White consolidates.',
    }));
    expect(items.find((item) => item.id === 'opening-plan-french-black-break')).toEqual(jasmine.objectContaining({
      label: 'Challenge the centre',
      status: 'HIGH confidence',
    }));
    expect(items.find((item) => item.id === 'opening-plan-french-black-break')?.detail).toContain('When: White retains the pawn chain.');
    expect(items.find((item) => item.id === 'opening-plan-french-black-break')?.detail).toContain('Caveat: Exchange structures need a different plan.');
  });

  it('snapshots available evidence versions even when the first candidate lacks them', () => {
    const unavailableFirst = {
      ...candidate,
      moveUci: 'd7d6',
      evidence: {
        ...candidate.evidence,
        masters: { ...candidate.evidence.masters, datasetVersion: null },
        population: { ...candidate.evidence.population, datasetVersion: null },
        opening: {
          ...candidate.evidence.opening,
          classificationVersion: null,
          knowledge: { ...candidate.evidence.opening.knowledge, version: null },
        },
        playerProfile: { ...candidate.evidence.playerProfile, generatedAt: null },
      },
    } as CandidateDecisionCandidate;
    const reference = buildRepertoireBuilderEvidenceReference({
      ...response,
      candidates: [unavailableFirst, candidate],
    });

    expect(reference.sourceVersions['mastersDataset']).toBe('test-v1');
    expect(reference.sourceVersions['populationDataset']).toBe('test-v1');
    expect(reference.sourceVersions['openingClassification']).toBe('2026-07-rules-v2');
    expect(reference.sourceVersions['openingKnowledge']).toBe('2026-08-knowledge-v1');
    expect(reference.candidateContractVersion).toBe('2026-08-v2');
  });
});

const candidate = {
  rank: 1,
  moveUci: 'e7e6',
  moveSan: 'e6',
  resultingFen: 'test-fen',
  previewUci: ['e7e6'],
  manuallyRequested: false,
  eligibility: { status: 'ELIGIBLE', reasonCodes: [], warningCodes: [] },
  targetFit: { status: 'NEUTRAL', reasonCodes: [] },
  profileFit: { status: 'NEUTRAL', reasonCodes: [] },
  components: {
    objective: 0,
    population: 0,
    masters: 0,
    personal: 0,
    targetFit: 0,
    profileFit: 0,
    course: 0,
  },
  reasonCodes: [],
  warningCodes: [],
  coverage: null,
  evidence: {
    engine: {
      status: 'AVAILABLE',
      depth: 16,
      multipv: 1,
      scoreCpForTarget: 0,
      mateForTarget: null,
      objectiveDeltaCp: 0,
      pvUci: ['e7e6'],
    },
    masters: corpus(),
    population: corpus(),
    personal: { status: 'INSUFFICIENT', occurrences: 0, games: 0, scorePercent: null },
    opening: {
      status: 'AVAILABLE',
      opening: { eco: 'C00', name: 'French Defense' },
      classificationVersion: '2026-07-rules-v2',
      side: 'BLACK',
      soundness: 'SOUND',
      character: ['BALANCED'],
      theoreticalStatus: 'MAINLINE',
      theoryBurden: 'MEDIUM',
      roles: ['RESPONDER'],
      confidence: 'HIGH',
      matchedRuleIds: ['family-french-defense'],
      knowledge: {
        status: 'PARTIAL',
        version: '2026-08-knowledge-v1',
        shortDescription: { text: 'A resilient defence.', confidence: 'HIGH' },
        strategicSummary: { text: 'Counter in the centre before White consolidates.', confidence: 'HIGH' },
        plans: [{
          id: 'french-black-break',
          title: 'Challenge the centre',
          summary: 'Prepare the thematic central break.',
          conditions: ['White retains the pawn chain.'],
          caveats: ['Exchange structures need a different plan.'],
          confidence: 'HIGH',
        }],
        matchedRuleIds: ['knowledge-family-french-defense'],
        sourceIds: ['project-editorial-rb-022'],
      },
    },
    course: {
      status: 'INSUFFICIENT',
      covered: false,
      conflict: false,
      transposesToCoveredPosition: false,
      references: [],
    },
    playerProfile: { status: 'INSUFFICIENT', generatedAt: null, matches: [] },
  },
} as CandidateDecisionCandidate;

const response = {
  contractVersion: '2026-08-v2',
  rankingPolicyVersion: '2026-07-deterministic-v1',
  generatedAt: '2026-08-02T08:00:00.000Z',
  targetId: '00000000-0000-4000-8000-000000000010',
  decisionRole: 'OPPONENT_RESPONSE',
  fen: 'test-fen',
  normalizedFen: 'test-normalized-fen',
  sideToMove: 'BLACK',
  legalMoveCount: 1,
  returnedCandidateCount: 1,
  omittedLegalMoveCount: 0,
  requestedMoveIncluded: false,
  sourceSummary: {
    engine: 'AVAILABLE',
    masters: 'AVAILABLE',
    population: 'AVAILABLE',
    personal: 'INSUFFICIENT',
    opening: 'AVAILABLE',
    courses: 'INSUFFICIENT',
    playerProfile: 'INSUFFICIENT',
  },
  candidates: [candidate],
} as CandidateDecisionResponse;

function corpus() {
  return {
    status: 'AVAILABLE' as const,
    games: 10,
    frequencyPercent: 50,
    scorePercentForTarget: 50,
    averageRating: 1800,
    datasetVersion: 'test-v1',
    fetchedAt: '2026-08-02T08:00:00.000Z',
    representativeGameId: null,
  };
}
