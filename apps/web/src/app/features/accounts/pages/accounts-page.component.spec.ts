import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import type { ExternalAccount, ImportRunSummary } from '../data-access/accounts.models';
import { AccountsStore } from '../state/accounts.store';
import { AccountsPageComponent } from './accounts-page.component';

describe('AccountsPageComponent', () => {
  let fixture: ComponentFixture<AccountsPageComponent>;
  let store: jasmine.SpyObj<AccountsStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  const account: ExternalAccount = {
    id: 7,
    userId: 1,
    provider: 'LICHESS',
    username: 'tester',
    displayName: 'Training account',
    providerUserId: null,
    isActive: true,
    isDefaultProgressAccount: false,
    lastSyncAt: '2026-08-05T04:00:00.000Z',
    syncCursorTime: '2026-08-01T00:00:00.000Z',
    lastSyncRunId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-08-05T04:00:00.000Z',
  };

  const result: ImportRunSummary = {
    importRunId: 8,
    status: 'COMPLETED',
    gamesSeen: 5,
    gamesImported: 2,
    gamesUpdated: 0,
    gamesSkipped: 3,
    gamesFailed: 0,
    eligibleImportedGameIds: [101, 102],
    eligibleUnindexedGameIds: [102],
  };

  beforeEach(async () => {
    store = jasmine.createSpyObj<AccountsStore>(
      'AccountsStore',
      [
        'loadAccounts',
        'updateForm',
        'createAccount',
        'resetForm',
        'syncActiveAccounts',
        'syncAccount',
        'refreshWorkflowCandidates',
        'showNotice',
        'isAccountIndexing',
        'isAccountAnalysing',
        'setDefaultProgressAccount',
        'resetCursor',
        'toggleActive',
        'deleteAccount',
        'indexEligibleAccountGames',
        'analyseEligibleAccountGames',
      ],
      {
        form: signal({ provider: 'LICHESS' as const, username: '', displayName: '' }),
        saving: signal(false),
        loading: signal(false),
        accounts: signal([account]),
        error: signal<string | null>('Import service unavailable.'),
        notice: signal<string | null>('Account data refreshed.'),
        syncingAllAccounts: signal(false),
        syncingAccountId: signal<number | null>(null),
        resettingCursorAccountId: signal<number | null>(null),
        deletingAccountId: signal<number | null>(null),
        settingDefaultProgressAccountId: signal<number | null>(null),
        syncResults: signal<Record<number, ImportRunSummary>>({ 7: result }),
        workflowCandidates: signal({
          7: {
            accountId: 7,
            eligibleImportedGameIds: [101, 102],
            eligibleUnindexedGameIds: [102],
            eligibleIndexedGameIds: [101],
            eligibleMissingOpeningGameIds: [],
          },
        }),
      },
    );
    store.loadAccounts.and.resolveTo();
    store.isAccountIndexing.and.returnValue(false);
    store.isAccountAnalysing.and.returnValue(false);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [AccountsPageComponent],
      providers: [
        provideRouter([]),
        { provide: ConfirmDialogService, useValue: confirmDialog },
      ],
    })
      .overrideComponent(AccountsPageComponent, {
        set: { providers: [{ provide: AccountsStore, useValue: store }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders semantic account evidence and separates workflows from account options', () => {
    const root = fixture.nativeElement as HTMLElement;
    const buttons = buttonLabels(root);

    expect(root.textContent).toContain('Last sync');
    expect(root.textContent).toContain('Import cursor');
    expect(root.querySelector('details.account-options summary')?.textContent).toContain('Account options');
    expect(buttons).toContain('Sync games');
    expect(buttons).toContain('Index blitz/rapid games');
    expect(buttons).toContain('Analyse indexed games');
    expect(buttons.some((label) => label.includes('Make default for progress'))).toBeTrue();
    expect(buttons).toContain('Delete account');
  });

  it('renders dynamic errors, notices, and import results with live-region semantics', () => {
    const root = fixture.nativeElement as HTMLElement;
    const alert = root.querySelector('[role="alert"]');
    const politeStatuses = root.querySelectorAll('[role="status"][aria-live="polite"]');
    const syncResult = root.querySelector('.sync-result[role="status"]');

    expect(alert?.textContent).toContain('Import service unavailable.');
    expect(
      Array.from(politeStatuses).some((status) => status.textContent?.includes('Account data refreshed.')),
    ).toBeTrue();
    expect(syncResult?.textContent).toContain('Seen 5, imported 2');
    expect(syncResult?.textContent).toContain('2 newly imported blitz/rapid games');
  });

  it('uses the computed workflow state to enable only currently eligible new-game actions', () => {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.sync-workflow-actions button'),
    ) as HTMLButtonElement[];

    expect(buttons.find((button) => button.textContent?.includes('Index new games'))?.disabled).toBeFalse();
    expect(
      buttons.find((button) => button.textContent?.includes('Analyse new indexed games'))?.disabled,
    ).toBeFalse();
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

  it('runs the header refresh action through bulk game sync', () => {
    page().headerActions()[0].run();

    expect(store.syncActiveAccounts).toHaveBeenCalled();
  });

  function page(): {
    confirmDeleteAccount(account: ExternalAccount): Promise<void>;
    confirmResetCursor(account: ExternalAccount): Promise<void>;
    headerActions(): readonly { run: () => void }[];
  } {
    return fixture.componentInstance as unknown as {
      confirmDeleteAccount(account: ExternalAccount): Promise<void>;
      confirmResetCursor(account: ExternalAccount): Promise<void>;
      headerActions(): readonly { run: () => void }[];
    };
  }
});

function buttonLabels(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('button')).map(
    (button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
}
