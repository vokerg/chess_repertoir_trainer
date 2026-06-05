import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Chess } from 'chess.js';
import { Subscription } from 'rxjs';
import { ChessgroundBoardComponent } from '../components/chessground-board.component';
import { EngineEvalBarComponent } from '../components/engine-eval-bar.component';
import { MoveTreeComponent } from '../components/move-tree.component';
import { StockfishPanelComponent } from '../components/stockfish-panel.component';
import { ImportedGameAnalysisService } from '../features/games/data-access/imported-game-analysis.service';
import { ApiService } from '../services/api.service';
import { PositionAnalysisCache, PositionAnalysisCacheService } from '../services/position-analysis-cache.service';
import { EngineAnalysis } from '../services/stockfish-analysis.service';

type Provider = 'LICHESS' | 'CHESS_COM';
type UserColor = 'WHITE' | 'BLACK';
type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';
type AnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

type Classification = 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' | 'BOOK' | 'MISS';

interface ImportedGamePlayer {
  username?: string | null;
  rating?: number | null;
}

interface ImportedGameDetail {
  id: number;
  accountId: number;
  provider: Provider;
  providerGameId: string;
  providerUrl?: string | null;
  endedAt?: string | null;
  speedCategory?: string | null;
  rated?: boolean | null;
  variant?: string | null;
  timeControl: {
    raw?: string | null;
    initial?: number | null;
    increment?: number | null;
  };
  white?: ImportedGamePlayer | null;
  black?: ImportedGamePlayer | null;
  userColor?: UserColor | null;
  opponentUsername?: string | null;
  resultForUser?: ResultForUser | null;
  status?: string | null;
  opening?: {
    eco?: string | null;
    name?: string | null;
  } | null;
  analysis: {
    status: AnalysisStatus;
    userAccuracy?: number | null;
    whiteAccuracy?: number | null;
    blackAccuracy?: number | null;
  };
  pgn?: string | null;
  plies: ImportedGamePly[];
}

interface ImportedGamePly {
  plyNumber: number;
  moveUci: string;
  normalizedFen: string;
  scoreLossCp?: number | null;
  classificationCode?: number | null;
  classification?: string | null;
  positionAnalysis?: PositionAnalysisCache | null;
}

interface AnalysisMove {
  id: number;
  plyNumber: number;
  moveNumber: number;
  side: UserColor;
  playedMoveUci: string;
  playedMoveSan: string | null;
  classification: Classification | string | null;
  scoreLossCp: number | null;
  bestMoveUci: string | null;
  bestScoreCpWhite: number | null;
  playedScoreCpWhite: number | null;
  positionAnalysisId: number;
}

interface AnalysisRun {
  id: number;
  importedGameId: number;
  status: AnalysisStatus;
  depth: number;
  multipv: number;
  engineName: string;
  engineVersion?: string | null;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  whiteAverageCentipawnLoss?: number | null;
  blackAverageCentipawnLoss?: number | null;
  whiteMovesAnalyzed?: number | null;
  blackMovesAnalyzed?: number | null;
  summary?: any;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  moves: AnalysisMove[];
  criticalMoves: AnalysisMove[];
}

interface AnalysisResponse {
  run: AnalysisRun;
}

