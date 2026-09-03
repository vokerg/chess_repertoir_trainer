import { TestBed } from '@angular/core/testing';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { of, throwError } from 'rxjs';
import { AccountsApiService } from '../../accounts/data-access/accounts-api.service';
import { OnboardingApiService } from '../data-access/onboarding-api.service';
import { OnboardingStore } from './onboarding.store';

describe('OnboardingStore partial availability', () => {
  it('keeps authoritative preparation readable when the account list is unavailable', async () => {
    const onboardingApi = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', [
      'getReadiness', 'start', 'skip', 'finish', 'pause', 'resume', 'cancel', 'retry', 'restart', 'expand',
    ]);
    const accountsApi = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', ['getAccounts']);
    onboardingApi.getReadiness.and.returnValue(of(activeReadiness()));
    accountsApi.getAccounts.and.returnValue(throwError(() => ({ error: 'Account list unavailable.' })));

    TestBed.configureTestingModule({
      providers: [
        OnboardingStore,
        { provide: OnboardingApiService, useValue: onboardingApi },
        { provide: AccountsApiService, useValue: accountsApi },
      ],
    });
    const store = TestBed.inject(OnboardingStore);

    await store.initialize();

    expect(store.error()).toBeNull();
    expect(store.accountsError()).toBe('Account list unavailable.');
    expect(store.presentationState()).toBe('PREPARING');
    expect(store.activeRunId()).toBe(41);
    expect(store.readiness()?.preparation?.games.committed).toBe(12);
  });
});

function activeReadiness(): OnboardingReadinessResponse {
  return {
    contractVersion: '2026-08-v1',
    disposition: { value: 'PENDING', reason: null, changedAt: null },
    presentationState: 'PREPARING',
    preparation: {
      runId: 41,
      status: 'RUNNING',
      purpose: 'ONBOARDING',
      targetsTotal: 1,
      targetsTruncated: false,
      providerWindows: { completed: 1, total: null, percentage: null },
      games: {
        committed: 12,
        indexed: 8,
        indexPending: 4,
        indexFailed: 0,
        analysed: 3,
        analysisPending: 5,
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
        id: 7,
        accountId: 1,
        provider: 'LICHESS',
        username: 'player',
        ordinal: 0,
        importStatus: 'RUNNING',
        providerWindows: { completed: 1, total: null, percentage: null },
        games: {
          committed: 12,
          indexed: 8,
          indexPending: 4,
          indexFailed: 0,
          analysed: 3,
          analysisPending: 5,
          analysisRunning: 0,
          analysisFailed: 0,
        },
        milestones: {
          firstImportedAt: '2026-09-03T05:00:00.000Z',
          firstIndexedAt: '2026-09-03T05:05:00.000Z',
          firstAnalysedAt: '2026-09-03T05:10:00.000Z',
          coreReadyAt: null,
        },
      }],
      milestones: {
        firstImportedAt: '2026-09-03T05:00:00.000Z',
        firstIndexedAt: '2026-09-03T05:05:00.000Z',
        firstAnalysedAt: '2026-09-03T05:10:00.000Z',
        coreReadyAt: null,
        analysisCompletedAt: null,
      },
      latestMilestone: {
        kind: 'FIRST_ANALYSED',
        occurredAt: '2026-09-03T05:10:00.000Z',
      },
    },
    attention: null,
    readiness: [
      { feature: 'games', state: 'ready', evidenceCount: 12 },
      { feature: 'openings', state: 'partial', evidenceCount: 8 },
      { feature: 'analysis', state: 'partial', evidenceCount: 3 },
      { feature: 'tactics', state: 'locked', evidenceCount: 0 },
    ],
    actions: [
      { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
      { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
      { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
    ],
    reveals: [],
    observedAt: '2026-09-03T08:00:00.000Z',
  };
}
