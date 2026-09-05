import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import type { ExternalAccount } from '../../accounts/data-access/accounts.models';
import { OnboardingStore } from '../state/onboarding.store';
import { OnboardingPageComponent } from './onboarding-page.component';

describe('OnboardingPageComponent', () => {
  let fixture: ComponentFixture<OnboardingPageComponent>;
  let store: ReturnType<typeof storeStub>;

  beforeEach(async () => {
    store = storeStub();
    await TestBed.configureTestingModule({
      imports: [OnboardingPageComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(OnboardingPageComponent, {
        set: {
          providers: [{ provide: OnboardingStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(OnboardingPageComponent);
  });

  it('renders rate-limit attention with the canonical server actions, checked-empty readiness, and no fake reveal', () => {
    store.readiness.set(readiness({
      presentationState: 'PREPARING',
      attention: {
        code: 'IMPORT_RATE_LIMITED',
        detail: 'Provider retry window is still active.',
      },
      actions: [
        { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
        { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
        { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
        { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
      ],
      readiness: [
        { feature: 'games', state: 'partial', evidenceCount: 4 },
        { feature: 'openings', state: 'partial', evidenceCount: 2 },
        { feature: 'analysis', state: 'locked', evidenceCount: 0 },
        { feature: 'tactics', state: 'checked-empty', evidenceCount: 0 },
      ],
      reveals: [],
    }));

    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('Provider rate limit is delaying import');
    expect(content).toContain('Provider retry window is still active.');
    expect(content).toContain('Pause preparation');
    expect(content).toContain('Stop preparation');
    expect(content).toContain('Skip guidance');
    expect(content).toContain('checked empty');
    expect(content).not.toContain('IMPORT_RATE_LIMITED');
    expect(fixture.nativeElement.querySelector('.reveal-section')).toBeNull();
  });

  it('renders stalled reconciliation as a calm product state with deterministic server actions', () => {
    store.readiness.set(readiness({
      presentationState: 'PREPARING',
      attention: {
        code: 'RECONCILE_DUE_CRITICAL',
        detail: 'No reconciliation settlement has been observed yet.',
      },
      actions: [
        { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
        { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
        { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
        { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
      ],
    }));

    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('Preparation reconciliation has stalled');
    expect(content).toContain('No reconciliation settlement has been observed yet.');
    expect(content).toContain('Pause preparation');
    expect(content).toContain('Stop preparation');
    expect(content).toContain('Skip guidance');
    expect(content).not.toContain('RECONCILE_DUE_CRITICAL');
  });

  it('derives the preparation narrative only from persisted server milestones', () => {
    const findingGames = readiness({ presentationState: 'PREPARING', attention: null });
    findingGames.preparation!.status = 'RUNNING';
    findingGames.preparation!.milestones = {
      firstImportedAt: null,
      firstIndexedAt: null,
      firstAnalysedAt: null,
      coreReadyAt: null,
      analysisCompletedAt: null,
    };
    store.readiness.set(findingGames);
    fixture.detectChanges();
    expect(normalizedText(fixture)).toContain('Finding your recent games');

    findingGames.preparation!.milestones.firstImportedAt = '2026-09-04T04:00:00.000Z';
    store.readiness.set({ ...findingGames });
    fixture.detectChanges();
    expect(normalizedText(fixture)).toContain('Preparing opening evidence');

    findingGames.preparation!.milestones.firstIndexedAt = '2026-09-04T04:05:00.000Z';
    store.readiness.set({ ...findingGames });
    fixture.detectChanges();
    expect(normalizedText(fixture)).toContain('Analysing a first sample');
  });

  it('shows exact counts without an overall percentage when provider discovery is open', () => {
    const openDiscovery = readiness();
    openDiscovery.preparation!.providerWindows = { completed: 2, total: null, percentage: null };
    openDiscovery.preparation!.fixedCoverage = { index: null, analysis: null };
    store.readiness.set(openDiscovery);

    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('The total history window is still being discovered.');
    expect(content).toContain('No overall percentage while more provider history can still be discovered.');
    expect(content).not.toContain('%');
    expect(content).not.toContain('almost done');
    expect(content).not.toContain('expected completion');
    expect(content).not.toMatch(/\bETA\b/);
  });

  it('renders only server-supplied fixed percentages and exact task counters as advanced detail', () => {
    const fixed = readiness();
    fixed.preparation!.providerWindows = { completed: 2, total: 3, percentage: 66.67 };
    fixed.preparation!.fixedCoverage = {
      index: { settled: 6, total: 12, remaining: 6, percentage: 50 },
      analysis: { settled: 2, total: 8, remaining: 6, percentage: 25 },
    };
    fixed.preparation!.technicalBatches = {
      batchCount: 3,
      queuedBatches: 1,
      runningBatches: 1,
      terminalBatches: 1,
      selectedTasks: 20,
      queuedTasks: 3,
      runningTasks: 1,
      completedTasks: 4,
      skippedTasks: 4,
      failedTasks: 2,
      cancelledTasks: 0,
      remainingTasks: 10,
    };
    store.readiness.set(fixed);

    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('2 of 3 checked · 66.67%');
    expect(content).toContain('6 of 12 settled · 50%');
    expect(content).toContain('2 of 8 settled · 25%');
    const details = fixture.nativeElement.querySelector('.technical-details') as HTMLDetailsElement;
    expect(details.open).toBeFalse();
    const counterElements = fixture.nativeElement.querySelectorAll(
      '.technical-progress article',
    ) as NodeListOf<HTMLElement>;
    const counters = Array.from(counterElements).map((element) => ({
      label: element.querySelector('span')?.textContent?.trim(),
      value: element.querySelector('strong')?.textContent?.trim(),
    }));
    expect(counters).toEqual([
      { label: 'Selected', value: '20' },
      { label: 'Queued', value: '3' },
      { label: 'Running', value: '1' },
      { label: 'Failed', value: '2' },
      { label: 'Skipped', value: '4' },
      { label: 'Remaining', value: '10' },
    ]);
  });

  it('renders only server-supplied reveals with sample, scope, state, and canonical destination', () => {
    store.readiness.set(readiness({
      reveals: [{
        kind: 'IMPORTED_GAME',
        importedGameId: 77,
        accountId: 1,
        sampleCount: 12,
        evidenceState: 'ready',
        scope: { provider: 'LICHESS', username: 'first' },
        title: 'A recent rapid game is ready',
        detail: 'Opening evidence is available now.',
        destination: '/games/77',
      }],
    }));

    fixture.detectChanges();

    const reveal = fixture.nativeElement.querySelector('.reveal-card') as HTMLAnchorElement;
    expect(reveal.textContent).toContain('A recent rapid game is ready');
    expect(reveal.textContent).toContain('12 games · ready · Lichess · first');
    expect(reveal.textContent).toContain('Opening evidence is available now.');
    expect(reveal.getAttribute('href')).toBe('/games/77');
  });

  it('renders explicit additional-account expansion instead of the Settings destination', () => {
    const additional = account(2, 'CHESS_COM', 'second');
    store.accounts.set([account(1, 'LICHESS', 'first'), additional]);
    store.expansionAccounts.set([additional]);
    store.expansionAccountId.set(2);
    store.selectedExpansionAccount.set(additional);
    store.readiness.set(readiness({
      actions: [
        { code: 'VIEW_HOME', destination: '/home' },
        { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
      ],
    }));

    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('Try another account without replacing the first run.');
    expect(content).toContain('Add account to preparation');
    expect(content).not.toContain('ADD ACCOUNT');
  });
});

function storeStub() {
  const readinessSignal = signal<OnboardingReadinessResponse | null>(null);
  const accountsSignal = signal<ExternalAccount[]>([]);
  const expansionAccountsSignal = signal<ExternalAccount[]>([]);
  const selectedExpansionAccountSignal = signal<ExternalAccount | null>(null);
  return {
    loading: signal(false),
    error: signal<string | null>(null),
    notice: signal<string | null>(null),
    readiness: readinessSignal,
    accountsError: signal<string | null>(null),
    hasConnectedAccount: () => accountsSignal().length > 0,
    selectedAccountId: signal<number | null>(1),
    accounts: accountsSignal,
    accountProvider: signal<'LICHESS' | 'CHESS_COM'>('LICHESS'),
    accountUsername: signal(''),
    savingAccount: signal(false),
    accountFormError: signal<string | null>(null),
    mutating: signal(false),
    expansionAccounts: expansionAccountsSignal,
    expansionAccountId: signal<number | null>(null),
    selectedExpansionAccount: selectedExpansionAccountSignal,
    initialize: jasmine.createSpy('initialize'),
    selectAccount: jasmine.createSpy('selectAccount'),
    setAccountProvider: jasmine.createSpy('setAccountProvider'),
    setAccountUsername: jasmine.createSpy('setAccountUsername'),
    createAccount: jasmine.createSpy('createAccount'),
    start: jasmine.createSpy('start'),
    skip: jasmine.createSpy('skip'),
    selectExpansionAccount: jasmine.createSpy('selectExpansionAccount'),
    addSelectedAccountToPreparation: jasmine.createSpy('addSelectedAccountToPreparation'),
    expandOlderHistory: jasmine.createSpy('expandOlderHistory'),
    runAction: jasmine.createSpy('runAction'),
    hasAction: (code: string) => readinessSignal()?.actions.some((action) => action.code === code) ?? false,
  };
}

function readiness(
  overrides: Partial<OnboardingReadinessResponse> = {},
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
      providerWindows: { completed: 1, total: null, percentage: null },
      games: {
        committed: 12,
        indexed: 6,
        indexPending: 6,
        indexFailed: 0,
        analysed: 2,
        analysisPending: 4,
        analysisRunning: 0,
        analysisFailed: 0,
      },
      fixedCoverage: { index: null, analysis: null },
      technicalBatches: {
        batchCount: 1,
        queuedBatches: 0,
        runningBatches: 0,
        terminalBatches: 1,
        selectedTasks: 8,
        queuedTasks: 0,
        runningTasks: 0,
        completedTasks: 6,
        skippedTasks: 1,
        failedTasks: 1,
        cancelledTasks: 0,
        remainingTasks: 2,
      },
      latestBatches: [],
      targets: [{
        id: 11,
        accountId: 1,
        provider: 'LICHESS',
        username: 'first',
        ordinal: 0,
        importStatus: 'COMPLETED',
        providerWindows: { completed: 1, total: null, percentage: null },
        games: {
          committed: 12,
          indexed: 6,
          indexPending: 6,
          indexFailed: 0,
          analysed: 2,
          analysisPending: 4,
          analysisRunning: 0,
          analysisFailed: 0,
        },
        milestones: {
          firstImportedAt: '2026-09-04T04:00:00.000Z',
          firstIndexedAt: '2026-09-04T04:05:00.000Z',
          firstAnalysedAt: '2026-09-04T04:10:00.000Z',
          coreReadyAt: null,
        },
      }],
      milestones: {
        firstImportedAt: '2026-09-04T04:00:00.000Z',
        firstIndexedAt: '2026-09-04T04:05:00.000Z',
        firstAnalysedAt: '2026-09-04T04:10:00.000Z',
        coreReadyAt: null,
        analysisCompletedAt: null,
      },
      latestMilestone: {
        kind: 'FIRST_ANALYSED',
        occurredAt: '2026-09-04T04:10:00.000Z',
      },
    },
    attention: { code: 'INDEXING_PARTIAL', detail: 'Some indexing work is still pending.' },
    readiness: [
      { feature: 'games', state: 'ready', evidenceCount: 12 },
      { feature: 'openings', state: 'partial', evidenceCount: 6 },
      { feature: 'analysis', state: 'partial', evidenceCount: 2 },
      { feature: 'tactics', state: 'checked-empty', evidenceCount: 0 },
    ],
    actions: [{ code: 'VIEW_HOME', destination: '/home' }],
    reveals: [],
    observedAt: '2026-09-04T05:00:00.000Z',
    ...overrides,
  };
}

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

function normalizedText(fixture: ComponentFixture<OnboardingPageComponent>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}