interface PlayedMove {
  plyNumber: number;
  moveNumber: number;
  side: UserColor;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

interface GameTreeNodeData {
  id: number;
  plyNumber: number | null;
  moveNumber: number | null;
  side: UserColor | null;
  moveSan: string | null;
  moveUci: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
  source: 'GAME' | 'LOCAL';
  analysisMove: AnalysisMove | null;
}

interface GameTreeNode {
  node: GameTreeNodeData;
  children: GameTreeNode[];
}

interface GameTree {
  root: GameTreeNode;
}

@Component({
  selector: 'app-game-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessgroundBoardComponent, EngineEvalBarComponent, MoveTreeComponent, StockfishPanelComponent],
  template: `
    <section class="game-detail-page stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a routerLink="/games" class="workbench-breadcrumb">← Games explorer</a>
          <h2 class="workbench-title">{{ gameTitle() }}</h2>
          <div class="workbench-meta" *ngIf="game">
            <span>White: {{ playerLabel(game.white) }}</span>
            <span>Black: {{ playerLabel(game.black) }}</span>
            <span>{{ providerLabel(game.provider) }}</span>
            <span>{{ gameDateLabel(game.endedAt) }}</span>
            <span>{{ game.speedCategory || 'unknown speed' }}</span>
            <span>{{ game.timeControl?.raw || timeControlLabel(game) }}</span>
            <span>Selected: {{ selectedLabel() }}</span>
          </div>
        </div>
        <nav class="workbench-mode-switch" aria-label="Game actions">
          <a class="mode-pill" routerLink="/games">Explorer</a>
          <a *ngIf="game?.providerUrl" class="mode-pill" [href]="game?.providerUrl" target="_blank" rel="noreferrer">Open on {{ providerLabel(game?.provider) }}</a>
        </nav>
      </header>

      <p *ngIf="error" class="status-error">{{ error }}</p>

      <section *ngIf="loading" class="section-card">
        <p class="status-note">Loading imported game...</p>
      </section>

      <ng-container *ngIf="!loading && game">
        <section class="game-summary-grid">
          <div class="metric-card">
            <p class="metric-label">Result</p>
            <p class="metric-value compact-result">{{ resultLabel(game.resultForUser) }}</p>
            <p class="game-muted">{{ colorLabel(game.userColor) }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Accuracy</p>
            <p class="metric-value compact-result">{{ accuracyLabel(game.analysis?.userAccuracy) }}</p>
            <p class="game-muted">W {{ accuracyLabel(game.analysis?.whiteAccuracy) }} · B {{ accuracyLabel(game.analysis?.blackAccuracy) }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Analysis</p>
            <p class="metric-value compact-result">{{ analysisStatusLabel() }}</p>
            <p class="game-muted">{{ analysisSummaryLabel() }}</p>
            <div class="game-analysis-actions">
              <button type="button" class="secondary" (click)="analyzeImportedGame(false)" [disabled]="importedGameAnalysis.progress().running">
                {{ importedGameAnalysis.progress().running ? 'Analysing...' : 'Analyze' }}
              </button>
              <button type="button" class="secondary" (click)="analyzeImportedGame(true)" [disabled]="importedGameAnalysis.progress().running">
                Force re-analysis
              </button>
            </div>
            <p *ngIf="importedGameAnalysis.progress().running || importedGameAnalysis.progress().error" class="game-muted">
              {{ importedGameAnalysis.progress().error || (importedGameAnalysis.progress().message + ' (' + importedGameAnalysis.progress().currentPly + '/' + importedGameAnalysis.progress().totalPlies + ')') }}
            </p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Opening</p>
            <p class="metric-value compact-result">{{ game.opening?.eco || '—' }}</p>
            <p class="game-muted">{{ game.opening?.name || 'Opening unavailable' }}</p>
          </div>
        </section>

        <div class="line-workbench">
          <section class="workbench-panel game-board-panel">
            <div>
              <h3 class="workbench-panel-title">Game board</h3>
              <p class="workbench-panel-subtitle">Imported moves load as the main branch. Play extra legal moves on the board to explore local sidelines that are not saved.</p>
            </div>

            <div class="board-stage">
              <app-engine-eval-bar
                [analysis]="analysis"
                [currentFen]="currentFen"
                [flipped]="isBlackPerspective()"
                [savedScoreCpWhite]="savedScoreCpWhiteForSelectedNode()"
              ></app-engine-eval-bar>

              <div class="board-shell">
                <app-chessground-board
                  [fen]="currentFen"
                  [side]="boardSide()"
                  [lastMove]="lastMove"
                  [arrows]="analysisArrows()"
                  [sound]="false"
                  [positionVersion]="boardPositionVersion"
                  (move)="onBoardMove($event)"
                ></app-chessground-board>
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
                <p class="workbench-panel-subtitle">The imported game is the main line. Any move you add during analysis appears here as a temporary sideline.</p>
              </div>
              <app-move-tree [tree]="tree" [selectedNodeId]="currentNodeId" (nodeSelected)="onSelectNode($event)"></app-move-tree>
            </section>

            <section class="workbench-panel engine-panel-modern">
              <app-stockfish-panel
                [analysis]="analysis"
                [currentFen]="currentFen"
                (analyze)="rerunAnalysis()"
              ></app-stockfish-panel>
            </section>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .game-detail-page { gap: 1rem; }
      .game-summary-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(160px, 1fr)); }
      .compact-result { font-size: 1.45rem; line-height: 1.1; }
      .game-muted { margin: 0.3rem 0 0; color: var(--muted); line-height: 1.35; }
      .game-analysis-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.7rem; }
      .game-board-panel { display: grid; gap: 1rem; }
      .compact-empty { padding: 1rem; border-radius: 18px; }
      @media (max-width: 760px) { .game-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 520px) { .game-summary-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class GameDetailPageComponent implements OnInit, OnDestroy {
  gameId!: number;
  game: ImportedGameDetail | null = null;
  moves: PlayedMove[] = [];
  analysisRun: AnalysisRun | null = null;
  analysisByPly: Record<number, AnalysisMove> = {};
  tree: GameTree | null = null;
  selectedNode: GameTreeNode | null = null;
  currentNodeId = 0;
  currentFen = 'startpos';
  lastMove: { from: string; to: string } | null = null;
  boardPositionVersion = 0;
  loading = true;
  error: string | null = null;
  analysis: EngineAnalysis = { fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] };

  private analysisSub?: Subscription;
  private analysisTimer?: ReturnType<typeof setTimeout>;
  private nextLocalNodeId = 1000000;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private positionAnalysisCache: PositionAnalysisCacheService,
    protected importedGameAnalysis: ImportedGameAnalysisService,
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
    this.analysisSub = this.positionAnalysisCache.state$.subscribe((analysis) => {
      this.analysis = analysis;
      this.cdr.detectChanges();
    });
    this.route.paramMap.subscribe((params) => {
      this.gameId = Number(params.get('gameId'));
      this.loadGame();
    });
  }

  ngOnDestroy() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisSub?.unsubscribe();
    this.positionAnalysisCache.stop();
  }

  loadGame() {
    this.loading = true;
    this.error = null;
    this.analysisRun = null;
    this.analysisByPly = {};
    this.tree = null;
    this.selectedNode = null;
    this.currentNodeId = 0;
    this.currentFen = 'startpos';
    this.lastMove = null;
    this.nextLocalNodeId = 1000000;

    this.api.get<ImportedGameDetail>(`/imported-games/${this.gameId}`).subscribe({
      next: (game) => {
        this.game = game;
        this.moves = this.parsePgn(game.pgn || '');
        this.tree = this.buildTree(this.moves);
        this.setSelectedNode(0);
        this.loading = false;
        this.boardPositionVersion++;
        this.scheduleAnalysis();
        this.cdr.detectChanges();
        this.loadAnalysis();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not load imported game.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadAnalysis() {
    this.api.get<AnalysisResponse>(`/imported-games/${this.gameId}/analysis`).subscribe({
      next: (data) => {
        this.analysisRun = data.run;
        this.analysisByPly = Object.fromEntries((data.run.moves || []).map((move) => [move.plyNumber, move]));
        this.attachSavedAnalysis();
        this.cdr.detectChanges();
      },
      error: () => {
        this.analysisRun = null;
        this.analysisByPly = {};
        this.attachSavedAnalysis();
        this.cdr.detectChanges();
      },
    });
  }

  parsePgn(pgn: string): PlayedMove[] {
    if (!pgn.trim()) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      return (chess.history({ verbose: true }) as any[]).map((move, index) => {
        const plyNumber = index + 1;
        return {
          plyNumber,
          moveNumber: Math.ceil(plyNumber / 2),
          side: move.color === 'b' ? 'BLACK' : 'WHITE',
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion || ''}`,
          fenBefore: move.before,
          fenAfter: move.after,
        };
      });
    } catch {
      this.error = 'Could not parse this game PGN for board replay.';
      return [];
    }
  }

  buildTree(moves: PlayedMove[]): GameTree {
    const startFen = moves[0]?.fenBefore || new Chess().fen();
    const root: GameTreeNode = {
      node: {
        id: 0,
        plyNumber: null,
        moveNumber: null,
        side: null,
        moveSan: null,
        moveUci: null,
        fenBefore: startFen,
        fenAfter: startFen,
        isUserMove: false,
        source: 'GAME',
        analysisMove: null,
      },
      children: [],
    };

    let parent = root;
    for (const move of moves) {
      const child: GameTreeNode = {
        node: {
          id: move.plyNumber,
          plyNumber: move.plyNumber,
          moveNumber: move.moveNumber,
          side: move.side,
          moveSan: move.san,
          moveUci: move.uci,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          isUserMove: move.side === this.game?.userColor,
          source: 'GAME',
          analysisMove: this.analysisByPly[move.plyNumber] || null,
        },
        children: [],
      };
      parent.children.push(child);
      parent = child;
    }

    return { root };
  }

  findNode(id: number, node = this.tree?.root): GameTreeNode | null {
    if (!node) return null;
    if (node.node.id === id) return node;
    for (const child of node.children || []) {
      const found = this.findNode(id, child);
      if (found) return found;
    }
    return null;
  }

  findParentNode(id: number, node = this.tree?.root, parent: GameTreeNode | null = null): GameTreeNode | null {
    if (!node) return null;
    if (node.node.id === id) return parent;
    for (const child of node.children || []) {
      const found = this.findParentNode(id, child, node);
      if (found) return found;
    }
    return null;
  }

  setSelectedNode(id: number) {
    const selected = this.findNode(id) || this.tree?.root || null;
    if (!selected) return;
    this.selectedNode = selected;
    this.currentNodeId = selected.node.id;
    this.currentFen = selected.node.fenAfter;
    this.lastMove = selected.node.id === 0 || !selected.node.moveUci
      ? null
      : { from: selected.node.moveUci.substring(0, 2), to: selected.node.moveUci.substring(2, 4) };
  }

  onSelectNode(id: number) {
    this.setSelectedNode(id);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  onBoardMove(uci: string) {
    if (!this.selectedNode) return;

    const existingChild = (this.selectedNode.children || []).find((child) => child.node.moveUci === uci);
    if (existingChild) {
      this.setSelectedNode(existingChild.node.id);
      this.scheduleAnalysis();
      this.cdr.detectChanges();
      return;
    }

    try {
      const chess = new Chess(this.currentFen);
      const beforeFen = chess.fen();
      const side: UserColor = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
      const moveNumber = Number(beforeFen.split(' ')[5]) || 1;
      const move = chess.move({
        from: uci.substring(0, 2),
        to: uci.substring(2, 4),
        promotion: uci.substring(4, 5) || undefined,
      });
      if (!move) {
        this.boardPositionVersion++;
        this.cdr.detectChanges();
        return;
      }

      const child: GameTreeNode = {
        node: {
          id: this.nextLocalNodeId++,
          plyNumber: null,
          moveNumber,
          side,
          moveSan: move.san,
          moveUci: uci,
          fenBefore: beforeFen,
          fenAfter: chess.fen(),
          isUserMove: side === this.game?.userColor,
          source: 'LOCAL',
          analysisMove: null,
        },
        children: [],
      };

      this.selectedNode.children.push(child);
      this.setSelectedNode(child.node.id);
      this.scheduleAnalysis();
      this.cdr.detectChanges();
    } catch {
      this.boardPositionVersion++;
      this.cdr.detectChanges();
    }
  }

  goToStart() {
    if (!this.tree?.root) return;
    this.setSelectedNode(0);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  goToPrevious() {
    const parent = this.findParentNode(this.currentNodeId);
    if (!parent) return;
    this.setSelectedNode(parent.node.id);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  goToNext() {
    const firstChild = this.selectedNode?.children?.[0];
    if (!firstChild) return;
    this.setSelectedNode(firstChild.node.id);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  goToEnd() {
    let node = this.selectedNode;
    while (node?.children?.length) {
      node = node.children[0];
    }
    if (!node) return;
    this.setSelectedNode(node.node.id);
    this.scheduleAnalysis();
    this.cdr.detectChanges();
  }

  scheduleAnalysis() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.rerunAnalysis(), 250);
  }

  rerunAnalysis() {
    if (!this.currentFen) return;
    this.positionAnalysisCache.analyze(this.currentFen, {
      depth: 12,
      multipv: 3,
      seedPosition: this.positionAnalysisCache.seedForFen(this.currentFen, this.game?.plies ?? []),
    });
  }

  async analyzeImportedGame(force: boolean) {
    if (!this.gameId || this.importedGameAnalysis.progress().running) return;
    this.error = null;
    try {
      await this.importedGameAnalysis.analyzeGame(this.gameId, force);
      this.loadGame();
    } catch (err: any) {
      this.error = err?.error?.message || err?.error?.error || err?.message || 'Could not analyse imported game.';
      this.cdr.detectChanges();
    }
  }

  attachSavedAnalysis() {
    if (!this.tree) return;
    for (const move of Object.values(this.analysisByPly)) {
      const node = this.findNode(move.plyNumber);
      if (node) node.node.analysisMove = move;
    }
  }

  savedScoreCpWhiteForSelectedNode(): number | null {
    const scoreCpWhite = this.selectedNode?.node?.analysisMove?.playedScoreCpWhite;
    return typeof scoreCpWhite === 'number' ? scoreCpWhite : null;
  }

  analysisArrows(): Array<{ from: string; to: string; brush?: string }> {
    const move = this.analysis.bestMove;
    if (!move || this.analysis.fen !== this.currentFen || move === '(none)') return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  }

  selectedLabel() {
    if (!this.selectedNode || this.selectedNode.node.id === 0) return 'start';
    const side = this.selectedNode.node.side === 'BLACK' ? '...' : '.';
    return `${this.selectedNode.node.moveNumber}${side} ${this.selectedNode.node.moveSan || this.selectedNode.node.moveUci}`;
  }

  isBlackPerspective() {
    return this.game?.userColor === 'BLACK';
  }

  boardSide(): UserColor {
    return this.game?.userColor || 'WHITE';
  }

  gameTitle(): string {
    if (!this.game) return 'Imported game';
    return `${this.playerLabel(this.game.white)} vs ${this.playerLabel(this.game.black)}`;
  }

  providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }

  playerLabel(player?: ImportedGamePlayer | null): string {
    if (!player) return 'Unknown';
    return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
  }

  resultLabel(result?: ResultForUser | null): string {
    if (result === 'WIN') return 'Win';
    if (result === 'DRAW') return 'Draw';
    if (result === 'LOSS') return 'Loss';
    return 'Unknown';
  }

  colorLabel(color?: UserColor | null): string {
    if (color === 'WHITE') return 'You had White';
    if (color === 'BLACK') return 'You had Black';
    return 'Colour unknown';
  }

  gameDateLabel(value?: string | null): string {
    if (!value) return 'Date unknown';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  timeControlLabel(game: ImportedGameDetail): string {
    const initial = game.timeControl?.initial;
    const increment = game.timeControl?.increment;
    if (typeof initial === 'number' && typeof increment === 'number') return `${initial}+${increment}`;
    return 'Time control unknown';
  }

  accuracyLabel(value?: number | null): string {
    return typeof value === 'number' ? `${Math.round(value)}%` : '—';
  }

  analysisStatusLabel(): string {
    if (this.analysisRun?.status === 'COMPLETED' || this.game?.analysis?.status === 'COMPLETED') return 'Saved';
    if (this.game?.analysis?.status === 'RUNNING') return 'Running';
    if (this.game?.analysis?.status === 'FAILED') return 'Failed';
    return 'None';
  }

  analysisSummaryLabel(): string {
    if (!this.analysisRun) return 'No saved analysis loaded';
    const moveCount = this.analysisRun.moves?.length || 0;
    const critical = this.analysisRun.criticalMoves?.length || 0;
    return `${moveCount} analysed moves · ${critical} critical`;
  }

}
