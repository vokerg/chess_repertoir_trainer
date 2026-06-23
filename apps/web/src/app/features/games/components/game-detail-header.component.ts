import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ImportedGameAnalysisProgress } from '../data-access/imported-game-analysis.service';
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
  readonly analysisProgress = input.required<ImportedGameAnalysisProgress>();
  readonly analyze = output<boolean>();

  protected readonly analysisAction = computed(() => {
    const game = this.game();
    const progress = this.analysisProgress();
    const force = canForceReanalyse(game);

    return {
      force,
      disabled: progress.running || game?.analysis.status === 'RUNNING',
      label:
        progress.running || game?.analysis.status === 'RUNNING'
          ? 'Analysing...'
          : force
            ? 'Force re-analysis'
            : 'Analyse',
    };
  });

  protected readonly providerLabel = providerLabel;
  protected readonly playerLabel = playerLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly timeControlLabel = timeControlLabel;
}

function canForceReanalyse(game: ImportedGameDetail | null): boolean {
  const status = game?.analysis.status;
  return status === 'RUNNING' || status === 'FAILED' || status === 'COMPLETED';
}
