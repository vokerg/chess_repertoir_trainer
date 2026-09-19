import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LibraryApiService } from '../data-access/library-api.service';
import type { LibraryCatalogResponse } from '../data-access/library.models';
import { LibraryBrowserStore } from './library-browser.store';

describe('LibraryBrowserStore', () => {
  let store: LibraryBrowserStore;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        LibraryBrowserStore,
        { provide: Router, useValue: router },
        { provide: LibraryApiService, useValue: { getCatalog: () => of(catalog()) } },
      ],
    });

    store = TestBed.inject(LibraryBrowserStore);
  });

  it('loads the first course and section while keeping whole-course scope', async () => {
    await store.loadCourses();

    expect(store.selectedCourseId()).toBe(1);
    expect(store.selectedChapterId()).toBe(11);
    expect(store.lines().map((line) => line.id)).toEqual([101, 102]);
    expect(store.trainingScope()).toBe('COURSE');
  });

  it('moves naturally from section scope to selected lines and back', async () => {
    await store.loadCourses();
    await store.selectChapter(12);

    expect(store.trainingScope()).toBe('CHAPTER');
    store.toggleLineSelection(201);
    expect(store.trainingScope()).toBe('SELECTED_LINES');
    expect(store.selectedLineIds()).toEqual([201]);

    store.clearLineSelection();
    expect(store.trainingScope()).toBe('CHAPTER');
    expect(store.selectedLineIds()).toEqual([]);
  });

  it('preserves the existing marathon routes and mode query parameters', async () => {
    await store.loadCourses();
    await store.selectChapter(12);
    store.toggleLineSelection(201);

    store.startSelectedMarathon('WEAK_SUBLINES', 'SELECTED_LINES');
    expect(router.navigate).toHaveBeenCalledWith(['/library/marathon'], {
      queryParams: { mode: 'WEAK_SUBLINES', lineIds: '201' },
    });

    store.startSelectedMarathon('UNTRAINED_SUBLINES', 'CHAPTER');
    expect(router.navigate).toHaveBeenCalledWith(['/chapters', 12, 'marathon'], {
      queryParams: { mode: 'UNTRAINED_SUBLINES' },
    });

    store.startSelectedMarathon('ALL', 'COURSE');
    expect(router.navigate).toHaveBeenCalledWith(['/courses', 1, 'marathon'], {
      queryParams: { mode: 'ALL' },
    });
  });
});

function catalog(): LibraryCatalogResponse {
  return {
    courses: [
      {
        id: 1,
        name: 'Black repertoire',
        description: null,
        side: 'BLACK',
        coverKey: null,
        stats: stats(1, 9, 2, 1),
        chapters: [
          {
            id: 11,
            courseId: 1,
            name: 'Sicilian Defence',
            description: null,
            sortOrder: 1,
            lines: [line(101, 11, 'Najdorf'), line(102, 11, 'Classical')],
          },
          {
            id: 12,
            courseId: 1,
            name: 'French Defence',
            description: null,
            sortOrder: 2,
            lines: [line(201, 12, 'Winawer')],
          },
        ],
      },
    ],
  };
}

function stats(
  id: number,
  activeSublineCount: number,
  weakSublineCount: number,
  untrainedSublineCount: number,
): LibraryCatalogResponse['courses'][number]['stats'] {
  return {
    scopeType: 'COURSE',
    scopeId: id,
    activeSublineCount,
    trainedSublineCount: activeSublineCount - untrainedSublineCount,
    untrainedSublineCount,
    weakSublineCount,
    statsWindowSize: 20,
    totalAttempts: 12,
    passedCount: 8,
    failedCount: 4,
    passRate: 0.67,
    failureRate: 0.33,
    attemptPassRate: 0.67,
    status: 'REVIEW',
  };
}

function line(id: number, chapterId: number, name: string): LibraryCatalogResponse['courses'][number]['chapters'][number]['lines'][number] {
  return {
    id,
    chapterId,
    name,
    sideToTrain: 'BLACK',
    startingFen: 'startpos',
    trainingStats: {
      totalAttempts: 4,
      passedCount: 3,
      failedCount: 1,
      passRate: 0.75,
      activeSublineCount: 3,
      trainedSublineCount: 2,
      untrainedSublineCount: 1,
      weakSublineCount: 1,
      status: 'REVIEW',
    },
  };
}
