import { TestBed } from '@angular/core/testing';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { of } from 'rxjs';
import { AccountsApiService } from '../../accounts/data-access/accounts-api.service';
import type { ExternalAccount } from '../../accounts/data-access/accounts.models';
import { OnboardingApiService } from '../data-access/onboarding-api.service';
import { OnboardingStore } from './onboarding.store';

describe('OnboardingStore expansion recovery', () => {
  it('turns the advertised no-games range expansion into an older-history run', async () => {
    const onboardingApi = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', [
      'getReadiness',
      'start',
      'skip',
      'finish',
      'pause',
      'resume',
      'cancel',
      'retry',
      'restart',
      'expand',
    ]);
    const accountsApi = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', ['getAccounts']);
    const source = readiness(41, 'ONBOARDING', 'NEEDS_ATTENTION', 'NEEDS_ATTENTION');
    const expanded = readiness(42, 'EXPANSION', 'RUNNING', 'PREPARING');

    onboardingApi.getReadiness.and.returnValues(of(source), of(expanded));
    onboardingApi.expand.and.returnValue(of({
      runId: 42,
      purpose: 'EXPANSION',
      status: 'RUNNING',
      retryGeneration: 0,
      idempotent: false,
    }));
    accountsApi.getAccounts.and.returnValue(of([account()]));

    TestBed.configureTestingModule({
      providers: [
        OnboardingStore,
        { provide: OnboardingApiService, useValue: onboardingApi },
        { provide: AccountsApiService, useValue: accountsApi },
      ],
    });
    const store = TestBed.inject(OnboardingStore);

    await store.initialize();
    await store.expandOlderHistory();

    expect(onboardingApi.expand).toHaveBeenCalledOnceWith(41, {
      kind: 'OLDER_HISTORY',
      accountId: 1,
    });
    expect(store.activeRunId()).toBe(42);
    expect(store.notice()).toBe('Older game history expansion started.');
  });
});

function account(): ExternalAccount {
  return {
    id: 1,
    provider: 'LICHESS',
    username: 'player',
    displayName: 'player',
    isActive: true,
    isDefaultProgressAccount: true,
  } as ExternalAccount;
}

function readiness(
  runId: number,
  purpose: 'ONBOARDING' | 'EXPANSION',
  runStatus: string,
  presentationState: OnboardingReadinessResponse['presentationState'],
): OnboardingReadinessResponse {
  return {
    contractVersion: '2026-08-v1',
    disposition: { value: 'PENDING', reason: null, changedAt: null },
    presentationState,
    preparation: {
      runId,
      status: runStatus,
      purpose,
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
        id: runId,
        accountId: 1,
        provider: 'LICHESS',
        username: 'player',
        ordinal: 0,
        importStatus: runStatus,
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
    attention: runStatus === 'NEEDS_ATTENTION'
      ? { code: 'NO_RECENT_GAMES', detail: 'No games found in the recent window.' }
      : null,
    readiness: [
      { feature: 'games', state: 'locked', evidenceCount: 0 },
      { feature: 'openings', state: 'locked', evidenceCount: 0 },
      { feature: 'analysis', state: 'locked', evidenceCount: 0 },
      { feature: 'tactics', state: 'locked', evidenceCount: 0 },
    ],
    actions: runStatus === 'NEEDS_ATTENTION'
      ? [{ code: 'EXPAND_RANGE', destination: '/onboarding' }]
      : [{ code: 'VIEW_ONBOARDING', destination: '/onboarding' }],
    reveals: [],
    observedAt: '2026-09-03T08:00:00.000Z',
  };
}
