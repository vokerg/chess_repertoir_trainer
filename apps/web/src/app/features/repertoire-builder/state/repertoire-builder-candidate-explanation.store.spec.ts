import { TestBed } from '@angular/core/testing';
import type {
  AiBuilderCandidateExplanationResponse,
  AiCapabilitiesResponse,
} from '@chess-trainer/contracts/ai';
import {
  CANDIDATE_DECISION_CONTRACT_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  type CandidateDecisionCandidate,
  type CandidateDecisionRequest,
  type CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import { of, Subject } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { RepertoireBuilderAiApiService } from '../data-access/repertoire-builder-ai-api.service';
import { RepertoireBuilderCandidateExplanationStore } from './repertoire-builder-candidate-explanation.store';

describe('RepertoireBuilderCandidateExplanationStore', () => {
  let capabilities: jasmine.SpyObj<AiCapabilitiesService>;
  let api: jasmine.SpyObj<RepertoireBuilderAiApiService>;
  let store: RepertoireBuilderCandidateExplanationStore;

  beforeEach(() => {
    capabilities = jasmine.createSpyObj<AiCapabilitiesService>('AiCapabilitiesService', ['getCapabilities']);
    api = jasmine.createSpyObj<RepertoireBuilderAiApiService>('RepertoireBuilderAiApiService', [
      'generateCandidateExplanation',
    ]);
    TestBed.configureTestingModule({
      providers: [
        RepertoireBuilderCandidateExplanationStore,
        { provide: AiCapabilitiesService, useValue: capabilities },
        { provide: RepertoireBuilderAiApiService, useValue: api },
      ],
    });
    store = TestBed.inject(RepertoireBuilderCandidateExplanationStore);
  });

  it('does not expose or call the use case when the capability is disabled', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(false)));

    await store.initialize();

    expect(store.available()).toBeFalse();
    expect(api.generateCandidateExplanation).not.toHaveBeenCalled();
  });

  it('does not call the provider while candidate evidence is synchronized', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(true)));
    await store.initialize();

    store.sync(candidateResponse, 'e2e4');
    store.setComparison('d2d4', candidateResponse, 'e2e4');

    expect(store.available()).toBeTrue();
    expect(store.comparisonMoveUci()).toBe('d2d4');
    expect(api.generateCandidateExplanation).not.toHaveBeenCalled();
  });

  it('keeps generated state isolated and discards a stale response', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(true)));
    await store.initialize();
    store.sync(candidateResponse, 'e2e4');

    const result = new Subject<AiBuilderCandidateExplanationResponse>();
    api.generateCandidateExplanation.and.returnValue(result.asObservable());
    const deterministicBefore = structuredClone(candidateResponse);
    const requestPromise = store.request(decisionRequest, candidateResponse, 'e2e4');

    store.sync({ ...candidateResponse, generatedAt: '2026-07-30T15:01:00.000Z' }, 'e2e4');
    result.next(explanationResponse);
    result.complete();
    await requestPromise;

    expect(store.response()).toBeNull();
    expect(store.loading()).toBeFalse();
    expect(candidateResponse).toEqual(deterministicBefore);
  });

  it('stores a current explicit response and clears it when comparison identity changes', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(true)));
    await store.initialize();
    store.sync(candidateResponse, 'e2e4');
    api.generateCandidateExplanation.and.returnValue(of(explanationResponse));

    await store.request(decisionRequest, candidateResponse, 'e2e4');
    expect(store.response()).toEqual(explanationResponse);

    store.setComparison('d2d4', candidateResponse, 'e2e4');
    expect(store.response()).toBeNull();
  });
});

function capability(enabled: boolean): AiCapabilitiesResponse {
  return {
    widgets: {
      gameReview: false,
      builderCandidateExplanation: enabled,
      builderCompletionSummary: false,
    },
  };
}

const normalizedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const targetId = 'fa8d7aae-f46e-4dce-b2a7-6644b9eca199';

