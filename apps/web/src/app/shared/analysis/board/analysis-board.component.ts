import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BoardActionToolbarComponent } from '../../chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../chess/board/chessground-board.component';
import { engineBestMoveForFen } from '../../chess/engine/engine-best-move.helper';
import { EngineEvalBarComponent } from '../../chess/engine/engine-eval-bar.component';
import { EngineAnalysis } from '../../chess/engine/stockfish-analysis.service';
import { StockfishPanelComponent } from '../../chess/engine/stockfish-panel.component';

export interface AnalysisBoardArrow {
  from: string;
  to: string;
  brush?: string;
}

@Component({
  selector: 'app-analysis-board',
  standalone: true,
  imports: [
    BoardActionToolbarComponent,
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    StockfishPanelComponent,
  ],
  templateUrl: './analysis-board.component.html',
  styleUrl: './analysis-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisBoardComponent {
  readonly currentFen = input.required<string>();
  readonly side = input.required<'WHITE' | 'BLACK'>();
  readonly blackPerspective = input.required<boolean>();
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly arrows = input<AnalysisBoardArrow[]>([]);
  readonly boardPositionVersion = input(0);
  readonly analysis = input.required<EngineAnalysis>();
  readonly savedScoreCpWhite = input<number | null>(null);
  readonly engineWarning = input<string | null>(null);
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);
  readonly keyboardHint = input<string | null>('Keyboard: ←/→, Home/End');
  readonly showFlipBoard = input(false);
  readonly showNextNavigation = input(true);
  readonly showEndNavigation = input(true);
  readonly engineVisible = input(true);

  readonly boardArrows = computed<AnalysisBoardArrow[]>(() => {
    if (!this.engineVisible()) return this.arrows();
    const move = engineBestMoveForFen(this.analysis(), this.currentFen());
    if (!move) return this.arrows();

    const nonEngineArrows = this.arrows().filter(
      (arrow) => (arrow.brush || 'green') !== 'green',
    );
    return [
      ...nonEngineArrows,
      { from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' },
    ];
  });

  readonly boardMove = output<string>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly flipBoard = output<void>();
}
