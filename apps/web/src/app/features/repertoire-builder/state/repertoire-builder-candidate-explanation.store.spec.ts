import { TestBed } from '@angular/core/testing';
import type {
  AiBuilderCandidateExplanationResponse,
  AiCapabilitiesResponse,
} from '@chess-trainer/contracts/ai';
import type {
  CandidateDecisionRequest,
  CandidateDecisionResponse,
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
const candidateResponse = {
  contractVersion: '2026-07-v1',
  rankingPolicyVersion: '2026-07-deterministic-v1',
  generatedAt: '2026-07-30T15:00:00.000Z',
  targetId,
  decisionRole: 'USER_MOVE',
  normalizedFen,
  candidates: [
    { moveUci: 'e2e4' },
    { moveUci: 'd2d4' },
  ],
} as CandidateDecisionResponse;

const decisionRequest = {
  fen: `${normalizedFen} 0 1`,
  decisionRole: 'USER_MOVE',
  target: { targetId },
  candidateLimit: 6,
} as CandidateDecisionRequest;

const explanationResponse = {
  kind: 'BUILDER_CANDIDATE_EXPLANATION',
  schemaVersion: 1,
  generatedAt: '2026-07-30T15:02:00.000Z',
  identity: {
    targetId,
    normalizedFen,
    decisionRole: 'USER_MOVE',
    rankingPolicyVersion: '2026-07-deterministic-v1',
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
} as AiBuilderCandidateExplanationResponse;