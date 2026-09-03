import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OnboardingReadinessResponse } from '@chess-trainer/contracts/onboarding';
import { firstValueFrom } from 'rxjs';
import { AccountsApiService } from '../accounts/data-access/accounts-api.service';
import { ActivityFeedApiService } from '../activity-feed';
import { LibraryApiService } from '../library/data-access/library-api.service';
import { OnboardingApiService } from '../onboarding/data-access/onboarding-api.service';
import { TodayActivityCardComponent } from './components/today-activity-card.component';
import { HomeDashboardStore } from './home-dashboard.store';

interface HomeShortcut {
  label: string;
  description: string;
  link: string;
  marker: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, TodayActivityCardComponent],
  providers: [
    AccountsApiService,
    ActivityFeedApiService,
    LibraryApiService,
    OnboardingApiService,
    HomeDashboardStore,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css', './home-onboarding.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  protected readonly store = inject(HomeDashboardStore);
  private readonly onboardingApi = inject(OnboardingApiService);
  protected readonly onboarding = signal<OnboardingReadinessResponse | null>(null);
  protected readonly shortcuts: readonly HomeShortcut[] = [
    { label: 'Study', description: 'Train repertoire lines', link: '/library', marker: '01' },
    { label: 'Games', description: 'Review imported games', link: '/games', marker: '02' },
    { label: 'Openings', description: 'Explore positions', link: '/opening-analysis', marker: '03' },
    { label: 'Courses', description: 'Build your repertoire', link: '/courses', marker: '04' },
    { label: 'Analysis', description: 'Open the free board', link: '/analysis', marker: '05' },
    { label: 'Progress', description: 'Inspect performance', link: '/progress', marker: '06' },
  ];

  ngOnInit(): void {
    void this.store.load();
    void this.loadOnboarding();
  }

  protected reload(): void {
    void this.store.reload();
    void this.loadOnboarding();
  }

  protected reloadActivity(): void {
    void this.store.loadActivity();
  }

  protected onboardingNeedsFocus(readiness: OnboardingReadinessResponse): boolean {
    return readiness.disposition.value === 'PENDING'
      && readiness.presentationState !== 'CORE_READY'
      && readiness.presentationState !== 'COMPLETE';
  }

  protected onboardingHeadline(readiness: OnboardingReadinessResponse): string {
    switch (readiness.presentationState) {
      case 'NOT_STARTED':
        return 'Prepare your recent chess';
      case 'PAUSED':
      case 'PAUSE_REQUESTED':
        return 'Preparation is paused';
      case 'NEEDS_ATTENTION':
      case 'FAILED':
      case 'CANCELLED':
        return 'Preparation needs attention';
      case 'CANCEL_REQUESTED':
        return 'Preparation is stopping safely';
      default:
        return 'Your chess is being prepared';
    }
  }

  private async loadOnboarding(): Promise<void> {
    try {
      this.onboarding.set(await firstValueFrom(this.onboardingApi.getReadiness()));
    } catch {
      // Home remains usable if the supplemental onboarding projection is temporarily unavailable.
      this.onboarding.set(null);
    }
  }
}
