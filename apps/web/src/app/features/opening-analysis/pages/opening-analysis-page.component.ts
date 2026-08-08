import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject } from '@angular/core';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis/workbench/analysis-workbench.component';
import { CoursePositionSuggestionsWidgetComponent } from '../../../shared/courses/position-suggestions/course-position-suggestions-widget.component';
import { GameFilterBreakdownItem, GameFilterBreakdownPanelComponent } from '../../../shared/games/filter-breakdown/game-filter-breakdown-panel.component';
import { PositionGameMovesPanelComponent } from '../../../shared/games/position-moves/position-game-moves-panel.component';
import { scoreLabel, wdlLabel } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { PositionTopGamesComponent } from '../../../shared/games/position-moves/position-top-games.component';
import { PositionPerformancePanelComponent } from '../../../shared/games/position-performance/position-performance-panel.component';
import { LichessGamesExplorerWidgetComponent } from '../../../shared/lichess-games-explorer/lichess-games-explorer-widget.component';
import { buildChallengeBotHeaderAction } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-action.helper';
import { LichessBotChallengeApiService } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-api.service';
import { LichessBotChallengeDialogComponent } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-dialog.component';
import { LichessBotChallengeStore } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge.store';
import { MastersExplorerWidgetComponent } from '../../../shared/masters-explorer/masters-explorer-widget.component';
import {
  CopyableLineComponent,
  type CopyableLineSegment,
} from '../../../shared/ui/copyable-line/copyable-line.component';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { OpeningEvidenceTabsComponent } from '../components/opening-evidence-tabs/opening-evidence-tabs.component';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [
    AnalysisWorkbenchComponent,
    CoursePositionSuggestionsWidgetComponent,
    MastersExplorerWidgetComponent,
    LichessGamesExplorerWidgetComponent,
    GameFilterBreakdownPanelComponent,
    PositionGameMovesPanelComponent,
    PositionTopGamesComponent,
    PageHeaderComponent,
    CopyableLineComponent,
    OpeningEvidenceTabsComponent,
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
  protected readonly lineTrailMoves = computed<readonly CopyableLineSegment[]>(() =>
    this.store.history().map((move, index) => ({
      id: `${index + 1}-${move.uci}`,
      label: move.san || move.uci,
      index: index + 1,
    })),
  );
  protected readonly pageSubtitle = computed(() => {
    const opening = this.store.analysis()?.bookOpening;
    if (!opening) return 'Explore positions from your indexed games.';
    return opening.eco ? `${opening.eco} · ${opening.name}` : opening.name;
  });
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'games', label: 'Games', value: this.store.wdl().total },
    { id: 'score', label: 'Score', value: this.scoreLabel(this.store.wdl()) },
    { id: 'wdl', label: 'WDL', value: wdlLabel(this.store.wdl()) },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
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
