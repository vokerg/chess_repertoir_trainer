import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';
import { EngineEvalBarComponent } from '../components/engine-eval-bar.component';
import { MoveTreeComponent } from '../components/move-tree.component';
import { MoveNotesComponent } from '../components/move-notes.component';
import { StockfishPanelComponent } from '../components/stockfish-panel.component';
import { EngineAnalysis, StockfishAnalysisService } from '../services/stockfish-analysis.service';

interface EditableLine {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: 'WHITE' | 'BLACK';
}

@Component({
  selector: 'app-line-editor-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent, EngineEvalBarComponent, MoveTreeComponent, MoveNotesComponent, StockfishPanelComponent],
  template: `
    <section *ngIf="loaded; else loadingState" class="stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a [routerLink]="breadcrumbLink()" class="workbench-breadcrumb">{{ breadcrumbLabel() }}</a>
          <h2 class="workbench-title">{{ line?.name || 'Line editor' }}</h2>
          <div class="workbench-meta">
            <span>Train as {{ line?.sideToTrain === 'BLACK' ? 'Black' : 'White' }}</span>
            <span>Selected: {{ selectedLabel() }}</span>
          </div>
        </div>

        <nav class="workbench-mode-switch" aria-label="Line mode">
          <span class="mode-pill mode-pill-active">Build</span>
          <a class="mode-pill" [routerLink]="['/lines', lineId, 'train']">Train</a>
        </nav>
      </header>

      <p *ngIf="error" class="status-error">{{ error }}</p>

      <div class="line-workbench">
        <section class="workbench-panel">
          <div>
            <h3 class="workbench-panel-title">Board workbench</h3>
            <p class="workbench-panel-subtitle">Play a move on the board to add it to the selected node. Use the keyboard to move through the main branch.</p>
          </div>

          <div class="board-stage">
            <app-engine-eval-bar [analysis]="analysis" [currentFen]="currentFen" [flipped]="isBlackPerspective()"></app-engine-eval-bar>

            <div class="board-shell">
              <app-chess-board
                [fen]="currentFen"
                [side]="line?.sideToTrain"
                [lastMove]="lastMove"
                [arrows]="analysisArrows()"
                [positionVersion]="boardPositionVersion"
                (move)="onBoardMove($event)"
              ></app-chess-board>
            </div>
          </div>

          <div class="board-action-row">
            <button type="button" class="secondary" (click)="goToStart()" [disabled]="currentNodeId === 0" title="Home">⏮ Start</button>
            <button type="button" class="secondary" (click)="goToPrevious()" [disabled]="currentNodeId === 0" title="Left arrow">← Previous</button>
            <button type="button" class="secondary" (click)="goToNext()" [disabled]="!selectedNode?.children?.length" title="Right arrow">Next →</button>
            <button type="button" class="secondary" (click)="goToEnd()" [disabled]="!selectedNode?.children?.length" title="End">End ⏭</button>
            <span class="keyboard-hint">Keyboard: ←/→, Home/End</span>
          </div>
        </section>

        <div class="workbench-side-stack">
          <section class="workbench-panel move-tree-panel">
            <div>
              <h3 class="workbench-panel-title">Move tree</h3>
              <p class="workbench-panel-subtitle">Root is the start position. Green-outlined moves are trained-side moves; softer replies are opponent continuations.</p>
            </div>
            <app-move-tree [tree]="tree" [selectedNodeId]="currentNodeId" (nodeSelected)="onSelectNode($event)"></app-move-tree>
          </section>

          <section class="workbench-panel engine-panel-modern">
            <app-stockfish-panel
              [analysis]="analysis"
              [currentFen]="currentFen"
              [warning]="engineWarning()"
              (analyze)="rerunAnalysis()"
            ></app-stockfish-panel>
          </section>

          <app-move-notes [node]="selectedNode" (savedNode)="onNotesSaved($event)"></app-move-notes>

          <section class="danger-zone">
            <h3 class="workbench-panel-title">Danger zone</h3>
            <p class="workbench-panel-subtitle">Delete the selected move and every continuation below it. The start position cannot be deleted.</p>
            <div class="board-action-row">
              <button type="button" class="danger" (click)="deleteSelectedSubtree()" [disabled]="selectedNode?.node?.id === 0 || deleting">
                {{ deleting ? 'Deleting...' : 'Delete selected subtree' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>

    <ng-template #loadingState>
      <section class="section-card stack">
        <p class="status-note">Loading editor...</p>
        <p *ngIf="error" class="status-error">{{ error }}</p>
      </section>
    </ng-template>
  `,
})
export class LineEditorPageComponent implements OnInit, OnDestroy {
  lineId!: number;
  line: EditableLine | null = null;
  tree: any;
  selectedNode: any;
  currentNodeId: number = 0;
  currentFen: string = '';
  lastMove: { from: string; to: string } | null = null;
  boardPositionVersion = 0;
  loaded = false;
  deleting = false;
  error: string | null = null;
  analysis: EngineAnalysis = { fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] };

  private analysisSub?: Subscription;
  private analysisTimer?: ReturnType<typeof setTimeout>;
  private creatingMove = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private stockfish: StockfishAnalysisService,
  ) {}

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goToNext();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.goToStart();
    } else if (event.key === 'End') {
      event.preventDefault();
      this.goToEnd();
    }
  }

  ngOnInit() {
    this.analysisSub = this.stockfish.state$.subscribe((analysis) => {
      this.analysis = analysis;
      this.cdr.detectChanges();
    });
    this.route.paramMap.subscribe((params) => {
      this.lineId = Number(params.get('lineId'));
      this.loadLineAndTree();
    });
  }

  ngOnDestroy() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisSub?.unsubscribe();
    this.stockfish.stop();
  }

  loadLineAndTree(selectNodeId?: number) {
    this.loaded = false;
    this.error = null;
    this.api.get<EditableLine>(`/lines/${this.lineId}`).subscribe({
      next: (line) => {
        this.line = line;
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            const targetId = selectNodeId ?? tree.root.node.id;
            this.setSelectedNode(targetId);
            this.lastMove = null;
            this.loaded = true;
            this.boardPositionVersion++;
            this.scheduleAnalysis();
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Could not load move tree.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.error = 'Could not load line.';
        this.cdr.detectChanges();
      },
    });
  }

  findNode(id: number, node = this.tree?.root): any {
    if (!node) return null;
    if (node.node.id === id) return node;
    for (const child of node.children || []) {
      const res = this.findNode(id, child);
      if (res) return res;
    }
    return null;
  }

  findParentNode(id: number, node = this.tree?.root, parent: any = null): any {
    if (!node) return null;
    if (node.node.id === id) return parent;
    for (const child of node.children || []) {
      const res = this.findParentNode(id, child, node);
      if (res) return res;
    }
    return null;
  }

  setSelectedNode(id: number) {
    const selected = this.findNode(id) || this.tree.root;
    this.selectedNode = selected;
    this.currentNodeId = selected.node.id;
    this.currentFen = selected.node.fenAfter;
    this.lastMove = selected.node.id === 0 || !selected.node.moveUci
      ? null
      : { from: selected.node.moveUci.substring(0, 2), to: selected.node.moveUci.substring(2, 4) };
  }

  selectedLabel() {
    if (!this.selectedNode || this.selectedNode.node.id === 0) return 'start';
    return `${this.selectedNode.node.moveSan || this.selectedNode.node.moveUci}`;
  }

  countDescendants(node: any): number {
    if (!node) return 0;
    return (node.children || []).reduce((sum: number, child: any) => sum + 1 + this.countDescendants(child), 0);
  }

  onSelectNode(id: number) {
    this.setSelectedNode(id);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  goToStart() {
    if (!this.tree?.root) return;
    this.setSelectedNode(0);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  goToPrevious() {
    const parent = this.findParentNode(this.currentNodeId);
    if (parent) {
      this.setSelectedNode(parent.node.id);
      this.scheduleAnalysis();
      this.cdr.detectChanges();
    }
  }

  goToNext() {
    const firstChild = this.selectedNode?.children?.[0];
    if (firstChild) {
      this.setSelectedNode(firstChild.node.id);
      this.scheduleAnalysis();
      this.cdr.detectChanges();
    }
  }

  goToEnd() {
    let node = this.selectedNode;
    while (node?.children?.length) {
      node = node.children[0];
    }
    if (node) {
      this.setSelectedNode(node.node.id);
      this.scheduleAnalysis();
      this.cdr.detectChanges();
    }
  }

  onBoardMove(uci: string) {
    if (this.creatingMove) return;

    this.creatingMove = true;
    const parentId = this.currentNodeId === 0 ? null : this.currentNodeId;
    const body: any = { parentId, moveUci: uci };
    this.lastMove = { from: uci.substring(0, 2), to: uci.substring(2, 4) };
    this.error = null;
    this.api.post<any>(`/lines/${this.lineId}/nodes`, body).subscribe({
      next: (created) => {
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.creatingMove = false;
            this.tree = tree;
            this.setSelectedNode(created.id);
            this.scheduleAnalysis();
            this.cdr.detectChanges();
          },
          error: () => {
            this.creatingMove = false;
            this.error = 'Move was added, but the tree could not be reloaded.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.creatingMove = false;
        this.boardPositionVersion++;
        this.error = 'Could not add this move. It may be illegal or this position already has a trained-side move.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteSelectedSubtree() {
    if (!this.selectedNode || this.selectedNode.node.id === 0 || this.deleting) return;
    const node = this.selectedNode.node;
    const parent = this.findParentNode(node.id);
    const parentId = parent?.node?.id ?? 0;
    const label = node.moveSan || node.moveUci;
    const descendantCount = this.countDescendants(this.selectedNode);
    const confirmed = window.confirm(`Delete ${label} and ${descendantCount} following move(s)? This cannot be undone.`);
    if (!confirmed) return;

    this.deleting = true;
    this.error = null;
    this.api.delete<void>(`/nodes/${node.id}/subtree`).subscribe({
      next: () => {
        this.deleting = false;
        this.loadLineAndTree(parentId);
      },
      error: () => {
        this.deleting = false;
        this.error = 'Could not delete this move.';
        this.cdr.detectChanges();
      },
    });
  }

  onNotesSaved(updated: any) {
    if (!this.selectedNode?.node) return;
    Object.assign(this.selectedNode.node, updated);
    this.cdr.detectChanges();
  }

  rerunAnalysis() {
    if (!this.currentFen) return;
    this.stockfish.analyze(this.currentFen, { depth: 12, multipv: 3 });
  }

  scheduleAnalysis() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.rerunAnalysis(), 250);
  }

  analysisArrows() {
    const move = this.analysis.bestMove;
    if (!move || this.analysis.fen !== this.currentFen || move === '(none)') return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  }

  plannedTrainedMove() {
    return (this.selectedNode?.children || []).find((child: any) => child.node.isUserMove && child.node.isCorrectUserMove)?.node?.moveUci;
  }

  engineWarning() {
    if (this.analysis.fen !== this.currentFen || !this.analysis.bestMove || this.analysis.bestMove === '(none)') return null;
    const planned = this.plannedTrainedMove();
    if (!planned) return null;
    if (planned === this.analysis.bestMove) return null;
    return `Engine warning: your planned move is ${planned}, but Stockfish currently prefers ${this.analysis.bestMove}.`;
  }

  isBlackPerspective() {
    return this.line?.sideToTrain === 'BLACK';
  }

  breadcrumbLink() {
    return this.line?.chapterId ? ['/chapters', this.line.chapterId, 'lines'] : ['/courses'];
  }

  breadcrumbLabel() {
    return this.line?.chapterId ? '← Back to lines' : '← Back to courses';
  }
}
