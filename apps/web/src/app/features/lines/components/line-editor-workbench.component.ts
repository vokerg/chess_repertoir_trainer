import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChessgroundBoardComponent } from '../../../components/chessground-board.component';
import { EngineEvalBarComponent } from '../../../components/engine-eval-bar.component';
import { MoveTreeComponent } from '../../../components/move-tree.component';
import { StockfishPanelComponent } from '../../../components/stockfish-panel.component';
import { EngineAnalysis } from '../../../services/stockfish-analysis.service';
import { LineTree, RepertoireColor, UpdateLineNodePayload } from '../data-access/lines.models';
import { LineNotesEditorComponent } from './line-notes-editor.component';

@Component({
  selector: 'app-line-editor-workbench',
  standalone: true,
  imports: [
    ChessgroundBoardComponent,
    EngineEvalBarComponent,
    MoveTreeComponent,
    StockfishPanelComponent,
    LineNotesEditorComponent,
  ],
  templateUrl: './line-editor-workbench.component.html',
  styleUrl: './line-editor-workbench.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineEditorWorkbenchComponent {
  readonly tree = input.required<LineTree>();
  readonly selectedNodeId = input.required<number>();
  readonly nodeId = input<number | null>(null);
  readonly branchLabel = input<string | null | undefined>(null);
  readonly comment = input<string | null | undefined>(null);
  readonly annotation = input<string | null | undefined>(null);
  readonly currentFen = input.required<string>();
  readonly side = input.required<RepertoireColor>();
  readonly blackPerspective = input.required<boolean>();
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly arrows = input<{ from: string; to: string; brush?: string }[]>([]);
  readonly boardPositionVersion = input(0);
  readonly analysis = input.required<EngineAnalysis>();
  readonly engineWarning = input<string | null>(null);
  readonly canGoBackward = input(false);
  readonly canGoForward = input(false);
  readonly deleting = input(false);
  readonly notesSaving = input(false);
  readonly notesSaved = input(false);
  readonly notesError = input<string | null>(null);

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly analyze = output<void>();
  readonly deleteSelectedSubtree = output<void>();
  readonly saveNotes = output<UpdateLineNodePayload>();
}
