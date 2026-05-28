import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Chess } from 'chess.js';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';

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

@Component({
  selector: 'app-game-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent],
  template: `
    <section class="game-detail-page stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a routerLink="/games" class="workbench-breadcrumb">← Games explorer</a>
          <h2 class="workbench-title">{{ gameTitle() }}</h2>
          <div class="workbench-meta" *ngIf="game">
            <span>{{ providerLabel(game.provider) }}</span>
            <span>{{ gameDateLabel(game.endedAt) }}</span>
            <span>{{ game.speedCategory || 'unknown speed' }}</span>
            <span>{{ game.timeControl?.raw || timeControlLabel(game) }}</span>
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
          </div>
          <div class="metric-card">
            <p class="metric-label">Opening</p>
            <p class="metric-value compact-result">{{ game.opening?.eco || '—' }}</p>
            <p class="game-muted">{{ game.opening?.name || 'Opening unavailable' }}</p>
          </div>
        </section>

        <div class="game-workbench">
          <section class="workbench-panel game-board-panel">
            <div>
              <h3 class="workbench-panel-title">Game board</h3>
              <p class="workbench-panel-subtitle">Replay the imported game move by move. The board is read-only; use the controls, keyboard, or the score below.</p>
            </div>

            <div class="game-board-layout">
              <div class="board-shell readonly-board">
                <app-chess-board
                  [fen]="currentFen()"
                  [side]="boardSide()"
                  [lastMove]="currentLastMove()"
                  [arrows]="analysisArrows()"
                  [sound]="false"
                  [positionVersion]="selectedPly"
                ></app-chess-board>
              </div>

              <div class="selected-move-panel">
                <p class="metric-label">Current move</p>
                <h3>{{ selectedMoveLabel() }}</h3>
                <p class="game-muted">{{ selectedMoveMeta() }}</p>

                <div class="selected-analysis-card" *ngIf="selectedAnalysisMove(); else noSelectedAnalysis">
                  <span class="classification-pill" [ngClass]="classificationClass(selectedAnalysisMove()?.classification)">
                    {{ classificationLabel(selectedAnalysisMove()?.classification) }}
                  </span>
                  <dl>
                    <div>
                      <dt>Played</dt>
                      <dd>{{ selectedAnalysisMove()?.playedMoveSan || selectedAnalysisMove()?.playedMoveUci }}</dd>
                    </div>
                    <div>
                      <dt>Best</dt>
                      <dd>{{ selectedAnalysisMove()?.bestMoveUci || '—' }}</dd>
                    </div>
                    <div>
                      <dt>Loss</dt>
                      <dd>{{ scoreLossLabel(selectedAnalysisMove()?.scoreLossCp) }}</dd>
                    </div>
                  </dl>
                </div>

                <ng-template #noSelectedAnalysis>
                  <div class="empty-state compact-empty">
                    {{ analysisRun ? 'No saved analysis for this move.' : 'Analyse the game to see move classifications here.' }}
                  </div>
                </ng-template>
              </div>
            </div>

            <div class="board-action-row">
              <button type="button" class="secondary" (click)="goToStart()" [disabled]="selectedPly === 0" title="Home">⏮ Start</button>
              <button type="button" class="secondary" (click)="goToPrevious()" [disabled]="selectedPly === 0" title="Left arrow">← Previous</button>
              <button type="button" class="secondary" (click)="goToNext()" [disabled]="selectedPly >= moves.length" title="Right arrow">Next →</button>
              <button type="button" class="secondary" (click)="goToEnd()" [disabled]="selectedPly >= moves.length" title="End">End ⏭</button>
              <span class="keyboard-hint">Keyboard: ←/→, Home/End</span>
            </div>
          </section>

          <div class="workbench-side-stack">
            <section class="workbench-panel players-panel">
              <h3 class="workbench-panel-title">Players</h3>
              <div class="player-row">
                <span class="piece-dot white-dot"></span>
                <div>
                  <strong>{{ playerLabel(game.white) }}</strong>
                  <p class="game-muted">White</p>
                </div>
              </div>
              <div class="player-row">
                <span class="piece-dot black-dot"></span>
                <div>
                  <strong>{{ playerLabel(game.black) }}</strong>
                  <p class="game-muted">Black</p>
                </div>
              </div>
            </section>

            <section class="workbench-panel move-score-panel">
              <div>
                <h3 class="workbench-panel-title">Game score</h3>
                <p class="workbench-panel-subtitle">A single played line should read like notation, not a repertoire tree. Select any move to jump there.</p>
              </div>
              <div class="game-score-strip" *ngIf="moves.length > 0; else noScore">
                <button
                  type="button"
                  class="score-chip score-chip-start"
                  [class.score-chip-active]="selectedPly === 0"
                  (click)="selectPly(0)"
                >
                  Start
                </button>
                <button
                  type="button"
                  *ngFor="let move of moves"
                  class="score-chip"
                  [class.score-chip-active]="selectedPly === move.plyNumber"
                  [class.score-chip-user]="move.side === game?.userColor"
                  (click)="selectPly(move.plyNumber)"
                >
                  <span class="score-chip-prefix">{{ movePrefix(move) }}</span>
                  <span>{{ move.san }}</span>
                  <small *ngIf="analysisByPly[move.plyNumber]">{{ shortClassification(analysisByPly[move.plyNumber].classification) }}</small>
                </button>
              </div>
              <ng-template #noScore>
                <div class="empty-state compact-empty">No PGN moves could be loaded for this game.</div>
              </ng-template>
            </section>

            <section class="workbench-panel move-list-panel">
              <div>
                <h3 class="workbench-panel-title">Moves</h3>
                <p class="workbench-panel-subtitle">Compact move list with saved classifications.</p>
              </div>
              <div class="moves-grid" *ngIf="moves.length > 0; else noMoves">
                <button
                  type="button"
                  *ngFor="let pair of movePairs()"
                  class="move-pair-row"
                  [class.move-pair-active]="selectedPly === pair.white?.plyNumber || selectedPly === pair.black?.plyNumber"
                >
                  <span class="move-number">{{ pair.moveNumber }}.</span>
                  <span class="move-token" [class.move-token-active]="selectedPly === pair.white?.plyNumber" (click)="selectPly(pair.white?.plyNumber || 0)">
                    {{ pair.white?.san || '—' }}
                    <small *ngIf="analysisByPly[pair.white?.plyNumber || 0]">{{ shortClassification(analysisByPly[pair.white?.plyNumber || 0].classification) }}</small>
                  </span>
                  <span class="move-token" [class.move-token-active]="selectedPly === pair.black?.plyNumber" (click)="selectPly(pair.black?.plyNumber || 0)">
                    {{ pair.black?.san || '' }}
                    <small *ngIf="analysisByPly[pair.black?.plyNumber || 0]">{{ shortClassification(analysisByPly[pair.black?.plyNumber || 0].classification) }}</small>
                  </span>
                </button>
              </div>
              <ng-template #noMoves>
                <div class="empty-state compact-empty">No PGN moves could be loaded for this game.</div>
              </ng-template>
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
      .game-workbench { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.9fr); gap: 1rem; align-items: start; }
      .game-board-panel { display: grid; gap: 1rem; }
      .game-board-layout { display: grid; grid-template-columns: minmax(320px, 560px) minmax(220px, 1fr); gap: 1rem; align-items: start; }
      .readonly-board { pointer-events: none; }
      .selected-move-panel { border: 1px solid var(--border); border-radius: 24px; background: rgba(255,255,255,0.58); padding: 1rem; display: grid; gap: 1rem; }
      .selected-move-panel h3 { margin: 0; font-size: 1.6rem; letter-spacing: -0.03em; }
      .selected-analysis-card { display: grid; gap: 0.9rem; }
      .selected-analysis-card dl { display: grid; gap: 0.65rem; margin: 0; }
      .selected-analysis-card div { display: flex; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--border); padding-top: 0.65rem; }
      .selected-analysis-card dt { color: var(--muted); font-weight: 800; }
      .selected-analysis-card dd { margin: 0; font-weight: 900; }
      .classification-pill { display: inline-flex; width: fit-content; border-radius: 999px; padding: 0.32rem 0.65rem; font-size: 0.78rem; font-weight: 900; }
      .class-best, .class-good, .class-book { background: var(--success-soft); color: var(--success); }
      .class-inaccuracy, .class-miss { background: var(--warning-soft); color: var(--warning); }
      .class-mistake, .class-blunder { background: var(--danger-soft); color: var(--danger); }
      .class-unknown { background: rgba(35, 27, 21, 0.08); color: var(--muted-strong); }
      .players-panel { display: grid; gap: 0.85rem; }
      .player-row { display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--border); border-radius: 18px; padding: 0.75rem; background: rgba(255,255,255,0.5); }
      .piece-dot { width: 28px; height: 28px; border-radius: 50%; display: inline-block; border: 2px solid rgba(35,27,21,0.24); }
      .white-dot { background: #fffaf1; }
      .black-dot { background: #1c1a18; }
      .move-score-panel { display: grid; gap: 0.9rem; }
      .game-score-strip { display: flex; flex-wrap: wrap; gap: 0.45rem; }
      .score-chip { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 40px; border-radius: 999px; border: 1px solid var(--border); padding: 0.45rem 0.75rem; background: rgba(255,255,255,0.72); color: var(--text); font-weight: 900; box-shadow: none; }
      .score-chip:hover { transform: none; border-color: rgba(183, 121, 39, 0.28); background: rgba(255,248,235,0.95); }
      .score-chip-active { border-color: rgba(183, 121, 39, 0.44); background: var(--accent-soft); color: var(--accent-strong); }
      .score-chip-user { background: rgba(210, 235, 226, 0.7); }
      .score-chip-start { background: rgba(35,27,21,0.06); }
      .score-chip-prefix { color: var(--muted); font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; }
      .score-chip small { color: var(--muted); font-size: 0.65rem; font-weight: 900; letter-spacing: 0.08em; }
      .move-list-panel { max-height: 600px; overflow: auto; }
      .moves-grid { display: grid; gap: 0.35rem; }
      .move-pair-row { display: grid; grid-template-columns: 42px 1fr 1fr; gap: 0.4rem; align-items: center; border-radius: 16px; padding: 0.45rem; background: rgba(35,27,21,0.05); color: var(--text); box-shadow: none; text-align: left; }
      .move-pair-row:hover { transform: none; }
      .move-pair-active { outline: 2px solid rgba(183, 121, 39, 0.24); }
      .move-number { color: var(--muted); font-weight: 900; }
      .move-token { min-height: 34px; border-radius: 12px; padding: 0.42rem 0.55rem; font-weight: 900; cursor: pointer; }
      .move-token:hover, .move-token-active { background: var(--accent-soft); color: var(--accent-strong); }
      .move-token small { display: block; margin-top: 0.15rem; color: var(--muted); font-size: 0.68rem; font-weight: 900; letter-spacing: 0.08em; }
      .compact-empty { padding: 1rem; border-radius: 18px; }
      @media (max-width: 1180px) { .game-workbench, .game-board-layout { grid-template-columns: 1fr; } }
      @media (max-width: 760px) { .game-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 520px) { .game-summary-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class GameDetailPageComponent implements OnInit {
  gameId!: number;
  game: ImportedGameDetail | null = null;
  moves: PlayedMove[] = [];
  analysisRun: AnalysisRun | null = null;
  analysisByPly: Record<number, AnalysisMove> = {};
  selectedPly = 0;
  loading = true;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

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
    this.route.paramMap.subscribe((params) => {
      this.gameId = Number(params.get('gameId'));
      this.loadGame();
    });
  }

  loadGame() {
    this.loading = true;
    this.error = null;
    this.selectedPly = 0;
    this.api.get<ImportedGameDetail>(`/imported-games/${this.gameId}`).subscribe({
      next: (game) => {
        this.game = game;
        this.moves = this.parsePgn(game.pgn || '');
        this.loading = false;
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.analysisRun = null;
        this.analysisByPly = {};
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

  currentMove(): PlayedMove | null {
    return this.selectedPly > 0 ? this.moves[this.selectedPly - 1] || null : null;
  }

  currentFen(): string {
    return this.currentMove()?.fenAfter || 'startpos';
  }

  currentLastMove(): { from: string; to: string } | null {
    const move = this.currentMove();
    return move ? { from: move.uci.substring(0, 2), to: move.uci.substring(2, 4) } : null;
  }

  boardSide(): UserColor {
    return this.game?.userColor || 'WHITE';
  }

  selectPly(ply: number) {
    this.selectedPly = Math.max(0, Math.min(ply, this.moves.length));
    this.cdr.detectChanges();
  }

  goToStart() {
    this.selectPly(0);
  }

  goToPrevious() {
    this.selectPly(this.selectedPly - 1);
  }

  goToNext() {
    this.selectPly(this.selectedPly + 1);
  }

  goToEnd() {
    this.selectPly(this.moves.length);
  }

  selectedAnalysisMove(): AnalysisMove | null {
    return this.analysisByPly[this.selectedPly] || null;
  }

  analysisArrows(): Array<{ from: string; to: string; brush?: string }> {
    const analysis = this.selectedAnalysisMove();
    const move = this.currentMove();
    if (!analysis?.bestMoveUci || !move) return [];
    if (analysis.bestMoveUci === move.uci) return [];
    return [{ from: analysis.bestMoveUci.substring(0, 2), to: analysis.bestMoveUci.substring(2, 4), brush: 'green' }];
  }

  selectedMoveLabel(): string {
    const move = this.currentMove();
    return move ? `${move.moveNumber}${move.side === 'WHITE' ? '.' : '...'} ${move.san}` : 'Starting position';
  }

  selectedMoveMeta(): string {
    const move = this.currentMove();
    if (!move) return 'Before the first move.';
    return `${move.side === 'WHITE' ? 'White' : 'Black'} played ${move.uci}`;
  }

  movePrefix(move: PlayedMove): string {
    return move.side === 'WHITE' ? `${move.moveNumber}.` : `${move.moveNumber}...`;
  }

  movePairs(): Array<{ moveNumber: number; white?: PlayedMove; black?: PlayedMove }> {
    const pairs = new Map<number, { moveNumber: number; white?: PlayedMove; black?: PlayedMove }>();
    for (const move of this.moves) {
      const pair = pairs.get(move.moveNumber) || { moveNumber: move.moveNumber };
      if (move.side === 'WHITE') pair.white = move;
      else pair.black = move;
      pairs.set(move.moveNumber, pair);
    }
    return Array.from(pairs.values());
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

  classificationLabel(value?: string | null): string {
    if (!value) return 'Not classified';
    return value.replace(/_/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  }

  shortClassification(value?: string | null): string {
    if (!value) return '';
    if (value === 'INACCURACY') return 'INACC';
    return value.slice(0, 5);
  }

  classificationClass(value?: string | null): string {
    if (!value) return 'class-unknown';
    return `class-${value.toLowerCase().replace(/_/g, '-')}`;
  }

  scoreLossLabel(value?: number | null): string {
    if (typeof value !== 'number') return '—';
    if (value <= 0) return '0 cp';
    return `${Math.round(value)} cp`;
  }
}
