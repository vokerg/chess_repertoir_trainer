import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject } from '@angular/core';
import { BoardActionToolbarComponent } from '../../../components/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../../components/chessground-board.component';
import { EngineEvalBarComponent } from '../../../components/engine-eval-bar.component';
import { PageHeaderComponent, PageHeaderStat } from '../../../components/page-header.component';
import { StockfishPanelComponent } from '../../../components/stockfish-panel.component';
import { PositionGameMovesPanelComponent } from '../../../shared/position-game-moves/position-game-moves-panel.component';
import { scoreLabel } from '../../../shared/position-game-moves/position-game-moves.helpers';
import { OpeningAnalysisStore } from '../state/opening-analysis.store';

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [
    PositionGameMovesPanelComponent,
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    StockfishPanelComponent,
    BoardActionToolbarComponent,
    PageHeaderComponent,
  ],
  providers: [OpeningAnalysisStore],
  templateUrl: './opening-analysis-page.component.html',
  styleUrl: './opening-analysis-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningAnalysisPageComponent implements OnInit {
  protected readonly store = inject(OpeningAnalysisStore);
  protected readonly scoreLabel = scoreLabel;
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
