import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';
import { MoveTreeComponent } from '../components/move-tree.component';
import { MoveNotesComponent } from '../components/move-notes.component';
import { EngineAnalysis, EngineLine, StockfishAnalysisService } from '../services/stockfish-analysis.service';

@Component({
  selector: 'app-line-editor-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent, MoveTreeComponent, MoveNotesComponent],
  template: `
    <div *ngIf="loaded">
      <h2>{{ line?.name }} - Editor</h2>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;">
        <div>
          <div style="display:flex;gap:12px;align-items:stretch;">
            <div class="eval-bar" [class.eval-bar-flipped]="isBlackPerspective()" title="Stockfish evaluation">
              <div class="eval-black" [style.height.%]="100 - evalWhitePercent()"></div>
              <div class="eval-label">{{ evalLabel() }}</div>
            </div>
            <app-chess-board
              [fen]="currentFen"
              [side]="line?.sideToTrain"
              [lastMove]="lastMove"
              [arrows]="analysisArrows()"
              (move)="onBoardMove($event)"
            ></app-chess-board>
          </div>

          <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" (click)="goToStart()" [disabled]="currentNodeId === 0" title="Home">⏮ Start</button>
            <button type="button" (click)="goToPrevious()" [disabled]="currentNodeId === 0" title="Left arrow">← Previous</button>
            <button type="button" (click)="goToNext()" [disabled]="!selectedNode?.children?.length" title="Right arrow">Next →</button>
            <button type="button" (click)="goToEnd()" [disabled]="!selectedNode?.children?.length" title="End">End ⏭</button>
            <span style="color:#666;">Selected: {{ selectedLabel() }}</span>
            <span style="color:#888;font-size:12px;">Keyboard: ←/→, Home/End</span>
          </div>

          <div style="margin-top:12px;border:1px solid #ddd;padding:10px;max-width:520px;">
            <h3 style="margin-top:0;">Selected move</h3>
            <p *ngIf="selectedNode?.node?.id === 0">Start position. Add the first move from the board.</p>
            <div *ngIf="selectedNode?.node?.id !== 0">
              <p><strong>{{ selectedNode?.node?.moveSan }}</strong> <code>{{ selectedNode?.node?.moveUci }}</code></p>
              <p>Side: {{ selectedNode?.node?.side }} · {{ selectedNode?.node?.isUserMove ? 'trained move' : 'opponent reply' }}</p>
              <p>Children to delete with this move: {{ countDescendants(selectedNode) }}</p>
              <button type="button" (click)="deleteSelectedSubtree()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete this move and continuation' }}
              </button>
            </div>
          </div>

          <app-move-notes [node]="selectedNode" (savedNode)="onNotesSaved($event)"></app-move-notes>
        </div>
        <div style="min-width:260px;">
          <h3>Move Tree</h3>
          <app-move-tree [tree]="tree" [selectedNodeId]="currentNodeId" (nodeSelected)="onSelectNode($event)"></app-move-tree>

          <div class="analysis-panel">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <h3 style="margin:0;">Stockfish</h3>
              <button type="button" (click)="rerunAnalysis()" [disabled]="analysis.running">Analyze</button>
            </div>
            <p *ngIf="analysis.error" style="color:#b00020;">{{ analysis.error }}</p>
            <p *ngIf="analysis.running">Analyzing… depth {{ topDepth() || '…' }}</p>
            <p *ngIf="!analysis.running && !analysis.bestMove && !analysis.error">Select a position to analyze.</p>
            <p *ngIf="analysis.bestMove"><strong>Best:</strong> <code>{{ analysis.bestMove }}</code></p>
            <div *ngIf="engineWarning()" class="engine-warning">
              {{ engineWarning() }}
            </div>
            <ol *ngIf="analysis.lines.length > 0">
              <li *ngFor="let line of analysis.lines.slice(0, 3)">
                <span class="score">{{ lineScoreLabel(line) }}</span>
                <code>{{ line.pv.slice(0, 8).join(' ') }}</code>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
    <div *ngIf="!loaded">
      <p>Loading...</p>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
    </div>
  `,
  styles: [
    `
    .eval-bar {
      position: relative;
      width: 34px;
      min-height: min(76vw, 520px);
      background: #f7f7f7;
      border: 1px solid #bbb;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    }
    .eval-black {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: #222;
      transition: height 180ms ease;
    }
    .eval-bar-flipped .eval-black {
      top: auto;
      bottom: 0;
    }
    .eval-label {
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: #b00020;
      text-shadow: 0 1px 2px #fff;
      writing-mode: vertical-rl;
      user-select: none;
    }
    .analysis-panel {
      margin-top: 20px;
      border: 1px solid #ddd;
      padding: 12px;
      max-width: 420px;
      background: #fff;
    }
    .analysis-panel ol { padding-left: 20px; }
    .analysis-panel li { margin: 8px 0; }
    .score { display: inline-block; min-width: 56px; font-weight: bold; }
    .engine-warning {
      margin: 10px 0;
      padding: 10px;
      border: 1px solid #f2b84b;
      background: #fff7e6;
      color: #7a4b00;
      border-radius: 8px;
      font-size: 0.92rem;
    }
    `
  ]
})
export class LineEditorPageComponent implements OnInit, OnDestroy {
  lineId!: number;
  line: any;
  tree: any;
  selectedNode: any;
  currentNodeId: number = 0;
  currentFen: string = '';
  lastMove: { from: string; to: string } | null = null;
  loaded = false;
  deleting = false;
  error: string | null = null;
  analysis: EngineAnalysis = { fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] };

  private analysisSub?: Subscription;
  private analysisTimer?: ReturnType<typeof setTimeout>;

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
    this.api.get<any>(`/lines/${this.lineId}`).subscribe({
      next: (line) => {
        this.line = line;
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            const targetId = selectNodeId ?? tree.root.node.id;
            this.setSelectedNode(targetId);
            this.lastMove = null;
            this.loaded = true;
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
    const parentId = this.currentNodeId === 0 ? null : this.currentNodeId;
    const body: any = { parentId, moveUci: uci };
    this.lastMove = { from: uci.substring(0, 2), to: uci.substring(2, 4) };
    this.error = null;
    this.api.post<any>(`/lines/${this.lineId}/nodes`, body).subscribe({
      next: (created) => {
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            this.setSelectedNode(created.id);
            this.scheduleAnalysis();
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Move was added, but the tree could not be reloaded.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
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

  lineScoreLabel(line: EngineLine) {
    if (line.mate !== undefined) return `M${line.mate}`;
    if (line.scoreCp === undefined) return '—';
    const whiteCp = this.scoreFromWhitePerspective(line.scoreCp, this.currentFen);
    const pawns = whiteCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }

  evalLabel() {
    const first = this.analysis.lines[0];
    if (!first || this.analysis.fen !== this.currentFen) return '—';
    return this.lineScoreLabel(first);
  }

  evalWhitePercent() {
    const first = this.analysis.lines[0];
    if (!first || this.analysis.fen !== this.currentFen) return 50;
    if (first.mate !== undefined) return first.mate > 0 ? 100 : 0;
    const whiteCp = this.scoreFromWhitePerspective(first.scoreCp ?? 0, this.currentFen);
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
}
