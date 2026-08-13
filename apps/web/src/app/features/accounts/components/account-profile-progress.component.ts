import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  AccountRatingStatsResponse,
  RatingSpeed,
  RatingSpeedFilter,
} from '../data-access/accounts.models';

type ProgressTab = 'milestones' | 'yearlyHighs';

interface MilestoneRow {
  id: string;
  rating: number;
  speed: string;
  reachedAt: string;
}

interface YearlyHighRow {
  year: number;
  values: Partial<Record<RatingSpeed, number>>;
}

@Component({
  selector: 'app-account-profile-progress',
  standalone: true,
  templateUrl: './account-profile-progress.component.html',
  styleUrl: './account-profile-progress.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileProgressComponent {
  readonly stats = input<AccountRatingStatsResponse | null>(null);
  readonly selectedSpeed = input<RatingSpeedFilter>('all');
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly tab = signal<ProgressTab>('milestones');
  protected readonly speeds = computed(() => {
    const selectedSpeed = this.selectedSpeed();
    const availableSpeeds = this.stats()?.data.speeds ?? [];

    return availableSpeeds.filter(
      (speed) => selectedSpeed === 'all' || speed.key === selectedSpeed,
    );
  });

  protected readonly milestones = computed<MilestoneRow[]>(() =>
    this.speeds()
      .flatMap((speed) =>
        speed.milestones.map((milestone) => ({
          id: `${speed.key}-${milestone.rating}`,
          rating: milestone.rating,
          speed: speed.label,
          reachedAt: milestone.reachedAt,
        })),
      )
      .sort(
        (left, right) =>
          right.rating - left.rating || right.reachedAt.localeCompare(left.reachedAt),
      )
      .slice(0, 8),
  );

  protected readonly yearlyHighs = computed<YearlyHighRow[]>(() => {
    const rows = new Map<number, YearlyHighRow>();
    for (const speed of this.speeds()) {
      for (const high of speed.yearlyHighs) {
        const row = rows.get(high.year) ?? { year: high.year, values: {} };
        row.values[speed.key] = high.rating;
        rows.set(high.year, row);
      }
    }
    return [...rows.values()].sort((left, right) => right.year - left.year);
  });

  protected selectTab(tab: ProgressTab): void {
    this.tab.set(tab);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  }
}
