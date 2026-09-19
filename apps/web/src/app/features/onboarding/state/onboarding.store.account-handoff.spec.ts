import { TestBed } from '@angular/core/testing';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { of } from 'rxjs';
import { AccountsApiService } from '../../accounts/data-access/accounts-api.service';
import type { ExternalAccount } from '../../accounts/data-access/accounts.models';
import { OnboardingApiService } from '../data-access/onboarding-api.service';
import { OnboardingStore } from './onboarding.store';

describe('OnboardingStore account handoff', () => {
  let onboardingApi: jasmine.SpyObj<OnboardingApiService>;
  let accountsApi: jasmine.SpyObj<AccountsApiService>;
  let store: OnboardingStore;

  beforeEach(() => {
    onboardingApi = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', [
      'getReadiness', 'start', 'skip', 'finish', 'pause', 'resume', 'cancel', 'retry', 'restart', 'expand',
    ]);
    accountsApi = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', [
      'getAccounts', 'createAccount',
    ]);

    TestBed.configureTestingModule({
      providers: [
        OnboardingStore,
        { provide: OnboardingApiService, useValue: onboardingApi },
        { provide: AccountsApiService, useValue: accountsApi },
      ],
    });
    store = TestBed.inject(OnboardingStore);
  });

  it('creates a public account and selects it for explicit first-run confirmation', async () => {
    onboardingApi.getReadiness.and.returnValue(of(notStartedReadiness()));
    accountsApi.getAccounts.and.returnValue(of([]));
    const created = account(7, 'CHESS_COM', 'new-player');
    accountsApi.createAccount.and.returnValue(of(created));

    await store.initialize();
    store.setAccountProvider('CHESS_COM');
    store.setAccountUsername('  new-player  ');
    await store.createAccount();

    expect(accountsApi.createAccount).toHaveBeenCalledOnceWith({
      provider: 'CHESS_COM',
      username: 'new-player',
    });
    expect(store.selectedAccountId()).toBe(7);
    expect(store.accounts()).toEqual([created]);
    expect(store.notice()).toContain('Review it below, then start preparation.');
  });

  it('offers only non-target accounts and submits ADD_ACCOUNT for the confirmed choice', async () => {
    const source = preparationReadiness([
      { code: 'VIEW_HOME', destination: '/home' },
      { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
    ]);
    const expanded = {
      ...preparationReadiness([{ code: 'VIEW_ONBOARDING', destination: '/onboarding' }]),
      preparation: {
        ...preparationReadiness([]).preparation!,
        runId: 42,
        purpose: 'EXPANSION' as const,
        status: 'RUNNING',
      },
    };
    onboardingApi.getReadiness.and.returnValues(of(source), of(expanded));
    onboardingApi.expand.and.returnValue(of({
      runId: 42,
      purpose: 'EXPANSION',
      status: 'RUNNING',
      retryGeneration: 0,
      idempotent: false,
    }));
    const target = account(1, 'LICHESS', 'first');
    const additional = account(2, 'CHESS_COM', 'second');
    accountsApi.getAccounts.and.returnValue(of([target, additional]));

    await store.initialize();

    expect(store.expansionAccounts().map((item) => item.id)).toEqual([2]);
    expect(store.expansionAccountId()).toBe(2);

    await store.addSelectedAccountToPreparation();

    expect(onboardingApi.expand).toHaveBeenCalledOnceWith(41, {
      kind: 'ADD_ACCOUNT',
      accountId: 2,
    });
    expect(store.activeRunId()).toBe(42);
  });

  it('selects a newly created account for ADD_ACCOUNT without auto-starting expansion', async () => {
    onboardingApi.getReadiness.and.returnValue(of(preparationReadiness([
      { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
    ])));
    accountsApi.getAccounts.and.returnValue(of([account(1, 'LICHESS', 'first')]));
    accountsApi.createAccount.and.returnValue(of(account(3, 'CHESS_COM', 'third')));

    await store.initialize();
    store.setAccountProvider('CHESS_COM');
    store.setAccountUsername('third');
    await store.createAccount();

    expect(store.expansionAccountId()).toBe(3);
    expect(onboardingApi.expand).not.toHaveBeenCalled();
    expect(store.notice()).toContain('Confirm it below to expand preparation.');
  });
});

