import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PerformanceByRatingApiService } from '../data-access/performance-by-rating-api.service';
import { PerformanceByRatingStore } from './performance-by-rating.store';

describe('PerformanceByRatingStore', () => {
  let api: jasmine.SpyObj<PerformanceByRatingApiService>;
  let store: PerformanceByRatingStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<PerformanceByRatingApiService>('PerformanceByRatingApiService', [
      'getPerformanceByRating',
    ]);
    api.getPerformanceByRating.and.returnValue(of({
      range: { from: '2026-04-14', to: '2026-07-14' },
      items: [],
    }));

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

  it('updates the minimum rating as a non-negative integer', () => {
    store.setMinRating('850.9');
    expect(store.minRating()).toBe(850);

    store.setMinRating('-20');
    expect(store.minRating()).toBe(0);
  });
});
