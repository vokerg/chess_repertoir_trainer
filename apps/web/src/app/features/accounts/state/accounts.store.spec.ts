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
      'importAllHistory',
      'getAccountImports',
      'getActiveAccountImports',
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
    api.getActiveAccountImports.and.returnValue(of({ items: [] }));

    TestBed.configureTestingModule({
      providers: [
        AccountsStore,
        { provide: AccountsApiService, useValue: api },
      ],
    });

    store = TestBed.inject(AccountsStore);
  });

  it('restores persisted active imports separately from bounded recent history', async () => {
    const tracked = account(1, 'tracked', true);
    const staleCompleted = importRun(9, tracked.id, 'COMPLETED');
    const activeRun = importRun(10, tracked.id, 'PAUSED');
    api.getAccounts.and.returnValue(of([tracked]));
    api.getAccountImports.and.returnValue(of({ items: [staleCompleted] }));
    api.getActiveAccountImports.and.returnValue(of({ items: [activeRun] }));

    await store.initialize();

    expect(api.getActiveAccountImports).toHaveBeenCalledTimes(1);
    expect(store.accounts()).toEqual([tracked]);
    expect(store.importRunForAccount(tracked.id)).toEqual(activeRun);
    expect(store.isImportActive(tracked.id)).toBeTrue();
  });

  it('restores completed and failed terminal imports from persisted history', async () => {
    const completedAccount = account(1, 'completed', true);
    const failedAccount = account(2, 'failed', true);
    const completed = importRun(20, completedAccount.id, 'COMPLETED');
    const failed = importRun(21, failedAccount.id, 'FAILED');
    api.getAccounts.and.returnValue(of([completedAccount, failedAccount]));
    api.getAccountImports.and.returnValue(of({ items: [failed, completed] }));
    api.getActiveAccountImports.and.returnValue(of({ items: [] }));

    await store.initialize();

    expect(store.importRunForAccount(completedAccount.id)?.status).toBe('COMPLETED');
    expect(store.importRunForAccount(failedAccount.id)?.status).toBe('FAILED');
    expect(store.isImportActive(completedAccount.id)).toBeFalse();
    expect(store.isImportActive(failedAccount.id)).toBeFalse();
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

  it('keeps successful account refreshes and reconciles persisted state when another account conflicts', async () => {
    const failing = account(1, 'first', true);
    const succeeding = account(2, 'second', true);
    const persistedActive = importRun(199, failing.id, 'RUNNING');
    store.accounts.set([failing, succeeding]);
    api.syncAccount.withArgs(failing.id).and.returnValue(
      throwError(() => ({ error: { message: 'Account already has an active import.' } })),
    );
    api.syncAccount.withArgs(succeeding.id).and.returnValue(of({
      importRun: importRun(200, succeeding.id, 'QUEUED'),
    }));
    api.getActiveAccountImports.and.returnValue(of({ items: [persistedActive] }));
    api.getAccountImports.and.returnValue(of({ items: [importRun(200, succeeding.id, 'QUEUED')] }));

    await store.syncActiveAccounts();

    expect(store.importRunForAccount(failing.id)?.id).toBe(199);
    expect(store.importRunForAccount(succeeding.id)?.id).toBe(200);
    expect(store.error()).toContain('Queued 1 account refresh. Failed: Account already has an active import.');
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

  it('queues explicit all-history work as a durable run', async () => {
    const tracked = account(1, 'history', true);
    const fullHistory = {
      ...importRun(12, tracked.id, 'QUEUED'),
      mode: 'FULL_HISTORY' as const,
      source: 'USER_ACTION' as const,
      requestedFrom: '2013-01-01T00:00:00.070Z',
    } as AccountImportRun;
    store.accounts.set([tracked]);
    api.importAllHistory.and.returnValue(of({ importRun: fullHistory }));

    await store.importAllHistory(tracked);

    expect(api.importAllHistory).toHaveBeenCalledOnceWith(tracked.id);
    expect(store.importRunForAccount(tracked.id)).toEqual(fullHistory);
    expect(store.notice()).toContain('Queued all supported Lichess history');
    expect(store.importingAllHistoryAccountId()).toBeNull();
  });

  it('resumes a persisted paused import back into the durable queue', async () => {
    const paused = importRun(8, 1, 'PAUSED');
    const resumed = { ...paused, status: 'QUEUED' as const };
    store.importRuns.set({ 1: paused });
    api.resumeImport.and.returnValue(of({ importRun: resumed }));

    await store.resumeImport(paused);

    expect(api.resumeImport).toHaveBeenCalledOnceWith(paused.id);
    expect(store.importRunForAccount(1)?.status).toBe('QUEUED');
    expect(store.notice()).toBe('Account import resume request accepted.');
  });

  it('persists cancellation acknowledgement state for a running import', async () => {
    const running = importRun(9, 1, 'RUNNING');
    const cancelling = { ...running, status: 'CANCEL_REQUESTED' as const };
    store.importRuns.set({ 1: running });
    api.cancelImport.and.returnValue(of({ importRun: cancelling }));

    await store.cancelImport(running);

    expect(api.cancelImport).toHaveBeenCalledOnceWith(running.id);
    expect(store.importRunForAccount(1)?.status).toBe('CANCEL_REQUESTED');
    expect(store.isImportActive(1)).toBeTrue();
  });

  it('replaces a failed terminal import with its persisted retry run', async () => {
    const failed = importRun(10, 1, 'FAILED');
    const retry = {
      ...importRun(11, 1, 'QUEUED'),
      retryOfImportRunId: failed.id,
    };
    store.importRuns.set({ 1: failed });
    api.retryImport.and.returnValue(of({ importRun: retry }));

    await store.retryImport(failed);

    expect(api.retryImport).toHaveBeenCalledOnceWith(failed.id);
    expect(store.importRunForAccount(1)?.id).toBe(retry.id);
    expect(store.importRunForAccount(1)?.retryOfImportRunId).toBe(failed.id);
    expect(store.notice()).toBe('Account import retry queued.');
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
  const terminal = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
  return {
    id,
    accountId,
    provider: 'LICHESS',
    mode: 'INCREMENTAL_FORWARD',
    source: 'ACCOUNT_REFRESH',
    status,
    scopeVersion: 1,
    scopeHash: `scope-${accountId}`,
    scope: {
      variant: 'STANDARD',
      speeds: ['BULLET', 'BLITZ', 'RAPID'],
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
      failed: status === 'FAILED' ? 1 : 0,
    },
    lastProgressAt: '2026-07-02T09:00:00.000Z',
    retryAt: null,
    rateLimitUntil: null,
    createdAt: '2026-07-02T08:00:00.000Z',
    updatedAt: '2026-07-02T09:00:00.000Z',
    startedAt: '2026-07-02T08:00:00.000Z',
    completedAt: terminal ? '2026-07-02T09:00:00.000Z' : null,
    errorCode: status === 'FAILED' ? 'TEST_FAILURE' : null,
    error: status === 'FAILED' ? 'Test import failure.' : null,
  };
}
