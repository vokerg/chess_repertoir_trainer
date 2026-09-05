import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { of } from 'rxjs';
import { OnboardingApiService } from '../onboarding/data-access/onboarding-api.service';
import { HomeDashboardStore } from './home-dashboard.store';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent onboarding re-entry', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let onboardingApi: jasmine.SpyObj<OnboardingApiService>;
  let homeStore: ReturnType<typeof homeStoreStub>;

  beforeEach(async () => {
    onboardingApi = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', ['getReadiness']);
    homeStore = homeStoreStub();

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(HomePageComponent, {
        set: {
          providers: [
            { provide: HomeDashboardStore, useValue: homeStore },
            { provide: OnboardingApiService, useValue: onboardingApi },
          ],
        },
      })
      .compileComponents();
  });

  it('shows a dominant onboarding return before core readiness without blocking Home', async () => {
    onboardingApi.getReadiness.and.returnValue(of(readiness({
      disposition: { value: 'PENDING', reason: null, changedAt: null },
      presentationState: 'PREPARING',
      preparation: preparation('RUNNING'),
    })));

    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('Your chess is being prepared');
    expect(content).toContain('12 games found · 8 openings prepared · 3 analysed');
    expect(fixture.nativeElement.querySelector('.onboarding-reentry-primary')).not.toBeNull();
    expect(content).toContain('Pick up where your chess needs you most.');
  });

  it('switches to compact truthful core-ready treatment while deeper work continues', async () => {
    onboardingApi.getReadiness.and.returnValue(of(readiness({
      disposition: {
        value: 'COMPLETED',
        reason: 'CORE_READY',
        changedAt: '2026-09-04T05:00:00.000Z',
      },
      presentationState: 'CORE_READY',
      preparation: preparation('RUNNING'),
    })));

    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(fixture.nativeElement.querySelector('.onboarding-reentry-primary')).toBeNull();
    expect(fixture.nativeElement.querySelector('.onboarding-reentry-compact')).not.toBeNull();
    expect(content).toContain('Recent chess ready to use');
    expect(content).toContain('deeper analysis continues');
  });

  it('does not reinterpret skipped guidance as preparation readiness', async () => {
    onboardingApi.getReadiness.and.returnValue(of(readiness({
      disposition: {
        value: 'SKIPPED',
        reason: 'USER_SKIPPED',
        changedAt: '2026-09-04T05:00:00.000Z',
      },
      presentationState: 'SKIPPED',
      preparation: preparation('RUNNING'),
    })));

    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const content = normalizedText(fixture);
    expect(content).toContain('Onboarding guidance skipped');
    expect(content).toContain('Preparation running');
    expect(content).not.toContain('Recent chess ready to use');
  });

  it('fails open when onboarding readiness is temporarily unavailable', async () => {
    onboardingApi.getReadiness.and.throwError('readiness unavailable');

    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.onboarding-reentry')).toBeNull();
    expect(normalizedText(fixture)).toContain('Pick up where your chess needs you most.');
  });
});

function homeStoreStub() {
  return {
    loading: signal(false),
    error: signal<string | null>(null),
    warnings: signal<readonly string[]>([]),
    greeting: signal('Good morning, there.'),
    accountLabel: signal('No account connected'),
    syncLabel: signal('Not synced yet'),
    continueAction: signal({
      link: '/games',
      queryParams: undefined,
      eyebrow: 'REVIEW',
      title: 'Review recent games',
      description: 'Open your latest imported games.',
      meta: null,
    }),
    recommendations: signal<readonly unknown[]>([]),
    selectedAccount: signal(null),
    progress: signal({
      gamesCount: 0,
      scorePercent: null,
      wins: 0,
      draws: 0,
      losses: 0,
      trainingAttempts: 0,
      weakSublineCount: 0,
    }),
    todayActivity: signal(null),
    activityLoading: signal(false),
    activityError: signal<string | null>(null),
    activityNotice: signal<string | null>(null),
    load: jasmine.createSpy('load').and.resolveTo(),
    reload: jasmine.createSpy('reload').and.resolveTo(),
    loadActivity: jasmine.createSpy('loadActivity').and.resolveTo(),
  };
}

function readiness(
  overrides: Partial<OnboardingReadinessResponse>,
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
    observedAt: '2026-09-04T05:00:00.000Z',
    ...overrides,
  };
}

function preparation(status: string): NonNullable<OnboardingReadinessResponse['preparation']> {
  return {
    runId: 41,
    status,
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
    fixedCoverage: { index: null, analysis: null },
    technicalBatches: {
      batchCount: 1,
      queuedBatches: 0,
      runningBatches: 1,
      terminalBatches: 0,
      selectedTasks: 8,
      queuedTasks: 0,
      runningTasks: 1,
      completedTasks: 3,
      skippedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      remainingTasks: 5,
    },
    latestBatches: [],
    targets: [],
    milestones: {
      firstImportedAt: '2026-09-04T04:00:00.000Z',
      firstIndexedAt: '2026-09-04T04:05:00.000Z',
      firstAnalysedAt: '2026-09-04T04:10:00.000Z',
      coreReadyAt: '2026-09-04T04:20:00.000Z',
      analysisCompletedAt: null,
    },
    latestMilestone: {
      kind: 'CORE_READY',
      occurredAt: '2026-09-04T04:20:00.000Z',
    },
  };
}

function normalizedText(fixture: ComponentFixture<HomePageComponent>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}
