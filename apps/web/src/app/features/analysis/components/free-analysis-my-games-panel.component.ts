import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { OpeningAnalysisGame } from '../../../shared/games/position-moves/position-game-moves.models';
import { PositionTopGamesComponent } from '../../../shared/games/position-moves/position-top-games.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../shared/ui/ui-shell.model';

@Component({
  selector: 'app-free-analysis-my-games-panel',
  standalone: true,
  imports: [PanelComponent, GameFilterPanelComponent, PositionTopGamesComponent],
  templateUrl: './free-analysis-my-games-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeAnalysisMyGamesPanelComponent {
  readonly actions = input<readonly UiShellAction[]>([]);
  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>({});
  readonly topGames = input<OpeningAnalysisGame[]>([]);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly filtersChange = output<GameFilters>();
  readonly apply = output<void>();
  readonly reset = output<void>();
}
