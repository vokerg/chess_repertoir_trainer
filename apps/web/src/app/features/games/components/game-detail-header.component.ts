import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportedGameDetail } from '../data-access/games.models';
import {
  gameDateLabel,
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
  readonly fullRefreshing = input(false);
  readonly fullRefresh = output<void>();

  protected readonly fullRefreshAction = computed(() => {
    const game = this.game();
    return {
      disabled: !game || game.analysis.status === 'RUNNING' || this.fullRefreshing(),
      label: this.fullRefreshing() ? 'Submitting...' : 'Full refresh',
    };
  });

  protected readonly providerLabel = providerLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly timeControlLabel = timeControlLabel;
}
