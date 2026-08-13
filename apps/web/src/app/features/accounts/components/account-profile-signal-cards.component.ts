import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
  AccountPerformanceStatsResponse,
  RatingRangeKey,
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
  readonly selectedRange = input<RatingRangeKey>('1Y');
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

  protected readonly totalGames = computed(() => this.performance()?.gamesCount ?? 0);

  protected readonly scopeLabel = computed(() =>
    this.selectedSpeed() === 'all'
      ? 'all speeds'
      : `${this.activeSpeed()?.label ?? 'Selected speed'} games`,
  );

  protected readonly momentumTone = computed<'positive' | 'negative' | 'neutral'>(() => {
    const value = this.momentum();
    if (value === null || value === 0) return 'neutral';
    return value > 0 ? 'positive' : 'negative';
  });

  protected readonly miniBars = computed(() => {
    const selectedSpeed = this.selectedSpeed();
    if (selectedSpeed === 'all') return [];

    const points = this.history()?.series.find((series) => series.key === selectedSpeed)?.points ?? [];
    if (points.length < 2) return [];

    const values = [...points]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((point) => point.rating);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const span = maximum - minimum;
    const sampleCount = Math.min(12, values.length);

    return Array.from({ length: sampleCount }, (_, index) => {
      const sourceIndex = Math.round((index * (values.length - 1)) / (sampleCount - 1));
      return span === 0 ? 55 : 28 + ((values[sourceIndex] - minimum) / span) * 72;
    });
  });

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

  protected rangeLabel(): string {
    const labels: Record<RatingRangeKey, string> = {
      '1M': 'Last 30 days',
      '3M': 'Last 3 months',
      '6M': 'Last 6 months',
      YTD: 'Year to date',
      '1Y': 'Last 12 months',
      '3Y': 'Last 3 years',
      '5Y': 'Last 5 years',
      ALL: 'All time',
    };
    return labels[this.selectedRange()];
  }
}
