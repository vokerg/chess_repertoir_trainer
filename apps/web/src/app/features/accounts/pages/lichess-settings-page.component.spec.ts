import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import type { LichessConnectionStatus } from '../data-access/accounts.models';
import { AccountsStore } from '../state/accounts.store';
import { LichessSettingsPageComponent } from './lichess-settings-page.component';

describe('LichessSettingsPageComponent', () => {
  let fixture: ComponentFixture<LichessSettingsPageComponent>;
  let store: jasmine.SpyObj<AccountsStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  const connection: LichessConnectionStatus = {
    connected: true,
    account: {
      username: 'tester',
      lichessUserId: 'tester',
      externalAccountId: 7,
      scopes: ['puzzle:read'],
      connectedAt: '2026-08-05T04:00:00.000Z',
    },
  };

  beforeEach(async () => {
    store = jasmine.createSpyObj<AccountsStore>(
      'AccountsStore',
      [
        'loadLichessConnection',
        'connectLichess',
        'disconnectLichess',
        'showNotice',
        'showError',
      ],
      {
        error: signal<string | null>(null),
        notice: signal<string | null>('Lichess connected.'),
        loadingLichessConnection: signal(false),
        lichessConnection: signal<LichessConnectionStatus | null>(connection),
        disconnectingLichess: signal(false),
      },
    );
    store.loadLichessConnection.and.resolveTo();
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [LichessSettingsPageComponent],
      providers: [
        { provide: ConfirmDialogService, useValue: confirmDialog },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => null } },
          },
        },
      ],
    })
      .overrideComponent(LichessSettingsPageComponent, {
        set: { providers: [{ provide: AccountsStore, useValue: store }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LichessSettingsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders connection evidence and names every missing required permission', () => {
    const root = fixture.nativeElement as HTMLElement;
    const warning = root.querySelector('.lichess-scope-warning[role="status"]');

    expect(root.textContent).toContain('Connected as @tester');
    expect(root.textContent).toContain('Tracked account');
    expect(root.textContent).toContain('Bot challenges');
    expect(root.textContent).toContain('Read puzzles');
    expect(root.textContent).toContain('Submit puzzle results');
    expect(warning?.textContent).toContain('bot challenges');
    expect(warning?.textContent).toContain('submit puzzle results');
    expect(warning?.textContent).not.toContain('read puzzles');
  });

  it('renders callback notices as polite status updates', () => {
    const notice = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="status"][aria-live="polite"]',
    );

    expect(notice?.textContent).toContain('Lichess connected.');
  });

  it('disconnects only after confirmation', async () => {
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDisconnectLichess();

    expect(store.disconnectLichess).toHaveBeenCalledTimes(1);
  });

  function page(): { confirmDisconnectLichess(): Promise<void> } {
    return fixture.componentInstance as unknown as { confirmDisconnectLichess(): Promise<void> };
  }
});
