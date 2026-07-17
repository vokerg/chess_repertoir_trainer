import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportedGameDetail } from '../data-access/games.models';
import {
  gameDateLabel,
  playerLabel,
  providerLabel,
  timeControlLabel,
} from '../helpers/game-detail-labels';

@Component({
  selector: 'app-game-detail-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-detail-header.component.html',
  styleUrl: './game-detail-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDetailHeaderComponent {
  readonly game = input<ImportedGameDetail | null>(null);
  readonly title = input.required<string>();
  readonly selectedLabel = input.required<string>();
  readonly analysisRunning = input(false);
  readonly refreshingTags = input(false);
  readonly fullRefreshing = input(false);
  readonly analyze = output<boolean>();
  readonly refreshTags = output<void>();
  readonly fullRefresh = output<void>();

  protected readonly analysisAction = computed(() => {
    const game = this.game();
    const force = canForceReanalyse(game);
    return {
      force,
      disabled: !game || this.analysisRunning() || this.fullRefreshing(),
      label: this.analysisRunning()
        ? 'Analysis in background...'
        : force
          ? 'Force re-analysis'
          : 'Analyse',
    };
  });

  protected readonly refreshTagsAction = computed(() => ({
    disabled:
      !this.game()
      || this.refreshingTags()
      || this.fullRefreshing()
      || this.analysisRunning(),
    label: this.refreshingTags() ? 'Refreshing tags...' : 'Refresh tags',
  }));

  protected readonly fullRefreshAction = computed(() => ({
    disabled:
      !this.game()
      || this.fullRefreshing()
      || this.refreshingTags()
      || this.analysisRunning(),
    label: this.fullRefreshing() ? 'Full refresh in background...' : 'Full refresh',
  }));

  protected readonly providerLabel = providerLabel;
  protected readonly playerLabel = playerLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly timeControlLabel = timeControlLabel;
}

function canForceReanalyse(game: ImportedGameDetail | null): boolean {
  const status = game?.analysis.status;
  return status === 'RUNNING' || status === 'FAILED' || status === 'COMPLETED';
}
