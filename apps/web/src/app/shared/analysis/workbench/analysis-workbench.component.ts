import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BoardActionToolbarComponent } from '../../chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../chess/board/chessground-board.component';
import { EngineEvalBarComponent } from '../../chess/engine/engine-eval-bar.component';
import { EngineAnalysis } from '../../chess/engine/stockfish-analysis.service';
import { MoveTreePanelComponent } from '../move-tree-panel/move-tree-panel.component';
import { StockfishPanelComponent } from '../../chess/engine/stockfish-panel.component';
import { AnalysisTree } from './analysis-tree.models';

@Component({
  selector: 'app-analysis-workbench',
  standalone: true,
  imports: [
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    MoveTreePanelComponent,
    StockfishPanelComponent,
    BoardActionToolbarComponent,
  ],
  templateUrl: './analysis-workbench.component.html',
  styleUrl: './analysis-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisWorkbenchComponent {
  readonly tree = input<AnalysisTree | null>(null);
  readonly selectedNodeId = input<number | null>(null);
  readonly currentFen = input.required<string>();
  readonly side = input.required<'WHITE' | 'BLACK'>();
  readonly blackPerspective = input.required<boolean>();
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly arrows = input<Array<{ from: string; to: string; brush?: string }>>([]);
  readonly boardPositionVersion = input(0);
  readonly analysis = input.required<EngineAnalysis>();
  readonly savedScoreCpWhite = input<number | null>(null);
  readonly engineWarning = input<string | null>(null);
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);
  readonly keyboardHint = input<string | null>('Keyboard: ←/→, Home/End');

  readonly boardTitle = input.required<string>();
  readonly boardHelp = input.required<string>();
  readonly treeTitle = input.required<string>();
  readonly treeHelp = input.required<string>();
  readonly treeRootLabel = input('Start');

  readonly showDangerZone = input(true);
  readonly dangerTitle = input('Danger zone');
  readonly dangerHelp = input(
    'Delete the selected move and every continuation below it. The start position cannot be deleted.',
  );
  readonly deleteButtonLabel = input('Delete selected subtree');
  readonly deleting = input(false);
  readonly deleteDisabled = input(false);

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly analyze = output<void>();
  readonly deleteSelectedSubtree = output<void>();
}
