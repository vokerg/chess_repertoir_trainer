import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChessgroundBoardComponent } from '../../../components/chessground-board.component';
import { EngineEvalBarComponent } from '../../../components/engine-eval-bar.component';
import { MoveTreeComponent } from '../../../components/move-tree.component';
import { StockfishPanelComponent } from '../../../components/stockfish-panel.component';
import { EngineAnalysis } from '../../../services/stockfish-analysis.service';
import { UserColor } from '../data-access/games.models';
import { BoardArrow, BoardLastMove, GameTree } from './game-detail.models';

@Component({
  selector: 'app-game-workbench',
  standalone: true,
  imports: [ChessgroundBoardComponent, EngineEvalBarComponent, MoveTreeComponent, StockfishPanelComponent],
  templateUrl: './game-workbench.component.html',
  styleUrl: './game-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameWorkbenchComponent {
  readonly tree = input.required<GameTree>();
  readonly selectedNodeId = input.required<number>();
  readonly currentFen = input.required<string>();
  readonly side = input.required<UserColor>();
  readonly blackPerspective = input.required<boolean>();
  readonly lastMove = input<BoardLastMove | null>(null);
  readonly arrows = input<BoardArrow[]>([]);
  readonly boardPositionVersion = input(0);
  readonly analysis = input.required<EngineAnalysis>();
  readonly savedScoreCpWhite = input<number | null>(null);
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly analyze = output<void>();
}
