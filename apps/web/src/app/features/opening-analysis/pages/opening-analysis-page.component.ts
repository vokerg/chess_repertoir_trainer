import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { BoardActionToolbarComponent } from '../../../shared/chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { EngineEvalBarComponent } from '../../../shared/chess/engine/engine-eval-bar.component';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { StockfishPanelComponent } from '../../../shared/chess/engine/stockfish-panel.component';
import { CopyableLineComponent } from '../../../shared/ui/copyable-line/copyable-line.component';
import { CoursePositionSuggestionsWidgetComponent } from '../../../shared/courses/position-suggestions/course-position-suggestions-widget.component';
import { PositionGameMovesPanelComponent } from '../../../shared/games/position-moves/position-game-moves-panel.component';
import { PositionPerformancePanelComponent } from '../../../shared/games/position-performance/position-performance-panel.component';
import { scoreLabel } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { buildChallengeBotHeaderAction } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-action.helper';
import { LichessBotChallengeApiService } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-api.service';
import { LichessBotChallengeDialogComponent } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge-dialog.component';
import { LichessBotChallengeStore } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge.store';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [
    CoursePositionSuggestionsWidgetComponent,
    PositionGameMovesPanelComponent,
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    StockfishPanelComponent,
    BoardActionToolbarComponent,
    PageHeaderComponent,
    CopyableLineComponent,
    PositionPerformancePanelComponent,
    LichessBotChallengeDialogComponent,
  ],
  providers: [OpeningAnalysisStore, LichessBotChallengeStore, LichessBotChallengeApiService],
  templateUrl: './opening-analysis-page.component.html',
  styleUrl: './opening-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningAnalysisPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
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
    { id: 'next-moves', label: 'Next moves', value: this.store.analysis()?.nextMoves?.length || 0 },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    buildChallengeBotHeaderAction({
      run: () => this.challengeStore.openForFen(this.store.currentFen()),
    }),
  ]);

  ngOnInit(): void {
    this.store.initialize();
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
