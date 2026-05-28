import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';
import { MoveTreeComponent } from '../components/move-tree.component';
import { MoveNotesComponent } from '../components/move-notes.component';
import { EngineAnalysis, EngineLine, StockfishAnalysisService } from '../services/stockfish-analysis.service';

interface EditableLine {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: 'WHITE' | 'BLACK';
}

@Component({
  selector: 'app-line-editor-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent, MoveTreeComponent, MoveNotesComponent],
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
            <div class="eval-bar-modern" [class.eval-bar-modern-flipped]="isBlackPerspective()" title="Stockfish evaluation">
              <div class="eval-black-modern" [style.height.%]="100 - evalWhitePercent()"></div>
              <div class="eval-label-modern">{{ evalLabel() }}</div>
            </div>

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

          <section class="workbench-panel">
            <div>
              <h3 class="workbench-panel-title">Selected move</h3>
              <p class="workbench-panel-subtitle">Inspect the current node before adding moves, notes, or deleting a continuation.</p>
            </div>

            <div *ngIf="selectedNode?.node?.id === 0" class="empty-state">
              Start position. Add the first move from the board.
            </div>

            <div *ngIf="selectedNode?.node?.id !== 0" class="selected-move-grid">
              <div class="selected-move-card">
                <p class="library-mini-stat-label">SAN</p>
                <strong>{{ selectedNode?.node?.moveSan || '—' }}</strong>
              </div>
              <div class="selected-move-card">
                <p class="library-mini-stat-label">UCI</p>
                <code class="selected-move-value">{{ selectedNode?.node?.moveUci || '—' }}</code>
              </div>
              <div class="selected-move-card">
                <p class="library-mini-stat-label">Side</p>
                <strong>{{ selectedNode?.node?.side || '—' }}</strong>
              </div>
              <div class="selected-move-card">
                <p class="library-mini-stat-label">Role</p>
                <strong>{{ selectedNode?.node?.isUserMove ? 'Trained move' : 'Opponent reply' }}</strong>
              </div>
              <div class="selected-move-card">
                <p class="library-mini-stat-label">Children</p>
                <strong>{{ selectedNode?.children?.length || 0 }}</strong>
              </div>
              <div class="selected-move-card">
                <p class="library-mini-stat-label">Subtree</p>
                <strong>{{ countDescendants(selectedNode) }} following</strong>
              </div>
            </div>
          </section>

          <app-move-notes [node]="selectedNode" (savedNode)="onNotesSaved($event)"></app-move-notes>

          <section class="workbench-panel engine-panel-modern">
            <div class="engine-panel-header">
              <div>
                <h3 class="workbench-panel-title">Stockfish</h3>
                <p class="workbench-panel-subtitle">Secondary analysis for the selected position.</p>
              </div>
              <button type="button" class="secondary" (click)="rerunAnalysis()" [disabled]="analysis.running">Analyze</button>
            </div>

            <p *ngIf="analysis.error" class="status-error">{{ analysis.error }}</p>
            <p *ngIf="analysis.running" class="status-note">Analyzing… depth {{ topDepth() || '…' }}</p>
            <p *ngIf="!analysis.running && !analysis.bestMove && !analysis.error" class="status-note">Select a position to analyze.</p>
            <p *ngIf="analysis.bestMove" class="status-note"><strong>Best:</strong> <code>{{ analysis.bestMove }}</code></p>

            <div *ngIf="engineWarning()" class="engine-warning-modern">
              {{ engineWarning() }}
            </div>

            <div *ngFor="let engineLine of analysis.lines.slice(0, 3)" class="engine-line-modern">
              <span class="engine-score-modern">{{ lineScoreLabel(engineLine) }}</span>
              <code>{{ engineLine.pv.slice(0, 8).join(' ') }}</code>
            </div>
          </section>

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
  private displayedEval: { line: EngineLine; fen: string } | null = null;

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
      const firstLine = analysis.lines[0];
      if (firstLine && analysis.fen === this.currentFen) {
        this.displayedEval = { line: firstLine, fen: analysis.fen };
      }
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

  topDepth() {
    return Math.max(0, ...this.analysis.lines.map((line) => line.depth));
  }

  lineScoreLabel(line: EngineLine, fen: string = this.currentFen) {
    if (line.mate !== undefined) return `M${line.mate}`;
    if (line.scoreCp === undefined) return '—';
    const whiteCp = this.scoreFromWhitePerspective(line.scoreCp, fen);
    const pawns = whiteCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }

  evalLabel() {
    const displayed = this.displayedEvalLine();
    if (!displayed) return '—';
    return this.lineScoreLabel(displayed.line, displayed.fen);
  }

  evalWhitePercent() {
    const displayed = this.displayedEvalLine();
    if (!displayed) return 50;
    if (displayed.line.mate !== undefined) return displayed.line.mate > 0 ? 100 : 0;
    const whiteCp = this.scoreFromWhitePerspective(displayed.line.scoreCp ?? 0, displayed.fen);
    const clamped = Math.max(-800, Math.min(800, whiteCp));
    return 50 + (clamped / 800) * 50;
  }

  isBlackPerspective() {
    return this.line?.sideToTrain === 'BLACK';
  }

  private scoreFromWhitePerspective(scoreCp: number, fen: string) {
    const turn = fen.split(' ')[1];
    return turn === 'b' ? -scoreCp : scoreCp;
  }

  private displayedEvalLine() {
    const currentLine = this.analysis.fen === this.currentFen ? this.analysis.lines[0] : null;
    return currentLine ? { line: currentLine, fen: this.currentFen } : this.displayedEval;
  }

  breadcrumbLink() {
    return this.line?.chapterId ? ['/chapters', this.line.chapterId, 'lines'] : ['/courses'];
  }

  breadcrumbLabel() {
    return this.line?.chapterId ? '← Back to lines' : '← Back to courses';
  }
}
