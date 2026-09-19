import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { RatingNormalizationProfile } from '@chess-trainer/contracts/rating-normalization';
import { PerformanceByRatingApiService } from '../data-access/performance-by-rating-api.service';
import { PerformanceByRatingStore } from './performance-by-rating.store';

describe('PerformanceByRatingStore', () => {
  let api: jasmine.SpyObj<PerformanceByRatingApiService>;
  let store: PerformanceByRatingStore;

  const normalizationProfile = {
    id: 'test-profile',
    version: 'test-v1',
  } as RatingNormalizationProfile;

  beforeEach(() => {
    api = jasmine.createSpyObj<PerformanceByRatingApiService>('PerformanceByRatingApiService', [
      'getPerformanceByRating',
      'getRatingNormalizationProfile',
    ]);
    api.getPerformanceByRating.and.returnValue(of({
      range: { from: '2026-04-14', to: '2026-07-14' },
      items: [],
    }));
    api.getRatingNormalizationProfile.and.returnValue(of(normalizationProfile));

    TestBed.configureTestingModule({
      providers: [
        PerformanceByRatingStore,
        { provide: PerformanceByRatingApiService, useValue: api },
      ],
    });
    store = TestBed.inject(PerformanceByRatingStore);
  });

  it('defaults the minimum opponent rating to 600 and sends it to the API', async () => {
    expect(store.minRating()).toBe(600);

    await store.load();

    expect(api.getPerformanceByRating).toHaveBeenCalledWith(jasmine.objectContaining({
      minRating: 600,
    }));
  });

  it('loads the versioned rating normalization profile during initialization', async () => {
    await store.initialize();

    expect(api.getRatingNormalizationProfile).toHaveBeenCalledTimes(1);
    expect(store.normalizationProfile()?.version).toBe('test-v1');
  });

  it('disables bullet types by default while keeping blitz and rapid enabled', () => {
    expect(store.isTypeEnabled('LICHESS_BULLET')).toBeFalse();
    expect(store.isTypeEnabled('CHESS_COM_BULLET')).toBeFalse();
    expect(store.isTypeEnabled('LICHESS_BLITZ')).toBeTrue();
    expect(store.isTypeEnabled('LICHESS_RAPID')).toBeTrue();
    expect(store.isTypeEnabled('CHESS_COM_BLITZ')).toBeTrue();
    expect(store.isTypeEnabled('CHESS_COM_RAPID')).toBeTrue();

    store.toggleType('LICHESS_BULLET');

    expect(store.isTypeEnabled('LICHESS_BULLET')).toBeTrue();
  });

  it('clamps the minimum rating to the contract range as an integer', () => {
    store.setMinRating('850.9');
    expect(store.minRating()).toBe(850);

    store.setMinRating('-20');
    expect(store.minRating()).toBe(0);

    store.setMinRating('5001');
    expect(store.minRating()).toBe(5000);
  });
});
