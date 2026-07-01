import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ExternalAccount } from '../data-access/accounts.models';
import { AccountsStore } from '../state/accounts.store';
import { AccountsPageComponent } from './accounts-page.component';

describe('AccountsPageComponent', () => {
  let fixture: ComponentFixture<AccountsPageComponent>;
  let store: jasmine.SpyObj<AccountsStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  const account: ExternalAccount = {
    id: 7,
    provider: 'LICHESS',
    username: 'sample',
    displayName: null,
    isActive: true,
  };

  beforeEach(async () => {
    store = jasmine.createSpyObj<AccountsStore>(
      'AccountsStore',
      [
        'deleteAccount',
        'resetCursor',
        'loadAccounts',
        'loadLichessConnection',
        'syncActiveAccounts',
        'disconnectLichess',
        'showNotice',
        'showError',
      ],
      {
        accounts: signal<ExternalAccount[]>([]),
        lichessConnection: signal(null),
        loading: signal(false),
        loadingLichessConnection: signal(false),
        saving: signal(false),
        syncingAllAccounts: signal(false),
        syncingAccountId: signal<number | null>(null),
        resettingCursorAccountId: signal<number | null>(null),
        deletingAccountId: signal<number | null>(null),
        disconnectingLichess: signal(false),
      },
    );
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [AccountsPageComponent],
      providers: [
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    })
      .overrideComponent(AccountsPageComponent, {
        set: {
          template: '',
          providers: [{ provide: AccountsStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountsPageComponent);
  });

  it('deletes an account only when confirmed', async () => {
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDeleteAccount(account);

    expect(store.deleteAccount).toHaveBeenCalledOnceWith(account);
  });

  it('does not delete an account when cancelled', async () => {
    confirmDialog.confirm.and.resolveTo(false);

    await page().confirmDeleteAccount(account);

    expect(store.deleteAccount).not.toHaveBeenCalled();
  });

  it('resets a cursor only when confirmed', async () => {
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmResetCursor(account);

    expect(store.resetCursor).toHaveBeenCalledOnceWith(account);
  });

  it('does not reset a cursor when cancelled', async () => {
    confirmDialog.confirm.and.resolveTo(false);

    await page().confirmResetCursor(account);

    expect(store.resetCursor).not.toHaveBeenCalled();
  });

  it('disconnects Lichess only when confirmed', async () => {
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDisconnectLichess();

    expect(store.disconnectLichess).toHaveBeenCalled();
  });

  it('does not disconnect Lichess when cancelled', async () => {
    confirmDialog.confirm.and.resolveTo(false);

    await page().confirmDisconnectLichess();

    expect(store.disconnectLichess).not.toHaveBeenCalled();
  });

  it('runs the header refresh action through bulk game sync', () => {
    page().headerActions()[0].run();

    expect(store.syncActiveAccounts).toHaveBeenCalled();
  });

  function page(): {
    confirmDeleteAccount(account: ExternalAccount): Promise<void>;
    confirmDisconnectLichess(): Promise<void>;
    confirmResetCursor(account: ExternalAccount): Promise<void>;
    headerActions(): readonly { run: () => void }[];
  } {
    return fixture.componentInstance as unknown as {
      confirmDeleteAccount(account: ExternalAccount): Promise<void>;
      confirmDisconnectLichess(): Promise<void>;
      confirmResetCursor(account: ExternalAccount): Promise<void>;
      headerActions(): readonly { run: () => void }[];
    };
  }
});
