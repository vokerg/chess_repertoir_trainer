import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { emptyImportedGameFacets, ImportedGameFacetsResponse } from '../game.models';
import { GameFilterPanelComponent } from '../filters/game-filter-panel.component';
import { GameFilters } from '../filters/game-filter.model';
import { summaryGameFilters } from '../filters/game-filter-summary';
import { uciMoveToSan } from '../../chess/notation/uci-to-san.helper';
import { ProgressiveListComponent } from '../../ui/progressive-list/progressive-list.component';
import { providerLabel, scoreLabel, wdlLabel } from './position-game-moves.helpers';
import { OpeningAnalysisGame, OpeningAnalysisResponse, OpeningNextMove, OpeningWdl } from './position-game-moves.models';
import { PositionTopGamesComponent } from './position-top-games.component';

const EMPTY_WDL: OpeningWdl = { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null };

interface PositionMoveViewModel {
  move: OpeningNextMove;
  san: string;
}

@Component({
  selector: 'app-position-game-moves-panel',
  standalone: true,
  imports: [GameFilterPanelComponent, PositionTopGamesComponent, ProgressiveListComponent],
  templateUrl: './position-game-moves-panel.component.html',
  styleUrl: './position-game-moves-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionGameMovesPanelComponent implements OnInit {
  readonly analysis = input<OpeningAnalysisResponse | null>(null);
  readonly loading = input(false);
  readonly topGames = input<OpeningAnalysisGame[]>([]);
  readonly topGamesLoading = input(false);
  readonly error = input<string | null>(null);
  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly filtersCollapsedInitially = input(false);
  readonly compact = input(false);
  readonly showTopGames = input(false);
  readonly showPositionWdl = input(true);
  readonly initialVisibleMoveCount = input(4);
  readonly initialVisibleGameCount = input(4);
  readonly topGamesTitle = input('Top games in this position');
  readonly topGamesSubtitle = input('Most recent games that reached this exact normalized position.');
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
  protected readonly moveViewModels = computed<readonly PositionMoveViewModel[]>(() => {
    const analysis = this.analysis();
    if (!analysis) return [];
    return analysis.nextMoves.map((move) => ({
      move,
      san: move.moveSan || this.sanLabel(analysis.fen, move.moveUci),
    }));
  });
  protected readonly filterSummary = computed(() => summaryGameFilters(this.filters()));
  protected readonly listResetKey = computed(() => `${this.analysis()?.normalizedFen ?? ''}:${this.filterSummary()}`);
  protected readonly providerLabel = providerLabel;
  protected readonly wdlLabel = wdlLabel;
  protected readonly scoreLabel = scoreLabel;

  ngOnInit(): void {
    this.filtersCollapsed.set(this.filtersCollapsedInitially());
  }

  private sanLabel(fen: string, uci: string): string {
    try {
      return uciMoveToSan(fen, uci);
    } catch {
      return 'Move unavailable';
    }
  }
}
