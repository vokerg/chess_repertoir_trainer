import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import type {
  AccountPerformanceStatsResponse,
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
  ExternalAccount,
} from '../data-access/accounts.models';
import { AccountDetailPageComponent } from './account-detail-page.component';

describe('AccountDetailPageComponent', () => {
  let fixture: ComponentFixture<AccountDetailPageComponent>;
  let accountsApi: jasmine.SpyObj<AccountsApiService>;

  const account1: ExternalAccount = {
    id: 1,
    userId: 1,
    provider: 'CHESS_COM',
    username: 'vokerg6',
    displayName: 'vokerg6',
    providerUserId: null,
    isActive: true,
    isDefaultProgressAccount: false,
    lastSyncAt: '2026-08-05T04:00:00.000Z',
    syncCursorTime: '2026-08-01T00:00:00.000Z',
    lastSyncRunId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-08-05T04:00:00.000Z',
  };

  const account2: ExternalAccount = {
    id: 2,
    userId: 1,
    provider: 'CHESS_COM',
    username: 'dmitrigrecov',
    displayName: null,
    providerUserId: null,
    isActive: true,
    isDefaultProgressAccount: true,
    lastSyncAt: '2026-08-05T04:00:00.000Z',
    syncCursorTime: '2026-08-01T00:00:00.000Z',
    lastSyncRunId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-08-05T04:00:00.000Z',
  };

  const mockRatingStats: AccountRatingStatsResponse = {
    account: { id: 1, provider: 'CHESS_COM', username: 'vokerg6', displayName: 'vokerg6' },
    computedAt: '2026-08-12T06:42:00Z',
    gamesCount: 0,
    data: {
      version: 3,
      ratingSource: 'gameRecordedRating',
      speeds: [],
    },
  };

  const mockPerfStats: AccountPerformanceStatsResponse = {
    account: { id: 1, provider: 'CHESS_COM', username: 'vokerg6' },
    range: {},
    speeds: ['bullet', 'blitz', 'rapid'],
    gamesCount: 0,
    wdl: { wins: 0, draws: 0, losses: 0 },
    averageOpponentRating: { overall: null, wins: null, draws: null, losses: null },
    timeControlWdl: [],
    recentGames: [],
    bestVictories: [],
    mostEmbarrassingDefeats: [],
    bestVictory: null,
    mostEmbarrassingDefeat: null,
  };

  const mockHistory: AccountRatingHistoryResponse = {
    account: { id: 1, provider: 'CHESS_COM', username: 'vokerg6', displayName: 'vokerg6' },
    bucket: 'day',
    aggregation: 'max',
    ratingSource: 'gameRecordedRating',
    series: [],
    yDomain: null,
  };

  beforeEach(async () => {
    accountsApi = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', [
      'getAccounts',
      'getAccount',
      'getRatingStats',
      'getPerformanceStats',
      'getRatingHistory',
    ]);

    accountsApi.getAccounts.and.returnValue(of([account1, account2]));
    accountsApi.getAccount.and.returnValue(of(account1));
    accountsApi.getRatingStats.and.returnValue(of(mockRatingStats));
    accountsApi.getPerformanceStats.and.returnValue(of(mockPerfStats));
    accountsApi.getRatingHistory.and.returnValue(of(mockHistory));

    await TestBed.configureTestingModule({
      imports: [AccountDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: AccountsApiService, useValue: accountsApi },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ accountId: '1' })),
          },
        },
      ],
    })
      .overrideComponent(AccountDetailPageComponent, {
        set: {
          providers: [{ provide: AccountsApiService, useValue: accountsApi }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AccountDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders compact action buttons including Games link with preselected account query params', () => {
    const actionButtons = fixture.nativeElement.querySelectorAll('.profile-action-btn');
    expect(actionButtons.length).toBe(2);

    const gamesBtn = actionButtons[0] as HTMLAnchorElement;
    expect(gamesBtn.textContent).toContain('Games');
    expect(gamesBtn.getAttribute('href')).toContain('/games');
    expect(gamesBtn.getAttribute('href')).toContain('accountIds=1');
    expect(gamesBtn.getAttribute('href')).toContain('filterMode=explicit');

    const manageBtn = actionButtons[1] as HTMLAnchorElement;
    expect(manageBtn.textContent).toContain('Manage accounts');
    expect(manageBtn.getAttribute('href')).toContain('/settings/accounts');
  });

  it('renders segmented switcher pills for 2 accounts and highlights active account', () => {
    const pills = fixture.nativeElement.querySelectorAll('.profile-switcher-pill');
    expect(pills.length).toBe(2);

    // The active pill should match account 1
    const activePill = fixture.nativeElement.querySelector('.profile-switcher-pill.active');
    expect(activePill).not.toBeNull();
    expect(activePill?.textContent).toContain('vokerg6');
  });

  it('renders account switcher pills as route links with current-page semantics', () => {
    const pills = fixture.nativeElement.querySelectorAll(
      '.profile-switcher-pill',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(pills.length).toBe(2);

    const activePill = Array.from(pills).find((pill) => pill.classList.contains('active'));
    expect(activePill?.tagName).toBe('A');
    expect(activePill?.getAttribute('aria-current')).toBe('page');
    expect(activePill?.getAttribute('role')).toBeNull();

    const inactivePill = Array.from(pills).find((pill) => !pill.classList.contains('active'));
    expect(inactivePill?.getAttribute('href')).toContain('/progress/accounts/2');
    expect(inactivePill?.getAttribute('aria-current')).toBeNull();
  });
});
