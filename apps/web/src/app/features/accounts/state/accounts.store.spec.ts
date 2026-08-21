import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import type { AccountImportRun, ExternalAccount } from '../data-access/accounts.models';
import { AccountsStore } from './accounts.store';

describe('AccountsStore', () => {
  let store: AccountsStore;
  let api: jasmine.SpyObj<AccountsApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', [
      'getAccounts',
      'createAccount',
      'syncAccount',
      'backfillAccount',
      'getAccountImports',
      'pauseImport',
      'resumeImport',
      'cancelImport',
      'retryImport',
      'setActive',
      'setDefaultProgressAccount',
      'getLichessConnection',
      'startLichessConnection',
      'disconnectLichess',
    ]);
    api.getAccountImports.and.returnValue(of({ items: [] }));

    TestBed.configureTestingModule({
      providers: [
        AccountsStore,
        { provide: AccountsApiService, useValue: api },
      ],
    });

    store = TestBed.inject(AccountsStore);
  });

  it('restores the latest persisted import after page initialization', async () => {
    const tracked = account(1, 'tracked', true);
    const activeRun = importRun(10, tracked.id, 'RUNNING');
    api.getAccounts.and.returnValue(of([tracked]));
    api.getAccountImports.and.returnValue(of({ items: [activeRun] }));

    await store.initialize();

    expect(store.accounts()).toEqual([tracked]);
    expect(store.importRunForAccount(tracked.id)).toEqual(activeRun);
    expect(store.isImportActive(tracked.id)).toBeTrue();
  });

  it('queues refreshes for active accounts independently and keeps durable run state', async () => {
    const activeOne = account(1, 'first', true);
    const inactive = account(2, 'second', false);
    const activeTwo = account(3, 'third', true);
    store.accounts.set([activeOne, inactive, activeTwo]);
    api.syncAccount.withArgs(activeOne.id).and.returnValue(of({
      importRun: importRun(100, activeOne.id, 'QUEUED'),
    }));
    api.syncAccount.withArgs(activeTwo.id).and.returnValue(of({
      importRun: importRun(101, activeTwo.id, 'QUEUED'),
    }));

    await store.syncActiveAccounts();

    expect(api.syncAccount).toHaveBeenCalledTimes(2);
    expect(store.importRunForAccount(activeOne.id)?.id).toBe(100);
    expect(store.importRunForAccount(activeTwo.id)?.id).toBe(101);
    expect(store.notice()).toBe('Queued game refresh for 2 active accounts.');
    expect(store.syncingAllAccounts()).toBeFalse();
  });

  it('keeps successful account refreshes when another account fails to queue', async () => {
    const failing = account(1, 'first', true);
    const succeeding = account(2, 'second', true);
    store.accounts.set([failing, succeeding]);
    api.syncAccount.withArgs(failing.id).and.returnValue(
      throwError(() => ({ error: { message: 'Boom' } })),
    );
    api.syncAccount.withArgs(succeeding.id).and.returnValue(of({
      importRun: importRun(200, succeeding.id, 'QUEUED'),
    }));

    await store.syncActiveAccounts();

    expect(store.importRunForAccount(succeeding.id)?.id).toBe(200);
    expect(store.error()).toContain('Queued 1 account refresh. Failed: Boom.');
    expect(store.notice()).toBeNull();
  });

  it('persists pause results returned by the durable import control API', async () => {
    const running = importRun(7, 1, 'RUNNING');
    const pausing = { ...running, status: 'PAUSE_REQUESTED' as const };
    store.importRuns.set({ 1: running });
    api.pauseImport.and.returnValue(of({ importRun: pausing }));

    await store.pauseImport(running);

    expect(api.pauseImport).toHaveBeenCalledOnceWith(running.id);
    expect(store.importRunForAccount(1)?.status).toBe('PAUSE_REQUESTED');
  });

  it('disconnects Lichess without changing tracked accounts', async () => {
    const tracked = account(1, 'tracked', true);
    store.accounts.set([tracked]);
    store.lichessConnection.set({
      connected: true,
      account: {
        username: 'tracked',
        lichessUserId: 'lichess-id',
        externalAccountId: tracked.id,
        scopes: [],
        connectedAt: '2026-07-01T10:00:00.000Z',
        expiresAt: null,
      },
    });
    api.disconnectLichess.and.returnValue(of({ disconnected: true }));
    api.getLichessConnection.and.returnValue(of({ connected: false }));

    await store.disconnectLichess();

    expect(store.accounts()).toEqual([tracked]);
    expect(store.lichessConnection()).toEqual({ connected: false });
  });

  it('sets the default progress account from the API account list response', async () => {
    const first = account(1, 'first', true);
    const second = account(2, 'second', true);
    const updatedAccounts = [{ ...first, isDefaultProgressAccount: true }, second];
    store.accounts.set([first, second]);
    api.setDefaultProgressAccount.and.returnValue(
      of({ defaultProgressAccountId: first.id, account: updatedAccounts[0], accounts: updatedAccounts }),
    );

    await store.setDefaultProgressAccount(first);

    expect(api.setDefaultProgressAccount).toHaveBeenCalledOnceWith(first.id);
    expect(store.accounts()).toEqual(updatedAccounts);
  });
});

function account(id: number, username: string, isActive: boolean): ExternalAccount {
  return {
    id,
    userId: 1,
    provider: 'LICHESS',
    username,
    displayName: null,
    providerUserId: null,
    isActive,
    lastSyncAt: null,
    syncCursorTime: null,
    lastSyncRunId: null,
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    isDefaultProgressAccount: false,
  };
}

function importRun(
  id: number,
  accountId: number,
  status: AccountImportRun['status'],
): AccountImportRun {
  return {
    id,
    accountId,
    provider: 'LICHESS',
    mode: 'INCREMENTAL_FORWARD',
    source: 'USER_ACTION',
    status,
    scopeVersion: 1,
    scopeHash: `scope-${accountId}`,
    scope: {
      variant: 'STANDARD',
      speeds: ['BLITZ', 'RAPID'],
      rated: 'BOTH',
    },
    requestedFrom: '2026-07-01T10:00:00.000Z',
    requestedTo: '2026-07-02T10:00:00.000Z',
    retryOfImportRunId: null,
    priority: 100,
    windows: { total: 2, completed: status === 'COMPLETED' ? 2 : 1 },
    games: {
      seen: 10,
      matchedScope: 7,
      imported: 3,
      duplicate: 4,
      updated: 0,
      skipped: 3,
      skippedOutOfScope: 3,
      failed: 0,
    },
    lastProgressAt: '2026-07-02T09:00:00.000Z',
    retryAt: null,
    rateLimitUntil: null,
    createdAt: '2026-07-02T08:00:00.000Z',
    updatedAt: '2026-07-02T09:00:00.000Z',
    startedAt: '2026-07-02T08:00:00.000Z',
    completedAt: status === 'COMPLETED' ? '2026-07-02T09:00:00.000Z' : null,
    errorCode: null,
    error: null,
  };
}
