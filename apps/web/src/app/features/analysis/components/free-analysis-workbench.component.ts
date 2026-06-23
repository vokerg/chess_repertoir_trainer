import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis/workbench/analysis-workbench.component';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { CoursePositionSuggestionsWidgetComponent } from '../../../shared/courses/position-suggestions/course-position-suggestions-widget.component';
import { FreeAnalysisTree } from '../helpers/free-analysis-tree.models';

@Component({
  selector: 'app-free-analysis-workbench',
  standalone: true,
  imports: [AnalysisWorkbenchComponent, CoursePositionSuggestionsWidgetComponent],
  templateUrl: './free-analysis-workbench.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeAnalysisWorkbenchComponent {
  readonly tree = input.required<FreeAnalysisTree>();
  readonly selectedNodeId = input.required<number>();
  readonly currentFen = input.required<string>();
  readonly side = input.required<'WHITE' | 'BLACK'>();
  readonly blackPerspective = input.required<boolean>();
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly arrows = input<{ from: string; to: string; brush?: string }[]>([]);
  readonly boardPositionVersion = input(0);
  readonly analysis = input.required<EngineAnalysis>();
  readonly loadedFromGame = input(false);
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);
  readonly deleteDisabled = input(true);

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly analyze = output<void>();
  readonly deleteSelectedSubtree = output<void>();
}
