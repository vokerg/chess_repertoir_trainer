import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import type { AccountImportRun, ExternalAccount } from '../data-access/accounts.models';
import { AccountsStore } from './accounts.store';

describe('AccountsStore import polling settlement', () => {
  it('reloads account metadata when a previously active run disappears from both projections', fakeAsync(() => {
    const tracked = account();
    const updated = {
      ...tracked,
      lastSyncAt: '2026-08-23T10:00:00.000Z',
      lastSyncRunId: 71,
      updatedAt: '2026-08-23T10:00:00.000Z',
    };
    const running = importRun();
    const api = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', [
      'getAccounts',
      'getAccountImports',
      'getActiveAccountImports',
    ]);
    api.getAccounts.and.returnValues(of([tracked]), of([updated]));
    api.getActiveAccountImports.and.returnValues(
      of({ items: [running] }),
      of({ items: [] }),
    );
    api.getAccountImports.and.returnValues(
      of({ items: [] }),
      of({ items: [] }),
    );

    TestBed.configureTestingModule({
      providers: [
        AccountsStore,
        { provide: AccountsApiService, useValue: api },
      ],
    });
    const store = TestBed.inject(AccountsStore);

    void store.initialize();
    flushMicrotasks();
    expect(store.importRunForAccount(tracked.id)?.id).toBe(running.id);
    expect(store.isImportActive(tracked.id)).toBeTrue();
    expect(api.getAccounts).toHaveBeenCalledTimes(1);

    tick(2_000);
    flushMicrotasks();

    expect(store.importRunForAccount(tracked.id)).toBeNull();
    expect(store.isImportActive(tracked.id)).toBeFalse();
    expect(store.accounts()[0].lastSyncRunId).toBe(71);
    expect(api.getAccounts).toHaveBeenCalledTimes(2);

    tick(2_000);
    flushMicrotasks();
    expect(api.getActiveAccountImports).toHaveBeenCalledTimes(2);
  }));
});

function account(): ExternalAccount {
  return {
    id: 7,
    userId: 1,
    provider: 'LICHESS',
    username: 'polling-account',
    displayName: null,
    providerUserId: null,
    isActive: true,
    isDefaultProgressAccount: false,
    lastSyncAt: null,
    syncCursorTime: null,
    lastSyncRunId: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
  };
}

function importRun(): AccountImportRun {
  return {
    id: 71,
    accountId: 7,
    provider: 'LICHESS',
    mode: 'INCREMENTAL_FORWARD',
    source: 'ACCOUNT_REFRESH',
    status: 'RUNNING',
    scopeVersion: 1,
    scopeHash: 'a'.repeat(64),
    scope: {
      variant: 'STANDARD',
      speeds: ['BULLET', 'BLITZ', 'RAPID'],
      rated: 'BOTH',
    },
    requestedFrom: '2026-08-22T10:00:00.000Z',
    requestedTo: '2026-08-23T10:00:00.000Z',
    retryOfImportRunId: null,
    priority: 100,
    windows: { total: 1, completed: 0 },
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
    createdAt: '2026-08-23T09:00:00.000Z',
    updatedAt: '2026-08-23T09:00:00.000Z',
    startedAt: '2026-08-23T09:00:00.000Z',
    completedAt: null,
    errorCode: null,
    error: null,
  };
}
