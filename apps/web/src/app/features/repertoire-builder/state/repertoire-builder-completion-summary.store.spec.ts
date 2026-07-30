import { TestBed } from '@angular/core/testing';
import type {
  AiBuilderCompletionSummaryRequest,
  AiBuilderCompletionSummaryResponse,
  AiCapabilitiesResponse,
} from '@chess-trainer/contracts/ai';
import { of, Subject } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { RepertoireBuilderAiApiService } from '../data-access/repertoire-builder-ai-api.service';
import { RepertoireBuilderCompletionSummaryStore } from './repertoire-builder-completion-summary.store';

describe('RepertoireBuilderCompletionSummaryStore', () => {
  let capabilities: jasmine.SpyObj<AiCapabilitiesService>;
  let api: jasmine.SpyObj<RepertoireBuilderAiApiService>;
  let store: RepertoireBuilderCompletionSummaryStore;

  beforeEach(() => {
    capabilities = jasmine.createSpyObj<AiCapabilitiesService>('AiCapabilitiesService', ['getCapabilities']);
    api = jasmine.createSpyObj<RepertoireBuilderAiApiService>('RepertoireBuilderAiApiService', [
      'generateCompletionSummary',
    ]);
    TestBed.configureTestingModule({
      providers: [
        RepertoireBuilderCompletionSummaryStore,
        { provide: AiCapabilitiesService, useValue: capabilities },
        { provide: RepertoireBuilderAiApiService, useValue: api },
      ],
    });
    store = TestBed.inject(RepertoireBuilderCompletionSummaryStore);
  });

  it('does not expose or call the use case when the capability is disabled', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(false)));

    await store.initialize();
    store.sync(request);
    await store.request(request);

    expect(store.available()).toBeFalse();
    expect(api.generateCompletionSummary).not.toHaveBeenCalled();
  });

  it('does not call the API while post-apply identity is synchronized', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(true)));
    await store.initialize();

    store.sync(request);

    expect(store.available()).toBeTrue();
    expect(store.response()).toBeNull();
    expect(api.generateCompletionSummary).not.toHaveBeenCalled();
  });

  it('keeps completed course state isolated and discards a stale response', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(true)));
    await store.initialize();
    store.sync(request);

    const result = new Subject<AiBuilderCompletionSummaryResponse>();
    api.generateCompletionSummary.and.returnValue(result.asObservable());
    const deterministicBefore = structuredClone(request);
    const requestPromise = store.request(request);

    store.sync({
      ...request,
      applyResult: { ...request.applyResult, courseContentRevision: 9 },
    });
    result.next(response);
    result.complete();
    await requestPromise;

    expect(store.response()).toBeNull();
    expect(store.loading()).toBeFalse();
    expect(request).toEqual(deterministicBefore);
  });

  it('stores one explicit response and clears it on dialog close', async () => {
    capabilities.getCapabilities.and.returnValue(of(capability(true)));
    await store.initialize();
    store.sync(request);
    api.generateCompletionSummary.and.returnValue(of(response));

    await store.request(request);
    expect(store.response()).toEqual(response);

    store.sync(null);
    expect(store.response()).toBeNull();
    expect(store.loading()).toBeFalse();
  });
});

function capability(enabled: boolean): AiCapabilitiesResponse {
  return {
    widgets: {
      gameReview: false,
      builderCandidateExplanation: false,
      builderCompletionSummary: enabled,
    },
  };
}

const request = {
  draft: {
    sessionId: 'session-rb020',
    sessionRevision: 4,
    targetId: 'target-rb020',
  },
  destination: {
    courseId: 11,
    courseName: 'White repertoire',
    chapterId: 22,
    chapterName: 'Open games',
  },
  selectedTarget: { kind: 'NEW_LINE', name: 'Reviewed line' },
  applyResult: {
    courseId: 11,
    chapterId: 22,
    lineId: 33,
    lineName: 'Reviewed line',
    courseContentRevision: 8,
  },
} as AiBuilderCompletionSummaryRequest;

const response = {
  kind: 'BUILDER_COMPLETION_SUMMARY',
  schemaVersion: 1,
  generatedAt: '2026-07-30T19:15:00.000Z',
  identity: {
    sessionId: 'session-rb020',
    sessionRevision: 4,
    targetId: 'target-rb020',
    courseId: 11,
    chapterId: 22,
    lineId: 33,
    courseContentRevision: 8,
  },
  authoritativeResult: {
    courseId: 11,
    courseName: 'White repertoire',
    chapterId: 22,
    chapterName: 'Open games',
    lineId: 33,
    lineName: 'Reviewed line',
    targetKind: 'NEW_LINE',
    createdMoves: 2,
    reusedMoves: 0,
    skippedBranches: 1,
    totalDraftMoves: 2,
    courseContentRevision: 8,
    idempotent: false,
    factualSummary: 'Reviewed line was updated with two created moves.',
  },
  interpretation: {
    interpretation: 'The verified result records one applied path.',
    interpretationReferenceIds: ['path.1'],
    highlights: [],
    studyChecklist: [],
    unresolvedWorkNote: null,
    warning: null,
  },
  referencedFacts: [{ id: 'path.1', label: 'Applied path 1', value: 'e2e4 e7e5' }],
  disclaimer: 'Course changes are authoritative; generated study suggestions are optional.',
} as AiBuilderCompletionSummaryResponse;