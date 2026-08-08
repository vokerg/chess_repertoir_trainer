import { TestBed } from '@angular/core/testing';
import type {
  AdminMeResponse,
  AdminUserDetailResponse,
  AdminUserListResponse,
  AdminUserWorkResponse,
} from '@chess-trainer/contracts/admin';
import { of, Subject, throwError } from 'rxjs';
import { AdminApiService } from '../data-access/admin-api.service';
import { AdminDiagnosticsStore } from './admin-diagnostics.store';

describe('AdminDiagnosticsStore', () => {
  let store: AdminDiagnosticsStore;
  let api: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AdminApiService>('AdminApiService', [
      'getMe',
      'listUsers',
      'getUserDetail',
      'getUserWork',
    ]);
    api.getUserDetail.and.callFake((userId) => of(detail(userId)));
    api.getUserWork.and.callFake((userId) => of(work(userId)));

    TestBed.configureTestingModule({
      providers: [
        AdminDiagnosticsStore,
        { provide: AdminApiService, useValue: api },
      ],
    });
    store = TestBed.inject(AdminDiagnosticsStore);
  });

  it('boots capability from the API and loads only the current cursor page', async () => {
    api.getMe.and.returnValue(of(capability()));
    api.listUsers.and.returnValue(of(userPage([1, 2], 'next')));

    await store.initialize();

    expect(store.accessState()).toBe('ready');
    expect(store.users().map((user) => user.id)).toEqual([1, 2]);
    expect(store.nextCursor()).toBe('next');
    expect(api.listUsers).toHaveBeenCalledOnceWith(null, 25);
  });

  it('renders authenticated non-admin denial from the authoritative API as forbidden', async () => {
    api.getMe.and.returnValue(throwError(() => ({ status: 403 })));

    await store.initialize();

    expect(store.accessState()).toBe('forbidden');
    expect(store.capability()).toBeNull();
    expect(store.users()).toEqual([]);
    expect(api.listUsers).not.toHaveBeenCalled();
  });

  it('replaces the current page instead of accumulating an unbounded user list', async () => {
    api.getMe.and.returnValue(of(capability()));
    api.listUsers.and.returnValues(
      of(userPage([1, 2], 'cursor-2')),
      of(userPage([3, 4], null)),
    );

    await store.initialize();
    await store.nextUsersPage();

    expect(store.users().map((user) => user.id)).toEqual([3, 4]);
    expect(store.pageNumber()).toBe(2);
    expect(store.currentCursor()).toBe('cursor-2');
    expect(api.listUsers.calls.argsFor(1)).toEqual(['cursor-2', 25]);
  });

  it('retries the cursor page that failed instead of falling back to the last successful page', async () => {
    api.getMe.and.returnValue(of(capability()));
    api.listUsers.and.returnValues(
      of(userPage([1, 2], 'cursor-2')),
      throwError(() => ({ status: 500 })),
      of(userPage([3, 4], null)),
    );

    await store.initialize();
    await store.nextUsersPage();

    expect(store.usersState()).toBe('error');
    expect(store.pageNumber()).toBe(1);

    await store.retryUsers();

    expect(api.listUsers.calls.argsFor(2)).toEqual(['cursor-2', 25]);
    expect(store.users().map((user) => user.id)).toEqual([3, 4]);
    expect(store.pageNumber()).toBe(2);
    expect(store.currentCursor()).toBe('cursor-2');
  });

  it('keeps detail and work failures independent so partial diagnostics remain explicit', async () => {
    store.accessState.set('ready');
    api.getUserDetail.and.returnValue(throwError(() => ({ status: 500 })));
    api.getUserWork.and.returnValue(of(work(7)));

    await store.selectUser(7);

    expect(store.detailState()).toBe('error');
    expect(store.detail()).toBeNull();
    expect(store.workState()).toBe('ready');
    expect(store.work()?.userId).toBe(7);
    expect(store.selectionHasPartialFailure()).toBeTrue();
  });

  it('restores capability and diagnostics when initialized again after navigation or reload', async () => {
    api.getMe.and.returnValues(of(capability(1)), of(capability(2)));
    api.listUsers.and.returnValues(
      of(userPage([1], null)),
      of(userPage([9], null)),
    );

    await store.initialize();
    await store.initialize();

    expect(store.accessState()).toBe('ready');
    expect(store.capability()?.actorKeyVersion).toBe(2);
    expect(store.users().map((user) => user.id)).toEqual([9]);
    expect(store.selectedUserId()).toBe(9);
  });

  it('ignores stale capability responses', async () => {
    const first = new Subject<AdminMeResponse>();
    const second = new Subject<AdminMeResponse>();
    api.getMe.and.returnValues(first.asObservable(), second.asObservable());
    api.listUsers.and.returnValue(of(userPage([], null)));

    const firstLoad = store.initialize();
    const secondLoad = store.initialize();
    second.next(capability(2));
    second.complete();
    await secondLoad;
    first.next(capability(1));
    first.complete();
    await firstLoad;

    expect(store.capability()?.actorKeyVersion).toBe(2);
    expect(api.listUsers).toHaveBeenCalledTimes(1);
  });

  it('ignores stale selected-user responses after a newer selection', async () => {
    store.accessState.set('ready');
    const firstDetail = new Subject<AdminUserDetailResponse>();
    const firstWork = new Subject<AdminUserWorkResponse>();
    api.getUserDetail.and.callFake((userId) => userId === 1 ? firstDetail.asObservable() : of(detail(userId)));
    api.getUserWork.and.callFake((userId) => userId === 1 ? firstWork.asObservable() : of(work(userId)));

    const firstLoad = store.selectUser(1);
    await store.selectUser(2);
    firstDetail.next(detail(1));
    firstDetail.complete();
    firstWork.next(work(1));
    firstWork.complete();
    await firstLoad;

    expect(store.selectedUserId()).toBe(2);
    expect(store.detail()?.user.id).toBe(2);
    expect(store.work()?.userId).toBe(2);
  });
});

