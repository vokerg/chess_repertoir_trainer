import { TestBed, discardPeriodicTasks, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { Subject, of } from 'rxjs';
import { AccountsApiService } from '../../accounts/data-access/accounts-api.service';
import type { ExternalAccount } from '../../accounts/data-access/accounts.models';
import { OnboardingApiService } from '../data-access/onboarding-api.service';
import { OnboardingStore } from './onboarding.store';

describe('OnboardingStore', () => {
  let store: OnboardingStore;
  let onboardingApi: jasmine.SpyObj<OnboardingApiService>;
  let accountsApi: jasmine.SpyObj<AccountsApiService>;

  beforeEach(() => {
    onboardingApi = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', [
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
    accountsApi = jasmine.createSpyObj<AccountsApiService>('AccountsApiService', ['getAccounts']);

    TestBed.configureTestingModule({
      providers: [
        OnboardingStore,
        { provide: OnboardingApiService, useValue: onboardingApi },
        { provide: AccountsApiService, useValue: accountsApi },
      ],
    });
    store = TestBed.inject(OnboardingStore);
  });

  it('uses the server readiness projection and selects an eligible connected account', async () => {
    const first = account(1, 'first', false, false);
    const preferred = account(2, 'preferred', true, true);
    onboardingApi.getReadiness.and.returnValue(of(readiness({
      presentationState: 'NOT_STARTED',
      actions: [
        { code: 'START_ONBOARDING', destination: '/onboarding' },
        { code: 'SKIP_ONBOARDING', destination: '/home' },
      ],
    })));
    accountsApi.getAccounts.and.returnValue(of([first, preferred]));

    await store.initialize();

    expect(store.presentationState()).toBe('NOT_STARTED');
    expect(store.canStart()).toBeTrue();
    expect(store.selectedAccountId()).toBe(preferred.id);
    expect(store.hasAction('SKIP_ONBOARDING')).toBeTrue();
  });

  it('prefers the account persisted on the active preparation target', async () => {
    const defaultAccount = account(1, 'default', true, true);
    const targetAccount = account(2, 'target', true, false);
    onboardingApi.getReadiness.and.returnValue(of(readiness({
      presentationState: 'PAUSED',
      preparation: preparation(targetAccount.id),
      actions: [{ code: 'RESUME_PREPARATION', destination: '/onboarding' }],
    })));
    accountsApi.getAccounts.and.returnValue(of([defaultAccount, targetAccount]));

    await store.initialize();

    expect(store.selectedAccountId()).toBe(targetAccount.id);
    expect(store.activeRunId()).toBe(41);
  });

  it('refreshes from the server after accepting a lifecycle command', async () => {
    const initial = readiness({
      presentationState: 'PAUSED',
      preparation: preparation(1),
      actions: [{ code: 'RESUME_PREPARATION', destination: '/onboarding' }],
    });
    const resumed = readiness({
      presentationState: 'PREPARING',
      preparation: { ...preparation(1), status: 'RUNNING' },
      actions: [{ code: 'PAUSE_PREPARATION', destination: '/onboarding' }],
    });
    onboardingApi.getReadiness.and.returnValues(of(initial), of(resumed));
    onboardingApi.resume.and.returnValue(of({
      runId: 41,
      purpose: 'ONBOARDING',
      status: 'RUNNING',
      retryGeneration: 0,
      idempotent: false,
    }));
    accountsApi.getAccounts.and.returnValue(of([account(1, 'player', true, true)]));

    await store.initialize();
    await store.runAction('RESUME_PREPARATION');

    expect(onboardingApi.resume).toHaveBeenCalledOnceWith(41);
    expect(onboardingApi.getReadiness).toHaveBeenCalledTimes(2);
    expect(store.presentationState()).toBe('PREPARING');
    expect(store.notice()).toBe('Preparation resumed.');
  });

  it('keeps polling a durable active run when skipped presentation masks its lifecycle state', fakeAsync(() => {
    const skippedRunning = readiness({
      disposition: {
        value: 'SKIPPED',
        reason: 'USER_SKIPPED',
        changedAt: '2026-09-03T06:10:00.000Z',
      },
      presentationState: 'SKIPPED',
      preparation: { ...preparation(1), status: 'RUNNING' },
      actions: [{ code: 'VIEW_HOME', destination: '/home' }],
    });
    onboardingApi.getReadiness.and.returnValue(of(skippedRunning));
    accountsApi.getAccounts.and.returnValue(of([account(1, 'player', true, true)]));

    void store.initialize();
    flushMicrotasks();
    expect(onboardingApi.getReadiness).toHaveBeenCalledTimes(1);

    tick(3_000);
    flushMicrotasks();

    expect(onboardingApi.getReadiness).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));

  it('skips guidance without cancelling an already accepted preparation', async () => {
    const running = readiness({
      presentationState: 'PREPARING',
      preparation: { ...preparation(1), status: 'RUNNING' },
      actions: [
        { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
        { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
        { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
        { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
      ],
    });
    const skipped = readiness({
      disposition: {
        value: 'SKIPPED',
        reason: 'USER_SKIPPED',
        changedAt: '2026-09-03T06:10:00.000Z',
      },
      presentationState: 'SKIPPED',
      preparation: { ...preparation(1), status: 'RUNNING' },
      actions: [
        { code: 'VIEW_HOME', destination: '/home' },
        { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
        { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
        { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
      ],
    });
    onboardingApi.getReadiness.and.returnValues(of(running), of(skipped));
    onboardingApi.skip.and.returnValue(of({
      disposition: 'SKIPPED',
      reason: 'USER_SKIPPED',
      changedAt: '2026-09-03T06:10:00.000Z',
      idempotent: false,
    }));
    accountsApi.getAccounts.and.returnValue(of([account(1, 'player', true, true)]));

    await store.initialize();
    await store.skip();

    expect(onboardingApi.skip).toHaveBeenCalledTimes(1);
    expect(onboardingApi.cancel).not.toHaveBeenCalled();
    expect(store.readiness()?.disposition.value).toBe('SKIPPED');
    expect(store.readiness()?.preparation?.status).toBe('RUNNING');
  });

  it('ignores an older readiness response that resolves after a newer refresh', async () => {
    const olderResponse = new Subject<OnboardingReadinessResponse>();
    const newerResponse = new Subject<OnboardingReadinessResponse>();
    onboardingApi.getReadiness.and.returnValues(olderResponse, newerResponse);

    const olderRefresh = store.refresh();
    const newerRefresh = store.refresh();

    newerResponse.next(readiness({ presentationState: 'CORE_READY' }));
    newerResponse.complete();
    await newerRefresh;

    olderResponse.next(readiness({ presentationState: 'PREPARING' }));
    olderResponse.complete();
    await olderRefresh;

    expect(store.presentationState()).toBe('CORE_READY');
  });
});

function account(
  id: number,
  username: string,
  isActive: boolean,
  isDefaultProgressAccount: boolean,
): ExternalAccount {
  return {
    id,
    provider: 'LICHESS',
    username,
    displayName: username,
    isActive,
    isDefaultProgressAccount,
  } as ExternalAccount;
}

function readiness(
  overrides: Partial<OnboardingReadinessResponse> = {},
): OnboardingReadinessResponse {
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
    actions: [],
    reveals: [],
    observedAt: '2026-09-03T06:00:00.000Z',
    ...overrides,
  };
}

function preparation(accountId: number): NonNullable<OnboardingReadinessResponse['preparation']> {
  return {
    runId: 41,
    status: 'PAUSED',
    purpose: 'ONBOARDING',
    targetsTotal: 1,
    targetsTruncated: false,
    providerWindows: { completed: 2, total: 3, percentage: 66.67 },
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
    fixedCoverage: {
      index: { settled: 8, total: 12, remaining: 4, percentage: 66.67 },
      analysis: { settled: 3, total: 8, remaining: 5, percentage: 37.5 },
    },
    technicalBatches: {
      batchCount: 2,
      queuedBatches: 0,
      runningBatches: 0,
      terminalBatches: 2,
      selectedTasks: 20,
      queuedTasks: 0,
      runningTasks: 0,
      completedTasks: 11,
      skippedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      remainingTasks: 9,
    },
    latestBatches: [],
    targets: [{
      id: 7,
      accountId,
      provider: 'LICHESS',
      username: 'player',
      ordinal: 0,
      importStatus: 'PAUSED',
      providerWindows: { completed: 2, total: 3, percentage: 66.67 },
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
  };
}
