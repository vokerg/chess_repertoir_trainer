import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { BoardActionToolbarComponent } from '../../../shared/chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { EngineEvalBarComponent } from '../../../shared/chess/engine/engine-eval-bar.component';
import { PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { StockfishPanelComponent } from '../../../shared/chess/engine/stockfish-panel.component';
import { CopyableLineComponent } from '../../../shared/ui/copyable-line/copyable-line.component';
import { CoursePositionSuggestionsWidgetComponent } from '../../../shared/courses/position-suggestions/course-position-suggestions-widget.component';
import { PositionGameMovesPanelComponent } from '../../../shared/games/position-moves/position-game-moves-panel.component';
import { PositionPerformancePanelComponent } from '../../../shared/games/position-performance/position-performance-panel.component';
import { scoreLabel } from '../../../shared/games/position-moves/position-game-moves.helpers';
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
  ],
  providers: [OpeningAnalysisStore],
  templateUrl: './opening-analysis-page.component.html',
  styleUrl: './opening-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningAnalysisPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(OpeningAnalysisStore);
  protected readonly scoreLabel = scoreLabel;
  protected readonly analysisQueryParams = computed(() => ({
    moves: this.store.history().map((move) => move.uci).join(','),
  }));
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'games', label: 'Games', value: this.store.wdl().total },
    { id: 'score', label: 'Score', value: this.scoreLabel(this.store.wdl()) },
    { id: 'next-moves', label: 'Next moves', value: this.store.analysis()?.nextMoves?.length || 0 },
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
