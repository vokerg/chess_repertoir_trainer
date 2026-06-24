import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { ExternalAccount, ImportRunSummary } from '../data-access/accounts.models';
import { AccountsStore } from './accounts.store';

describe('AccountsStore', () => {
  let store: AccountsStore;
  let api: jasmine.SpyObj<AccountsApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', [
      'getAccounts',
      'createAccount',
      'syncAccount',
      'resetCursor',
      'setActive',
      'deleteAccount',
    ]);

    TestBed.configureTestingModule({
      providers: [AccountsStore, { provide: AccountsApiService, useValue: api }],
    });

    store = TestBed.inject(AccountsStore);
  });

  it('syncs all active accounts and reloads the account list once', async () => {
    const activeOne = account(1, 'first', true);
    const inactive = account(2, 'second', false);
    const activeTwo = account(3, 'third', true);
    const reloadedAccounts = [
      { ...activeOne, lastSyncAt: '2026-06-24T10:00:00.000Z' },
      inactive,
      { ...activeTwo, lastSyncAt: '2026-06-24T11:00:00.000Z' },
    ];
    store.accounts.set([activeOne, inactive, activeTwo]);
    api.syncAccount.withArgs(activeOne.id).and.returnValue(of(syncResult(100)));
    api.syncAccount.withArgs(activeTwo.id).and.returnValue(of(syncResult(101)));
    api.getAccounts.and.returnValue(of(reloadedAccounts));

    await store.syncActiveAccounts();

    expect(api.syncAccount).toHaveBeenCalledTimes(2);
    expect(api.syncAccount.calls.argsFor(0)).toEqual([activeOne.id]);
    expect(api.syncAccount.calls.argsFor(1)).toEqual([activeTwo.id]);
    expect(api.getAccounts).toHaveBeenCalledTimes(1);
    expect(store.accounts()).toEqual(reloadedAccounts);
    expect(store.syncResults()[activeOne.id]).toEqual(syncResult(100));
    expect(store.syncResults()[activeTwo.id]).toEqual(syncResult(101));
    expect(store.notice()).toBe('Refreshed games for 2 active accounts.');
    expect(store.error()).toBeNull();
    expect(store.syncingAllAccounts()).toBeFalse();
    expect(store.syncingAccountId()).toBeNull();
  });

  it('continues syncing other active accounts when one refresh fails', async () => {
    const failing = account(1, 'first', true);
    const succeeding = account(2, 'second', true);
    store.accounts.set([failing, succeeding]);
    api.syncAccount.withArgs(failing.id).and.returnValue(throwError(() => ({ error: { message: 'Boom' } })));
    api.syncAccount.withArgs(succeeding.id).and.returnValue(of(syncResult(200)));
    api.getAccounts.and.returnValue(of([failing, succeeding]));

    await store.syncActiveAccounts();

    expect(api.syncAccount).toHaveBeenCalledTimes(2);
    expect(api.getAccounts).toHaveBeenCalledTimes(1);
    expect(store.syncResults()[succeeding.id]).toEqual(syncResult(200));
    expect(store.error()).toBe('Refreshed games for 1 account. Failed: Lichess @first (Boom).');
    expect(store.notice()).toBeNull();
    expect(store.syncingAllAccounts()).toBeFalse();
    expect(store.syncingAccountId()).toBeNull();
  });
});

function account(id: number, username: string, isActive: boolean): ExternalAccount {
  return {
    id,
    provider: 'LICHESS',
    username,
    displayName: null,
    isActive,
  };
}

function syncResult(importRunId: number): ImportRunSummary {
  return {
    importRunId,
    status: 'COMPLETED',
    gamesSeen: 10,
    gamesImported: 3,
    gamesUpdated: 1,
    gamesSkipped: 6,
    gamesFailed: 0,
    syncSince: null,
    syncUntil: null,
    archivesFetched: 1,
  };
}
