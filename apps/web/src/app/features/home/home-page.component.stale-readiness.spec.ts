import { TestBed } from '@angular/core/testing';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { Subject } from 'rxjs';
import { OnboardingApiService } from '../onboarding/data-access/onboarding-api.service';
import { HomeDashboardStore } from './home-dashboard.store';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent onboarding readiness ordering', () => {
  it('keeps the newest readiness response when an older request settles later', async () => {
    const first = new Subject<OnboardingReadinessResponse>();
    const second = new Subject<OnboardingReadinessResponse>();
    const onboardingApi = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', ['getReadiness']);
    onboardingApi.getReadiness.and.returnValues(first.asObservable(), second.asObservable());
    const homeStore = {
      load: jasmine.createSpy('load').and.resolveTo(),
      reload: jasmine.createSpy('reload').and.resolveTo(),
      loadActivity: jasmine.createSpy('loadActivity').and.resolveTo(),
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
    })
      .overrideComponent(HomePageComponent, {
        set: {
          template: '',
          providers: [
            { provide: HomeDashboardStore, useValue: homeStore },
            { provide: OnboardingApiService, useValue: onboardingApi },
          ],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance as unknown as {
      reload(): void;
      onboarding(): OnboardingReadinessResponse | null;
    };

    page.reload();
    second.next(readiness('CORE_READY'));
    second.complete();
    await Promise.resolve();
    expect(page.onboarding()?.presentationState).toBe('CORE_READY');

    first.next(readiness('PREPARING'));
    first.complete();
    await Promise.resolve();
    expect(page.onboarding()?.presentationState).toBe('CORE_READY');
  });
});

function readiness(
  presentationState: OnboardingReadinessResponse['presentationState'],
): OnboardingReadinessResponse {
  return {
    contractVersion: '2026-08-v1',
    disposition: { value: 'PENDING', reason: null, changedAt: null },
    presentationState,
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
    observedAt: '2026-09-05T10:00:00.000Z',
  };
}
