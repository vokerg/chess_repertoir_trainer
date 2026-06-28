import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AccountRatingStatsMilestone,
  AccountRatingStatsResponse,
  AccountRatingStatsSpeedProjection,
  AccountRatingStatsYearlyPeak,
} from '../data-access/accounts.models';

interface RatingStatsSpeedView {
  speed: AccountRatingStatsSpeedProjection;
  latestYearlyHigh: AccountRatingStatsYearlyPeak | null;
  topMilestones: AccountRatingStatsMilestone[];
}

@Component({
  selector: 'app-account-rating-stats',
  standalone: true,
  templateUrl: './account-rating-stats.component.html',
  styleUrl: './account-rating-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRatingStatsComponent {
  readonly stats = input<AccountRatingStatsResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly speedViews = computed<RatingStatsSpeedView[]>(() =>
    (this.stats()?.data.speeds ?? []).map((speed) => ({
      speed,
      latestYearlyHigh: speed.yearlyHighs.at(-1) ?? null,
      topMilestones: speed.milestones.slice(-4).reverse(),
    })),
  );

  protected readonly hasStats = computed(() => this.speedViews().some((view) => view.speed.gamesCount > 0));

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(value),
    );
  }
}
