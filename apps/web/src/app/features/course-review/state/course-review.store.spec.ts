import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import { CourseReviewApiService } from '../data-access/course-review-api.service';
import { CourseReviewStore } from './course-review.store';

describe('CourseReviewStore', () => {
  let store: CourseReviewStore;
  let api: jasmine.SpyObj<CourseReviewApiService>;
  let reviewResponse$: Subject<any>;
  let endingsResponse$: Subject<any>;

  beforeEach(() => {
    reviewResponse$ = new Subject();
    endingsResponse$ = new Subject();
    api = jasmine.createSpyObj<CourseReviewApiService>('CourseReviewApiService', [
      'getCourseReview',
      'getCourseEndings',
      'getFacets',
    ]);
    api.getCourseReview.and.returnValue(reviewResponse$);
    api.getCourseEndings.and.returnValue(endingsResponse$);
    api.getFacets.and.returnValue(of(emptyImportedGameFacets()));

    TestBed.configureTestingModule({
      providers: [CourseReviewStore, { provide: CourseReviewApiService, useValue: api }],
    });
    store = TestBed.inject(CourseReviewStore);
  });

  it('keeps an active endings request valid when review locks the course color', async () => {
    store.initialize(21, 'MY_DEVIATIONS');
    store.initialize(21, 'COURSE_ENDINGS');

    reviewResponse$.next({
      course: {
        id: 21,
        name: 'White repertoire',
        description: null,
        sideToTrain: 'WHITE',
        hasMixedSides: false,
        lineCount: 3,
        moveCount: 12,
      },
      myDeviations: [],
      opponentUncovered: [],
    });
    reviewResponse$.complete();
    await Promise.resolve();

    endingsResponse$.next({
      course: { id: 21, name: 'White repertoire', description: null, lineCount: 3 },
      items: [],
    });
    endingsResponse$.complete();
    await Promise.resolve();

    expect(store.endings()).not.toBeNull();
    expect(store.endingsLoading()).toBeFalse();
    expect(store.gameFilters().userColor).toBe('WHITE');
  });

  it('keeps displayed results while draft thresholds are edited', () => {
    const review = {
      course: {
        id: 21,
        name: 'Course',
        description: null,
        sideToTrain: null,
        hasMixedSides: true,
        lineCount: 1,
        moveCount: 4,
      },
      myDeviations: [],
      opponentUncovered: [],
    } as any;
    const endings = {
      course: { id: 21, name: 'Course', description: null, lineCount: 1 },
      items: [],
    } as any;

    store.review.set(review);
    store.endings.set(endings);
    store.setMinCoveredPlies(6);
    store.setMinGames(8);

    expect(store.review()).toBe(review);
    expect(store.endings()).toBe(endings);
  });
});
