import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MoveTreeComponent } from '../../analysis/move-tree/move-tree.component';
import { AnalysisTree, AnalysisTreeNode } from '../../analysis/workbench/analysis-tree.models';
import { BoardActionToolbarComponent } from '../../chess/board/board-action-toolbar.component';
import { ChessgroundBoardComponent } from '../../chess/board/chessground-board.component';

export type ScenarioBoardMode = 'intro' | 'context' | 'challenge' | 'result';
export type ScenarioBoardColor = 'WHITE' | 'BLACK';

export interface ScenarioBoardContextPly {
  plyNumber: number;
  moveNumber: number;
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
}

@Component({
  selector: 'app-scenario-board-shell',
  standalone: true,
  imports: [BoardActionToolbarComponent, ChessgroundBoardComponent, MoveTreeComponent],
  templateUrl: './scenario-board-shell.component.html',
  styleUrl: './scenario-board-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioBoardShellComponent {
  readonly mode = input<ScenarioBoardMode>('context');
  readonly currentFen = input.required<string>();
  readonly side = input<ScenarioBoardColor>('WHITE');
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly contextPlies = input<ScenarioBoardContextPly[]>([]);
  readonly selectedContextPly = input<number | null>(null);
  readonly challengePlyNumber = input.required<number>();
  readonly boardDisabled = input(false);
  readonly boardPositionVersion = input(0);

  readonly boardMove = output<string>();
  readonly goStart = output<void>();
  readonly goPrevious = output<void>();
  readonly goNext = output<void>();
  readonly goChallenge = output<void>();
  readonly contextPlySelected = output<number>();

  protected readonly selectedContextIndex = computed(() => {
    const selected = this.selectedContextPly();
    if (selected === null) return -1;
    return this.contextPlies().findIndex((ply) => ply.plyNumber === selected);
  });

  protected readonly canGoBackward = computed(() => this.mode() !== 'context' || this.selectedContextIndex() >= 0);
  protected readonly canGoForward = computed(() => {
    if (this.mode() !== 'context') return false;
    const index = this.selectedContextIndex();
    return index < this.contextPlies().length - 1;
  });

  protected readonly contextTree = computed<AnalysisTree>(() => {
    const root: AnalysisTreeNode = {
      node: {
        id: 0,
        moveSan: 'Start',
        moveUci: null,
        isUserMove: false,
      },
      children: [],
    };
    let parent = root;
    const triggerPly = this.challengePlyNumber() - 1;
    for (const ply of this.contextPlies()) {
      const node: AnalysisTreeNode = {
        node: {
          id: ply.plyNumber,
          moveSan: ply.moveSan,
          moveUci: ply.moveUci,
          isUserMove: ply.isUserMove,
          moveNumber: ply.moveNumber,
          side: ply.plyNumber % 2 === 1 ? 'WHITE' : 'BLACK',
          classification: ply.plyNumber === triggerPly ? 'MISSED_OPPORTUNITY' : null,
        },
        children: [],
      };
      parent.children = [node];
      parent = node;
    }
    return { root };
  });

  protected selectTreeNode(nodeId: number): void {
    if (nodeId === 0) {
      this.goStart.emit();
      return;
    }
    this.contextPlySelected.emit(nodeId);
  }
}
