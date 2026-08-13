import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AccountPerformanceStatsResponse, RatingRangeKey } from '../data-access/accounts.models';

@Component({
  selector: 'app-account-profile-game-shape',
  standalone: true,
  templateUrl: './account-profile-game-shape.component.html',
  styleUrl: './account-profile-game-shape.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileGameShapeComponent {
  readonly stats = input<AccountPerformanceStatsResponse | null>(null);
  readonly range = input<RatingRangeKey>('1Y');

  protected readonly decisiveGames = computed(() => {
    const stats = this.stats();
    return stats ? stats.wdl.wins + stats.wdl.draws + stats.wdl.losses : 0;
  });

  protected readonly scorePercent = computed(() => {
    const stats = this.stats();
    const total = this.decisiveGames();
    return stats && total > 0
      ? Math.round(((stats.wdl.wins + stats.wdl.draws * 0.5) / total) * 100)
      : null;
  });

  protected readonly timeControls = computed(() =>
    (this.stats()?.timeControlWdl ?? []).slice(0, 3),
  );

  protected formatRating(value: number | null): string {
    return value === null ? '—' : value.toLocaleString();
  }
}
