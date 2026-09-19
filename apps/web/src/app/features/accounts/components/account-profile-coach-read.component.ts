import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AccountPerformanceStatsResponse,
  AccountRatingStatsResponse,
  RatingSpeedFilter,
} from '../data-access/accounts.models';

@Component({
  selector: 'app-account-profile-coach-read',
  standalone: true,
  templateUrl: './account-profile-coach-read.component.html',
  styleUrl: './account-profile-coach-read.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileCoachReadComponent {
  readonly stats = input<AccountRatingStatsResponse | null>(null);
  readonly performance = input<AccountPerformanceStatsResponse | null>(null);
  readonly selectedSpeed = input<RatingSpeedFilter>('all');

  protected readonly availablePools = computed(() => this.stats()?.data.speeds ?? []);

  protected readonly selectedPool = computed(() => {
    const selectedSpeed = this.selectedSpeed();
    return selectedSpeed === 'all'
      ? null
      : (this.availablePools().find((speed) => speed.key === selectedSpeed) ?? null);
  });

  protected readonly largestDeficit = computed(() => {
    const selectedPool = this.selectedPool();
    const pools = selectedPool ? [selectedPool] : this.availablePools();
    const speeds = pools.filter(
      (speed) => speed.current && speed.highest && speed.highest.rating > speed.current.rating,
    );
    return (
      [...speeds].sort(
        (left, right) =>
          right.highest!.rating -
          right.current!.rating -
          (left.highest!.rating - left.current!.rating),
      )[0] ?? null
    );
  });

  protected readonly bestTimeControl = computed(() => {
    const buckets =
      this.performance()?.timeControlWdl.filter((bucket) => bucket.gamesCount > 0) ?? [];
    return (
      [...buckets].sort((left, right) => (right.scorePercent ?? 0) - (left.scorePercent ?? 0))[0] ??
      null
    );
  });

  protected readonly leadText = computed(() => {
    const pool = this.selectedPool();
    return pool ? `${pool.label} is in focus` : 'Rating pools stay separate';
  });

  protected readonly leadDescription = computed(() => {
    const pool = this.selectedPool();
    if (pool) {
      return `${this.formatRating(pool.current?.rating)} current, with ${this.formatRating(
        pool.highest?.rating,
      )} at the top of the pool.`;
    }
    return 'Choose Bullet, Blitz, or Rapid to read one pool without mixing rating scales.';
  });

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : value.toLocaleString();
  }
}
