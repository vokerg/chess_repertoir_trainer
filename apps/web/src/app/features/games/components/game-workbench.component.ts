import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis/workbench/analysis-workbench.component';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { CoursePositionSuggestionsWidgetComponent } from '../../../shared/courses/position-suggestions/course-position-suggestions-widget.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { UserColor } from '../data-access/games.models';
import { BoardArrow, BoardLastMove, GameTree } from '../helpers/game-detail.models';
import { GameEvaluationGraphComponent } from './game-evaluation-graph.component';

@Component({
  selector: 'app-game-workbench',
  standalone: true,
  imports: [
    AnalysisWorkbenchComponent,
    CoursePositionSuggestionsWidgetComponent,
    GameEvaluationGraphComponent,
    PanelComponent,
  ],
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
  readonly deleteDisabled = input(true);
  readonly deleting = input(false);
  readonly showDangerZone = input(true);

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly deleteSelectedSubtree = output<void>();
}