function capability(actorKeyVersion = 1): AdminMeResponse {
  return {
    capabilities: ['ADMIN_DIAGNOSTICS_READ'],
    actorKeyVersion,
    sessionEvidence: {
      hasVerifiedSession: true,
      hasFactorVerificationAge: false,
      hasReverificationId: false,
    },
    requestBudget: {
      enforcement: 'UNENFORCED',
      scope: 'STRICT_BOUNDS_AND_SECURITY_TELEMETRY',
    },
  };
}

function userPage(ids: number[], nextCursor: string | null): AdminUserListResponse {
  return {
    items: ids.map((id) => ({
      id,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-02T10:00:00.000Z',
      accountCount: 1,
      activeAccountCount: 1,
      importedGameCount: 10,
      courseCount: 2,
      activeWorkCount: 0,
      warnings: [],
    })),
    nextCursor,
  };
}

function detail(userId: number): AdminUserDetailResponse {
  return {
    user: {
      id: userId,
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-02T10:00:00.000Z',
    },
    sections: {
      accounts: { available: true, total: 1, active: 1, groups: [] },
      games: {
        available: true,
        total: 10,
        indexed: 8,
        analysed: 6,
        bySpeed: [],
        byIndexState: [],
        byAnalysisState: [],
      },
      courses: { available: true, courses: 2, chapters: 3, lines: 20 },
      training: {
        available: true,
        sessions: 4,
        sublineAttempts: 12,
        latestSessionAt: null,
        latestSublineAttemptAt: null,
      },
      preparation: {
        available: true,
        totalRuns: 2,
        activeRuns: 0,
        latestUpdatedAt: null,
        warnings: [],
      },
      footprint: {
        available: true,
        rowCounts: {
          externalAccounts: 1,
          importedGames: 10,
          courses: 2,
          chapters: 3,
          lines: 20,
          trainingSessions: 4,
          trainingSublineAttempts: 12,
          importRuns: 1,
          jobRuns: 2,
          preparationRuns: 2,
        },
      },
      lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
    },
  };
}

function work(userId: number): AdminUserWorkResponse {
  return {
    userId,
    sections: {
      jobs: { available: true, items: [] },
      imports: { available: true, queuedCount: 0, items: [], warnings: [] },
      preparation: { available: true, items: [] },
      lifecycle: { available: false, reason: 'MODEL_NOT_AVAILABLE' },
    },
  };
}
