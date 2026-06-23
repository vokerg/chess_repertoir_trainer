import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ImportedGameAnalysisProgress } from '../data-access/imported-game-analysis.service';
import { ImportedGameDetail } from '../data-access/games.models';
import { accuracyLabel, colorLabel, resultLabel } from '../helpers/game-detail-labels';

@Component({
  selector: 'app-game-summary',
  standalone: true,
  templateUrl: './game-summary.component.html',
  styleUrl: './game-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSummaryComponent {
  readonly game = input.required<ImportedGameDetail>();
  readonly analysisProgress = input.required<ImportedGameAnalysisProgress>();
  readonly analysisStatus = input.required<string>();
  readonly analysisSummary = input.required<string>();

  protected readonly result = computed(() => resultLabel(this.game().resultForUser));
  protected readonly color = computed(() => colorLabel(this.game().userColor));
  protected readonly userAccuracy = computed(() =>
    accuracyLabel(this.game().analysis.userAccuracy),
  );
  protected readonly whiteAccuracy = computed(() =>
    accuracyLabel(this.game().analysis.whiteAccuracy),
  );
  protected readonly blackAccuracy = computed(() =>
    accuracyLabel(this.game().analysis.blackAccuracy),
  );
}
