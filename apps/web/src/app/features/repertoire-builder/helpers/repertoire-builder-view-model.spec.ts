import {
  CANDIDATE_DECISION_CONTRACT_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  type CandidateDecisionCandidate,
  type CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import {
  buildRepertoireBuilderEvidenceReference,
  buildRepertoireBuilderSourceItems,
  reasonLabel,
} from './repertoire-builder-view-model';

describe('repertoire builder evidence view model', () => {
  it('keeps source availability separate from opening identity and strategic knowledge', () => {
    const items = buildRepertoireBuilderSourceItems(candidate);

    expect(items.find((item) => item.id === 'population')?.detail).toBe(
      '29.8M games · 50% frequency · 50% score',
    );
    expect(items.some((item) => item.id === 'engine')).toBeFalse();
    expect(items.some((item) => item.id === 'course')).toBeFalse();
    expect(items.some((item) => item.id === 'opening')).toBeFalse();
    expect(items.some((item) => item.id === 'opening-knowledge')).toBeFalse();
    expect(items.some((item) => item.id.startsWith('opening-plan-'))).toBeFalse();
    expect(items.map((item) => item.id)).toEqual(['population', 'masters', 'personal', 'profile']);
  });

  it('labels the V2 strong-population reason as position-relative evidence', () => {
    expect(reasonLabel('POPULATION_STRONG_SCORE')).toBe(
      'Outperforms the position baseline in the selected population',
    );
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
    expect(reference.candidateContractVersion).toBe(CANDIDATE_DECISION_CONTRACT_VERSION);
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
    population: { ...corpus(), games: 29_846_453 },
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
        strategicSummary: {
          text: 'Counter in the centre before White consolidates.',
          confidence: 'HIGH',
        },
        plans: [
          {
            id: 'french-black-break',
            title: 'Challenge the centre',
            summary: 'Prepare the thematic central break.',
            conditions: ['White retains the pawn chain.'],
            caveats: ['Exchange structures need a different plan.'],
            confidence: 'HIGH',
          },
        ],
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
  contractVersion: CANDIDATE_DECISION_CONTRACT_VERSION,
  rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
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
    positionBaselineScorePercentForTarget: 50,
    scoreDeltaVsPositionPercent: 0,
    averageRating: 1800,
    datasetVersion: 'test-v1',
    fetchedAt: '2026-08-02T08:00:00.000Z',
    representativeGameId: null,
  };
}
