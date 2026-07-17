import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject } from '@angular/core';
import { AnalysisBoardComponent } from '../../../shared/analysis/board/analysis-board.component';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { CopyableLineComponent } from '../../../shared/ui/copyable-line/copyable-line.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { CoursePositionSuggestionsWidgetComponent } from '../../../shared/courses/position-suggestions/course-position-suggestions-widget.component';
import { MastersExplorerWidgetComponent } from '../../../shared/masters-explorer/masters-explorer-widget.component';
import { GameFilterBreakdownItem, GameFilterBreakdownPanelComponent } from '../../../shared/games/filter-breakdown/game-filter-breakdown-panel.component';
import { PositionGameMovesPanelComponent } from '../../../shared/games/position-moves/position-game-moves-panel.component';
import { PositionTopGamesComponent } from '../../../shared/games/position-moves/position-top-games.component';
import { PositionPerformancePanelComponent } from '../../../shared/games/position-performance/position-performance-panel.component';
import { scoreLabel, wdlLabel } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { buildChallengeBotHeaderAction } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-action.helper';
import { LichessBotChallengeApiService } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-api.service';
import { LichessBotChallengeDialogComponent } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-dialog.component';
import { LichessBotChallengeStore } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge.store';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [
    AnalysisBoardComponent,
    CoursePositionSuggestionsWidgetComponent,
    MastersExplorerWidgetComponent,
    GameFilterBreakdownPanelComponent,
    PositionGameMovesPanelComponent,
    PositionTopGamesComponent,
    PageHeaderComponent,
    CopyableLineComponent,
    PanelComponent,
    PositionPerformancePanelComponent,
    LichessBotChallengeDialogComponent,
  ],
  providers: [OpeningAnalysisStore, LichessBotChallengeStore, LichessBotChallengeApiService],
  templateUrl: './opening-analysis-page.component.html',
  styleUrl: './opening-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningAnalysisPageComponent implements OnInit {
  protected readonly store = inject(OpeningAnalysisStore);
  protected readonly challengeStore = inject(LichessBotChallengeStore);
  protected readonly scoreLabel = scoreLabel;
  protected readonly analysisQueryParams = computed(() => ({
    moves: this.store.history().map((move) => move.uci).join(','),
  }));
  protected readonly pageSubtitle = computed(() => {
    const opening = this.store.analysis()?.bookOpening;
    if (!opening) return 'Explore positions from your indexed games.';
    return opening.eco ? `${opening.eco} · ${opening.name}` : opening.name;
  });
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'games', label: 'Games', value: this.store.wdl().total },
    { id: 'score', label: 'Score', value: this.scoreLabel(this.store.wdl()) },
    { id: 'wdl', label: 'WDL', value: wdlLabel(this.store.wdl()) },
    { id: 'next-moves', label: 'Next moves', value: this.store.analysis()?.nextMoves?.length || 0 },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'tags',
      kind: 'toggle',
      label: 'Tags',
      pressed: this.store.tagsOpen(),
      run: () => this.store.toggleTags(),
    },
    {
      id: 'masters',
      kind: 'toggle',
      label: 'Masters',
      pressed: this.store.mastersOpen(),
      run: () => this.store.toggleMasters(),
    },
    {
      id: 'last-games',
      kind: 'toggle',
      label: 'Last games',
      pressed: this.store.lastGamesOpen(),
      run: () => this.store.toggleLastGames(),
    },
    {
      id: 'engine',
      kind: 'toggle',
      label: 'Engine',
      pressed: this.store.engineVisible(),
      run: () => this.store.toggleEngine(),
    },
    buildChallengeBotHeaderAction({
      run: () => this.challengeStore.openForFen(this.store.currentFen()),
    }),
  ]);
  protected readonly openingBreakdownItems = computed<readonly GameFilterBreakdownItem[]>(() =>
    this.store.openingBreakdowns().map((opening) => ({
      key: opening.name,
      label: opening.name,
      games: opening.games,
      wdl: opening.wdl,
    })),
  );
  protected readonly selectedOpeningKeys = computed<readonly string[]>(() => {
    const selected = this.store.filters().openingNameExact;
    return selected ? [selected] : [];
  });

  ngOnInit(): void {
    this.store.initialize();
  }

  protected selectOpening(name: string): void {
    const opening = this.store.openingBreakdowns().find((item) => item.name === name);
    if (opening) this.store.selectOpeningFilter(opening);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.store.goBack();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.store.resetBoard();
    }
  }
}