function account(
  id: number,
  provider: 'LICHESS' | 'CHESS_COM',
  username: string,
): ExternalAccount {
  return {
    id,
    provider,
    username,
    displayName: username,
    isActive: true,
    isDefaultProgressAccount: id === 1,
  } as ExternalAccount;
}

function notStartedReadiness(): OnboardingReadinessResponse {
  return {
    contractVersion: '2026-08-v1',
    disposition: { value: 'PENDING', reason: null, changedAt: null },
    presentationState: 'NOT_STARTED',
    preparation: null,
    attention: null,
    readiness: [
      { feature: 'games', state: 'locked', evidenceCount: 0 },
      { feature: 'openings', state: 'locked', evidenceCount: 0 },
      { feature: 'analysis', state: 'locked', evidenceCount: 0 },
      { feature: 'tactics', state: 'locked', evidenceCount: 0 },
    ],
    actions: [
      { code: 'START_ONBOARDING', destination: '/onboarding' },
      { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
    ],
    reveals: [],
    observedAt: '2026-09-04T05:00:00.000Z',
  };
}

function preparationReadiness(
  actions: OnboardingReadinessResponse['actions'],
): OnboardingReadinessResponse {
  return {
    contractVersion: '2026-08-v1',
    disposition: { value: 'PENDING', reason: null, changedAt: null },
    presentationState: 'NEEDS_ATTENTION',
    preparation: {
      runId: 41,
      status: 'NEEDS_ATTENTION',
      purpose: 'ONBOARDING',
      targetsTotal: 1,
      targetsTruncated: false,
      providerWindows: { completed: 1, total: 1, percentage: 100 },
      games: {
        committed: 0,
        indexed: 0,
        indexPending: 0,
        indexFailed: 0,
        analysed: 0,
        analysisPending: 0,
        analysisRunning: 0,
        analysisFailed: 0,
      },
      fixedCoverage: { index: null, analysis: null },
      technicalBatches: {
        batchCount: 0,
        queuedBatches: 0,
        runningBatches: 0,
        terminalBatches: 0,
        selectedTasks: 0,
        queuedTasks: 0,
        runningTasks: 0,
        completedTasks: 0,
        skippedTasks: 0,
        failedTasks: 0,
        cancelledTasks: 0,
        remainingTasks: 0,
      },
      latestBatches: [],
      targets: [{
        id: 11,
        accountId: 1,
        provider: 'LICHESS',
        username: 'first',
        ordinal: 0,
        importStatus: 'COMPLETED',
        providerWindows: { completed: 1, total: 1, percentage: 100 },
        games: {
          committed: 0,
          indexed: 0,
          indexPending: 0,
          indexFailed: 0,
          analysed: 0,
          analysisPending: 0,
          analysisRunning: 0,
          analysisFailed: 0,
        },
        milestones: {
          firstImportedAt: null,
          firstIndexedAt: null,
          firstAnalysedAt: null,
          coreReadyAt: null,
        },
      }],
      milestones: {
        firstImportedAt: null,
        firstIndexedAt: null,
        firstAnalysedAt: null,
        coreReadyAt: null,
        analysisCompletedAt: null,
      },
      latestMilestone: null,
    },
    attention: { code: 'NO_RECENT_GAMES', detail: 'No games found in the recent window.' },
    readiness: [
      { feature: 'games', state: 'locked', evidenceCount: 0 },
      { feature: 'openings', state: 'locked', evidenceCount: 0 },
      { feature: 'analysis', state: 'locked', evidenceCount: 0 },
      { feature: 'tactics', state: 'checked-empty', evidenceCount: 0 },
    ],
    actions,
    reveals: [],
    observedAt: '2026-09-04T05:00:00.000Z',
  };
}
