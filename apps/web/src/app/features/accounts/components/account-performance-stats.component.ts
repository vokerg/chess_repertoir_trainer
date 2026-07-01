import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountPerformanceGameHighlight, AccountPerformanceStatsResponse } from '../data-access/accounts.models';

@Component({
  selector: 'app-account-performance-stats',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-performance-stats.component.html',
  styleUrl: './account-performance-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPerformanceStatsComponent {
  readonly stats = input<AccountPerformanceStatsResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly totalDecisive = computed(() => {
    const stats = this.stats();
    return stats ? stats.wdl.wins + stats.wdl.draws + stats.wdl.losses : 0;
  });

  protected scorePercent(): number | null {
    const stats = this.stats();
    const total = this.totalDecisive();
    if (!stats || total === 0) return null;
    return Math.round(((stats.wdl.wins + stats.wdl.draws * 0.5) / total) * 100);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(value),
    );
  }

  protected highlightLabel(game: AccountPerformanceGameHighlight | null): string {
    if (!game) return 'None';
    const opponent = game.opponentUsername ? `vs ${game.opponentUsername}` : 'Unknown opponent';
    const rating = game.opponentRating === null ? '' : ` (${game.opponentRating})`;
    return `${opponent}${rating}`;
  }
}
