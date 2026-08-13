import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AccountPerformanceStatsResponse,
  AccountRatingStatsResponse,
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

  protected readonly strongestPool = computed(() => {
    const speeds = this.stats()?.data.speeds.filter((speed) => speed.current !== null) ?? [];
    return (
      [...speeds].sort(
        (left, right) => (right.current?.rating ?? 0) - (left.current?.rating ?? 0),
      )[0] ?? null
    );
  });

  protected readonly largestDeficit = computed(() => {
    const speeds =
      this.stats()?.data.speeds.filter((speed) => speed.current && speed.highest) ?? [];
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

  protected readonly strongestText = computed(() => {
    const pool = this.strongestPool();
    return pool ? `${pool.label} is your anchor pool` : 'Your rating story is still taking shape';
  });

  protected formatRating(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : value.toLocaleString();
  }
}
