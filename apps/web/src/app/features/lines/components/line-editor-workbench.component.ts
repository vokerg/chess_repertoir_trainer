import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { AnalysisWorkbenchComponent } from '../../../shared/analysis/workbench/analysis-workbench.component';
import { emptyImportedGameFacets, ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { PositionGameMovesPanelComponent } from '../../../shared/games/position-moves/position-game-moves-panel.component';
import { OpeningAnalysisResponse } from '../../../shared/games/position-moves/position-game-moves.models';
import { LineTree, RepertoireColor, UpdateLineNodePayload } from '../data-access/lines.models';
import { LineNotesEditorComponent } from './line-notes-editor.component';

@Component({
  selector: 'app-line-editor-workbench',
  standalone: true,
  imports: [
    AnalysisWorkbenchComponent,
    LineNotesEditorComponent,
    PositionGameMovesPanelComponent,
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
  readonly gamesAnalysis = input<OpeningAnalysisResponse | null>(null);
  readonly gamesLoading = input(false);
  readonly gamesError = input<string | null>(null);
  readonly gamesFilters = input.required<GameFilters>();
  readonly gamesFacets = input<ImportedGameFacetsResponse>(emptyImportedGameFacets());

  readonly boardMove = output<string>();
  readonly nodeSelected = output<number>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goEnd = output<void>();
  readonly deleteSelectedSubtree = output<void>();
  readonly saveNotes = output<UpdateLineNodePayload>();
  readonly gamesFiltersChange = output<GameFilters>();
  readonly gamesApplyFilters = output<void>();
  readonly gamesResetFilters = output<void>();
  readonly gamesRefresh = output<void>();
}
