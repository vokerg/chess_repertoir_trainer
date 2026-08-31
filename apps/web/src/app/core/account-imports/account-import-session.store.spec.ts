import { TestBed } from '@angular/core/testing';
import type {
  AccountImportRun,
  AutomaticAccountRefreshResponse,
} from '@chess-trainer/contracts';
import { of, Subject, throwError } from 'rxjs';
import { AccountImportBootstrapApiService } from './account-import-bootstrap-api.service';
import { AccountImportSessionStore } from './account-import-session.store';

describe('AccountImportSessionStore', () => {
  let store: AccountImportSessionStore;
  let api: jasmine.SpyObj<AccountImportBootstrapApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AccountImportBootstrapApiService>(
      'AccountImportBootstrapApiService',
      ['refreshStaleAccounts'],
    );
    TestBed.configureTestingModule({
      providers: [
        AccountImportSessionStore,
        { provide: AccountImportBootstrapApiService, useValue: api },
      ],
    });
    store = TestBed.inject(AccountImportSessionStore);
  });

  afterEach(() => store.reset());

  it('invokes automatic refresh once per authenticated session and restores active runs silently', async () => {
    const accepted = accountImportRun(1, 101);
    const active = accountImportRun(2, 102);
    api.refreshStaleAccounts.and.returnValue(of({
      items: [
        { accountId: 101, status: 'accepted', importRun: accepted },
        { accountId: 102, status: 'alreadyActive', importRun: active },
        {
          accountId: 103,
          status: 'fresh',
          lastSuccessfulRefreshAt: '2026-08-31T00:00:00.000Z',
          nextEligibleAt: '2026-09-01T00:00:00.000Z',
        },
        {
          accountId: 104,
          status: 'failed',
          code: 'ACCOUNT_IMPORT_RETRY_THROTTLED',
          error: 'Temporarily throttled.',
          retryAt: '2026-08-31T01:00:00.000Z',
        },
      ],
    }));

    await store.initialize(7, 1);
    await store.initialize(7, 1);

    expect(api.refreshStaleAccounts).toHaveBeenCalledTimes(1);
    expect(store.runs()).toEqual({ 101: accepted, 102: active });
    expect(store.response()?.items.length).toBe(4);
    expect(store.error()).toBeNull();
  });

  it('does not turn a bootstrap request failure into a reload loop inside the same session', async () => {
    api.refreshStaleAccounts.and.returnValue(throwError(() => new Error('Temporary API failure')));

    await store.initialize(7, 1);
    await store.initialize(7, 1);

    expect(api.refreshStaleAccounts).toHaveBeenCalledTimes(1);
    expect(store.error()).toContain('Temporary API failure');
    expect(store.runs()).toEqual({});
  });

  it('discards a stale response after logout reset and allows the next session to initialize', async () => {
    const response$ = new Subject<AutomaticAccountRefreshResponse>();
    api.refreshStaleAccounts.and.returnValue(response$);

    const first = store.initialize(7, 1);
    store.reset();
    response$.next({ items: [{ accountId: 101, status: 'accepted', importRun: accountImportRun(1, 101) }] });
    response$.complete();
    await first;

    expect(store.runs()).toEqual({});
    expect(store.response()).toBeNull();

    const nextResponse = {
      items: [{ accountId: 102, status: 'accepted', importRun: accountImportRun(2, 102) }],
    } satisfies AutomaticAccountRefreshResponse;
    api.refreshStaleAccounts.and.returnValue(of(nextResponse));
    await store.initialize(7, 2);

    expect(api.refreshStaleAccounts).toHaveBeenCalledTimes(2);
    expect(store.runs()).toEqual({ 102: nextResponse.items[0].importRun });
  });

  it('supersedes an in-flight bootstrap when the authenticated user changes directly', async () => {
    const firstResponse$ = new Subject<AutomaticAccountRefreshResponse>();
    const secondResponse = {
      items: [{ accountId: 202, status: 'accepted', importRun: accountImportRun(2, 202) }],
    } satisfies AutomaticAccountRefreshResponse;
    api.refreshStaleAccounts.and.returnValues(firstResponse$, of(secondResponse));

    const first = store.initialize(7, 1);
    const second = store.initialize(8, 2);

    expect(api.refreshStaleAccounts).toHaveBeenCalledTimes(2);
    await second;
    expect(store.runs()).toEqual({ 202: secondResponse.items[0].importRun });

    firstResponse$.next({
      items: [{ accountId: 101, status: 'accepted', importRun: accountImportRun(1, 101) }],
    });
    firstResponse$.complete();
    await first;

    expect(store.runs()).toEqual({ 202: secondResponse.items[0].importRun });
    expect(store.response()).toEqual(secondResponse);
  });

  it('runs again when a new auth session resolves for the same application user', async () => {
    const firstResponse = {
      items: [{ accountId: 101, status: 'accepted', importRun: accountImportRun(1, 101) }],
    } satisfies AutomaticAccountRefreshResponse;
    const secondResponse = {
      items: [{ accountId: 102, status: 'alreadyActive', importRun: accountImportRun(2, 102) }],
    } satisfies AutomaticAccountRefreshResponse;
    api.refreshStaleAccounts.and.returnValues(of(firstResponse), of(secondResponse));

    await store.initialize(7, 1);
    await store.initialize(7, 2);

    expect(api.refreshStaleAccounts).toHaveBeenCalledTimes(2);
    expect(store.response()).toEqual(secondResponse);
    expect(store.runs()).toEqual({ 102: secondResponse.items[0].importRun });
  });
});

function accountImportRun(id: number, accountId: number): AccountImportRun {
  return {
    id,
    accountId,
    provider: 'LICHESS',
    mode: 'INCREMENTAL_FORWARD',
    source: 'ACCOUNT_REFRESH',
    status: 'QUEUED',
    scopeVersion: 1,
    scopeHash: 'a'.repeat(64),
    scope: { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: '2026-08-30T00:00:00.000Z',
    requestedTo: '2026-08-31T00:00:00.000Z',
    priority: 10,
    retryOfImportRunId: null,
    windows: { total: null, completed: 0 },
    games: {
      seen: 0,
      matchedScope: 0,
      imported: 0,
      duplicate: 0,
      updated: 0,
      skipped: 0,
      skippedOutOfScope: 0,
      failed: 0,
    },
    lastProgressAt: null,
    retryAt: null,
    rateLimitUntil: null,
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
    startedAt: '2026-08-31T00:00:00.000Z',
    completedAt: null,
    errorCode: null,
    error: null,
  };
}
