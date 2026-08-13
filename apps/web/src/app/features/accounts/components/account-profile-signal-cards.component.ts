import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
  AccountPerformanceStatsResponse,
  RatingSpeed,
  RatingSpeedFilter,
} from '../data-access/accounts.models';

const SPEEDS: readonly RatingSpeed[] = ['bullet', 'blitz', 'rapid'];

@Component({
  selector: 'app-account-profile-signal-cards',
  standalone: true,
  templateUrl: './account-profile-signal-cards.component.html',
  styleUrl: './account-profile-signal-cards.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileSignalCardsComponent {
  readonly stats = input<AccountRatingStatsResponse | null>(null);
  readonly performance = input<AccountPerformanceStatsResponse | null>(null);
  readonly history = input<AccountRatingHistoryResponse | null>(null);
  readonly selectedSpeed = input<RatingSpeedFilter>('all');
  readonly loading = input(false);

  protected readonly speedViews = computed(() => {
    const speeds = this.stats()?.data.speeds ?? [];
    return SPEEDS.map((key) => speeds.find((speed) => speed.key === key)).filter(
      (speed) => speed !== undefined,
    );
  });

  protected readonly activeSpeed = computed(() => {
    const selected = this.selectedSpeed();
    return selected === 'all'
      ? null
      : (this.speedViews().find((speed) => speed.key === selected) ?? null);
  });

  protected readonly momentum = computed(() => {
    if (this.selectedSpeed() === 'all') return null;
    const series = this.history()?.series.find(
      (candidate) => candidate.key === this.selectedSpeed(),
    );
    if (!series || series.points.length < 2) return null;
    const points = [...series.points].sort((left, right) => left.date.localeCompare(right.date));
    return points.at(-1)!.rating - points[0].rating;
  });

  protected readonly totalGames = computed(
    () => this.stats()?.gamesCount ?? this.performance()?.gamesCount ?? 0,
  );

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : value.toLocaleString();
  }

  protected deltaLabel(value: number | null): string {
    if (value === null) return 'select a speed';
    return `${value >= 0 ? '+' : '−'}${Math.abs(value)} in range`;
  }

  protected momentumLabel(value: number | null): string {
    if (value === null) return '—';
    return `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
  }

  protected momentumWidth(value: number | null): number {
    return value === null ? 0 : Math.min(100, Math.max(8, 50 + value / 2));
  }
}