const candidateResponse: CandidateDecisionResponse = {
  contractVersion: CANDIDATE_DECISION_CONTRACT_VERSION,
  rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
  generatedAt: '2026-07-30T15:00:00.000Z',
  targetId,
  decisionRole: 'USER_MOVE',
  fen: `${normalizedFen} 0 1`,
  normalizedFen,
  sideToMove: 'WHITE',
  legalMoveCount: 20,
  returnedCandidateCount: 2,
  omittedLegalMoveCount: 18,
  requestedMoveIncluded: false,
  sourceSummary: {
    engine: 'UNAVAILABLE',
    masters: 'UNAVAILABLE',
    population: 'UNAVAILABLE',
    personal: 'INSUFFICIENT',
    opening: 'UNAVAILABLE',
    courses: 'INSUFFICIENT',
    playerProfile: 'UNAVAILABLE',
  },
  candidates: [
    candidate(1, 'e2e4', 'e4'),
    candidate(2, 'd2d4', 'd4'),
  ],
};

const decisionRequest = {
  fen: `${normalizedFen} 0 1`,
  decisionRole: 'USER_MOVE',
  target: { targetId },
  candidateLimit: 6,
} as CandidateDecisionRequest;

const explanationResponse: AiBuilderCandidateExplanationResponse = {
  kind: 'BUILDER_CANDIDATE_EXPLANATION',
  schemaVersion: 1,
  generatedAt: '2026-07-30T15:02:00.000Z',
  identity: {
    targetId,
    normalizedFen,
    decisionRole: 'USER_MOVE',
    rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
    responseGeneratedAt: candidateResponse.generatedAt,
    selectedMoveUci: 'e2e4',
    comparisonMoveUci: null,
  },
  selectedCandidate: { moveUci: 'e2e4', moveSan: 'e4', rank: 1 },
  comparisonCandidate: null,
  explanation: {
    summary: 'The generated interpretation references deterministic evidence only.',
    tradeoffs: [],
    evidenceReferenceIds: ['selected.rank'],
    missingEvidenceReferenceId: null,
  },
  referencedFacts: [{
    id: 'selected.rank',
    label: 'Selected deterministic rank',
    value: '#1',
    missing: false,
  }],
  disclaimer: 'Candidate ranking remains deterministic and move choice remains yours.',
};

function candidate(rank: number, moveUci: string, moveSan: string): CandidateDecisionCandidate {
  return {
    rank,
    moveUci,
    moveSan,
    resultingFen: `${normalizedFen} 0 1`,
    previewUci: [moveUci],
    manuallyRequested: false,
    eligibility: { status: 'ELIGIBLE', reasonCodes: [], warningCodes: [] },
    targetFit: { status: 'NEUTRAL', reasonCodes: [] },
    profileFit: { status: 'UNKNOWN', reasonCodes: [] },
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
        status: 'UNAVAILABLE',
        depth: null,
        multipv: null,
        scoreCpForTarget: null,
        mateForTarget: null,
        objectiveDeltaCp: null,
        pvUci: [],
      },
      masters: unavailableCorpus(),
      population: unavailableCorpus(),
      personal: {
        status: 'INSUFFICIENT',
        occurrences: 0,
        games: 0,
        scorePercent: null,
      },
      opening: {
        status: 'UNAVAILABLE',
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
      playerProfile: {
        status: 'UNAVAILABLE',
        generatedAt: null,
        matches: [],
      },
    },
  };
}

function unavailableCorpus() {
  return {
    status: 'UNAVAILABLE' as const,
    games: 0,
    frequencyPercent: null,
    scorePercentForTarget: null,
    positionBaselineScorePercentForTarget: null,
    scoreDeltaVsPositionPercent: null,
    averageRating: null,
    datasetVersion: null,
    fetchedAt: null,
    representativeGameId: null,
  };
}
