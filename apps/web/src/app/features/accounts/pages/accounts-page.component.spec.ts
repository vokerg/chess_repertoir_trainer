import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AccountImportRun, ExternalAccount } from '../data-access/accounts.models';
import { AccountsStore } from '../state/accounts.store';
import { AccountsPageComponent } from './accounts-page.component';

describe('AccountsPageComponent', () => {
  let fixture: ComponentFixture<AccountsPageComponent>;
  let store: jasmine.SpyObj<AccountsStore>;

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
  const run = importRun();

  beforeEach(async () => {
    store = jasmine.createSpyObj<AccountsStore>(
      'AccountsStore',
      [
        'initialize',
        'updateForm',
        'createAccount',
        'resetForm',
        'syncActiveAccounts',
        'syncAccount',
        'backfillAccount',
        'pauseImport',
        'resumeImport',
        'cancelImport',
        'retryImport',
        'importRunForAccount',
        'isImportActive',
        'isImportControlling',
        'setDefaultProgressAccount',
        'toggleActive',
      ],
      {
        form: signal({ provider: 'LICHESS' as const, username: '', displayName: '' }),
        saving: signal(false),
        loading: signal(false),
        accounts: signal([account]),
        error: signal<string | null>('Import service unavailable.'),
        notice: signal<string | null>('Account refresh queued.'),
        syncingAllAccounts: signal(false),
        syncingAccountId: signal<number | null>(null),
        backfillingAccountId: signal<number | null>(null),
        controllingImportRunId: signal<number | null>(null),
        settingDefaultProgressAccountId: signal<number | null>(null),
      },
    );
    store.initialize.and.resolveTo();
    store.importRunForAccount.withArgs(account.id).and.returnValue(run);
    store.isImportActive.withArgs(account.id).and.returnValue(true);
    store.isImportControlling.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [AccountsPageComponent],
      providers: [provideRouter([])],
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

  afterEach(() => fixture.destroy());

  it('renders persisted import evidence instead of raw cursor state', () => {
    const root = fixture.nativeElement as HTMLElement;
    const buttons = buttonLabels(root);

    expect(root.textContent).toContain('Import status');
    expect(root.textContent).toContain('Last completed');
    expect(root.textContent).not.toContain('Import cursor');
    expect(root.textContent).toContain('Importing · Forward refresh');
    expect(root.textContent).toContain('10 seen · 3 imported · 4 already present · 0 failed');
    expect(buttons).toContain('Pause');
    expect(buttons).toContain('Cancel');
    expect(buttons).not.toContain('Index blitz/rapid games');
    expect(buttons).not.toContain('Analyse indexed games');
  });

  it('keeps historical expansion explicit and raw cursor reset absent', () => {
    const root = fixture.nativeElement as HTMLElement;
    const buttons = buttonLabels(root);

    expect(buttons).toContain('Load 3 older months');
    expect(buttons).not.toContain('Reset import cursor');
  });

  it('keeps destructive account removal disabled pending lifecycle cutover', () => {
    const deleteButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('Delete account')) as HTMLButtonElement | undefined;

    expect(deleteButton).toBeDefined();
    expect(deleteButton?.disabled).toBeTrue();
  });

  it('renders dynamic errors, notices, and import progress with live-region semantics', () => {
    const root = fixture.nativeElement as HTMLElement;
    const alert = root.querySelector('[role="alert"]');
    const politeStatuses = root.querySelectorAll('[role="status"][aria-live="polite"]');

    expect(alert?.textContent).toContain('Import service unavailable.');
    expect(
      Array.from(politeStatuses).some((status) => status.textContent?.includes('Account refresh queued.')),
    ).toBeTrue();
    expect(root.querySelector('.sync-result[role="status"]')).not.toBeNull();
  });

  it('runs the header refresh action through bulk durable queueing', () => {
    page().headerActions()[0].run();

    expect(store.syncActiveAccounts).toHaveBeenCalled();
  });

  function page(): { headerActions(): readonly { run: () => void }[] } {
    return fixture.componentInstance as unknown as {
      headerActions(): readonly { run: () => void }[];
    };
  }
});

function importRun(): AccountImportRun {
  return {
    id: 8,
    accountId: 7,
    provider: 'LICHESS',
    mode: 'INCREMENTAL_FORWARD',
    source: 'USER_ACTION',
    status: 'RUNNING',
    scopeVersion: 1,
    scopeHash: 'scope-7',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: '2026-08-01T00:00:00.000Z',
    requestedTo: '2026-08-05T04:00:00.000Z',
    retryOfImportRunId: null,
    priority: 100,
    windows: { total: 2, completed: 1 },
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
    lastProgressAt: '2026-08-05T03:55:00.000Z',
    retryAt: null,
    rateLimitUntil: null,
    createdAt: '2026-08-05T03:45:00.000Z',
    updatedAt: '2026-08-05T03:55:00.000Z',
    startedAt: '2026-08-05T03:45:00.000Z',
    completedAt: null,
    errorCode: null,
    error: null,
  };
}

function buttonLabels(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('button')).map(
    (button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  );
}
