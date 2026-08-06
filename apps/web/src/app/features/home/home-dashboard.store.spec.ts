import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AccountsApiService } from '../accounts/data-access/accounts-api.service';
import { ActivityFeedApiService } from '../activity-feed';
import type { TodayActivityResponse } from '../activity-feed';
import { GamesApiService } from '../games/data-access/games-api.service';
import type {
  ImportedGameFacetsResponse,
  ImportedGameSearchResponse,
} from '../games/data-access/games.models';
import { LibraryApiService } from '../library/data-access/library-api.service';
import { HomeDashboardStore } from './home-dashboard.store';

describe('HomeDashboardStore activity loading', () => {
  let store: HomeDashboardStore;
  let activityApi: jasmine.SpyObj<ActivityFeedApiService>;

  beforeEach(() => {
    const accountsApi = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', [
      'getAccounts',
      'getPerformanceStats',
    ]);
    accountsApi.getAccounts.and.returnValue(of([]));

    activityApi = jasmine.createSpyObj<ActivityFeedApiService>('ActivityFeedApiService', [
      'getToday',
      'updatePreferences',
    ]);

    const libraryApi = jasmine.createSpyObj<LibraryApiService>('LibraryApiService', [
      'getCatalog',
    ]);
    libraryApi.getCatalog.and.returnValue(of({ courses: [] }));

    const gamesApi = jasmine.createSpyObj<GamesApiService>('GamesApiService', [
      'getFacets',
      'searchGames',
    ]);
    gamesApi.getFacets.and.returnValue(of({} as ImportedGameFacetsResponse));
    const emptySearchResponse: ImportedGameSearchResponse = {
      items: [],
      pageInfo: { nextCursor: null, hasMore: false },
      appliedFilters: { sort: 'endedAtDesc', limit: 6 },
    };
    gamesApi.searchGames.and.returnValue(of(emptySearchResponse));

    TestBed.configureTestingModule({
      providers: [
        HomeDashboardStore,
        { provide: AuthService, useValue: { displayName: signal('Player') } },
        { provide: AccountsApiService, useValue: accountsApi },
        { provide: ActivityFeedApiService, useValue: activityApi },
        { provide: LibraryApiService, useValue: libraryApi },
        { provide: GamesApiService, useValue: gamesApi },
      ],
    });
    store = TestBed.inject(HomeDashboardStore);
  });

  it('keeps Home usable when only today activity fails', async () => {
    activityApi.getToday.and.returnValue(throwError(() => new Error('offline')));

    await store.load();

    expect(store.error()).toBeNull();
    expect(store.activityError()).toContain('other Home sections are still available');
    expect(store.todayActivity()).toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('updates a differing valid browser time zone and reloads the summary once', async () => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const serverTimeZone = browserTimeZone === 'UTC' ? 'Europe/Copenhagen' : 'UTC';
    activityApi.getToday.and.returnValues(
      of(todayResponse(serverTimeZone)),
      of(todayResponse(browserTimeZone)),
    );
    activityApi.updatePreferences.and.returnValue(of({
      contractVersion: '2026-08-v1',
      timeZone: browserTimeZone,
    }));

    await store.load();

    expect(activityApi.updatePreferences).toHaveBeenCalledOnceWith({ timeZone: browserTimeZone });
    expect(activityApi.getToday).toHaveBeenCalledTimes(2);
    expect(store.todayActivity()?.timeZone).toBe(browserTimeZone);
    expect(store.activityNotice()).toBeNull();
  });
});

function todayResponse(timeZone: string): TodayActivityResponse {
  return {
    contractVersion: '2026-08-v1',
    timeZone,
    date: '2026-08-06',
    activities: [],
    goals: [
      {
        id: 'PLAY_GAME',
        activityType: 'GAMES_PLAYED',
        label: 'Play a game',
        current: 0,
        target: 1,
        completed: false,
      },
    ],
  };
}
