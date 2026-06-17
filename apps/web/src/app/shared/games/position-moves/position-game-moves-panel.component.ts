import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { ImportedGameFacetsResponse } from '../game.models';
import { GameFilterPanelComponent } from '../filters/game-filter-panel.component';
import { GameFilters } from '../filters/game-filter.model';
import { summaryGameFilters } from '../filters/game-filter-summary';
import { PositionTopGamesComponent } from './position-top-games.component';
import { providerLabel, scoreLabel, wdlLabel } from './position-game-moves.helpers';
import { OpeningAnalysisResponse, OpeningNextMove, OpeningWdl } from './position-game-moves.models';

const EMPTY_WDL: OpeningWdl = { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null };

@Component({
  selector: 'app-position-game-moves-panel',
  standalone: true,
  imports: [GameFilterPanelComponent, PositionTopGamesComponent],
  templateUrl: './position-game-moves-panel.component.html',
  styleUrl: './position-game-moves-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionGameMovesPanelComponent implements OnInit {
  readonly analysis = input<OpeningAnalysisResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>({});
  readonly filtersCollapsedInitially = input(false);
  readonly compact = input(false);
  readonly showTopGames = input(false);
  readonly title = input('Moves from your games');
  readonly subtitle = input(
    'Each row is a move you actually played or faced from this exact normalized position.',
  );

  readonly filtersChange = output<GameFilters>();
  readonly applyFilters = output<void>();
  readonly resetFilters = output<void>();
  readonly refresh = output<void>();
  readonly moveSelected = output<OpeningNextMove>();

  protected readonly filtersCollapsed = signal(false);
  protected readonly loadingMoveRows = [0, 1, 2];
  protected readonly positionWdl = computed(() => this.analysis()?.games ?? EMPTY_WDL);
  protected readonly filterSummary = computed(() => summaryGameFilters(this.filters()));
  protected readonly providerLabel = providerLabel;
  protected readonly wdlLabel = wdlLabel;
  protected readonly scoreLabel = scoreLabel;

  ngOnInit(): void {
    this.filtersCollapsed.set(this.filtersCollapsedInitially());
  }
}
