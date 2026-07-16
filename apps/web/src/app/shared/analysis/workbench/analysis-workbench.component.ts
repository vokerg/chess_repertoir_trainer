import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EngineAnalysis } from '../../chess/engine/stockfish-analysis.service';
import { AnalysisBoardComponent, AnalysisBoardArrow } from '../board/analysis-board.component';
import { MoveTreePanelComponent } from '../move-tree-panel/move-tree-panel.component';
import { AnalysisTree } from './analysis-tree.models';

@Component({
  selector: 'app-analysis-workbench',
  standalone: true,
  imports: [AnalysisBoardComponent, MoveTreePanelComponent],
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
  readonly showTreePanel = input(true);

  readonly treeTitle = input('Move tree');
  readonly treeHelp = input<string>();
  readonly treeRootLabel = input('Start');

  readonly showDangerZone = input(true);
  readonly deleting = input(false);
  readonly deleteDisabled = input(false);

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly flipBoard = output<void>();
  readonly deleteSelectedSubtree = output<void>();
}
