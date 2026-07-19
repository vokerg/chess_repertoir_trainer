import { TestBed } from '@angular/core/testing';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { of, Subject } from 'rxjs';
import { GameAiReviewApiService } from '../data-access/game-ai-review-api.service';
import { GameAiReviewStore } from './game-ai-review.store';

describe('GameAiReviewStore', () => {
  let api: jasmine.SpyObj<GameAiReviewApiService>;
  let store: GameAiReviewStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<GameAiReviewApiService>('GameAiReviewApiService', ['get', 'generate']);
    TestBed.configureTestingModule({
      providers: [
        GameAiReviewStore,
        { provide: GameAiReviewApiService, useValue: api },
      ],
    });
    store = TestBed.inject(GameAiReviewStore);
  });

  it('hydrates a saved review when the game opens', async () => {
    const review = reviewResponse();
    api.get.and.returnValue(of({ review }));

    await store.load(7);

    expect(api.get).toHaveBeenCalledOnceWith(7);
    expect(store.review()).toEqual(review);
    expect(store.status()).toBe('READY');
  });

  it('returns to idle when no saved review exists', async () => {
    api.get.and.returnValue(of({ review: null }));

    await store.load(7);

    expect(store.review()).toBeNull();
    expect(store.status()).toBe('IDLE');
  });

  it('does not allow an older load to overwrite a generated review', async () => {
    const pendingLoad = new Subject<{ review: AiGameReviewResponse | null }>();
    const generated = reviewResponse('Generated now');
    api.get.and.returnValue(pendingLoad);
    api.generate.and.returnValue(of(generated));

    const loading = store.load(7);
    await store.generate(7);
    pendingLoad.next({ review: reviewResponse('Older saved review') });
    pendingLoad.complete();
    await loading;

    expect(store.review()?.review.headline).toBe('Generated now');
    expect(store.status()).toBe('READY');
  });
});

function reviewResponse(headline = 'Saved review'): AiGameReviewResponse {
  return {
    kind: 'GAME_REVIEW',
    schemaVersion: 1,
    generatedAt: '2026-07-19T14:00:00.000Z',
    review: {
      headline,
      overview: 'Overview',
      openingAssessment: 'Opening assessment',
      turningPoints: [],
      strengths: [],
      improvements: [],
      practicePriorities: [],
      themes: [],
    },
    warnings: [],
  };
}
