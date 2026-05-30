import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '../components/chess-board.component';
import { EngineEvalBarComponent } from '../components/engine-eval-bar.component';
import { StockfishPanelComponent } from '../components/stockfish-panel.component';
import { ApiService } from '../services/api.service';
import { EngineAnalysis } from '../services/stockfish-analysis.service';

type Provider = 'LICHESS' | 'CHESS_COM';
type UserColor = 'WHITE' | 'BLACK';
type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';
type AnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

interface FacetValue {
  value?: string | number | boolean | null;
  label?: string | null;
  count?: number | null;
  id?: number | string | null;
  name?: string | null;
  provider?: Provider | null;
  username?: string | null;
}

interface ImportedGameFacetsResponse {
  accounts?: FacetValue[];
  providers?: FacetValue[];
  speeds?: FacetValue[];
  variants?: FacetValue[];
  results?: FacetValue[];
  colors?: FacetValue[];
  openings?: FacetValue[];
  analysisStatuses?: FacetValue[];
}

interface OpeningFilters {
  accountId: string;
  provider: '' | Provider | 'ALL';
  resultForUser: '' | ResultForUser;
  userColor: '' | UserColor;
  speedCategory: string;
  timeControl: string;
  opponent: string;
  openingName: string;
  analysisStatus: '' | AnalysisStatus;
  minAccuracy: string;
  maxAccuracy: string;
  minOpponentRating: string;
  from: string;
  to: string;
}

interface OpeningWdl {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
}

interface OpeningNextMove {
  moveUci: string;
  moveSan?: string | null;
  fenAfter: string;
  side: UserColor;
  moveNumber: number;
  occurrences: number;
  games: OpeningWdl;
}

interface OpeningAnalysisResponse {
  fen: string;
  normalizedFen: string;
  sideToMove: UserColor;
  fullMoveNumber: number;
  ratedOnly: boolean;
  occurrences: number;
  games: OpeningWdl;
  nextMoves: OpeningNextMove[];
  appliedFilters: Record<string, unknown>;
}

interface BackendEngineLine {
  multipv: number;
  depth: number;
  moveUci?: string;
  scoreCpWhite?: number;
  mateWhite?: number;
  pvUci: string[];
}

interface BackendPositionAnalysis {
  fen: string;
  bestMoveUci?: string | null;
  lines: BackendEngineLine[];
  fromCache: boolean;
}

interface BackendPositionAnalysisResponse {
  position: BackendPositionAnalysis;
}

interface PlayedMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  fenAfter: string;
}

@Component({
  selector: 'app-opening-analysis-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChessBoardComponent, EngineEvalBarComponent, StockfishPanelComponent],
  template: `
    <section class="opening-page stack">
      <section class="section-card opening-hero">
        <div>
          <span class="eyebrow">Personal opening analysis</span>
          <h2 class="page-heading page-heading-library">Explore your rated opening results</h2>
          <p class="page-subtitle">
            Move on the board to ask: how often did this exact position appear in my indexed rated games, what was my WDL, and what did I play next?
          </p>
        </div>
        <div class="opening-hero-stats" aria-label="Position summary">
          <div class="metric-card opening-mini-card">
            <p class="metric-label">Games</p>
            <p class="metric-value">{{ wdl.total }}</p>
          </div>
          <div class="metric-card opening-mini-card">
            <p class="metric-label">Score</p>
            <p class="metric-value">{{ scoreLabel(wdl) }}</p>
          </div>
          <div class="metric-card opening-mini-card">
            <p class="metric-label">Next moves</p>
            <p class="metric-value">{{ analysis?.nextMoves?.length || 0 }}</p>
          </div>
        </div>
      </section>

      <section class="section-card opening-filters" aria-label="Opening analysis filters">
        <div class="perspective-switch" role="group" aria-label="Opening analysis perspective">
          <button type="button" class="perspective-option" [class.perspective-option-active]="filters.userColor === 'WHITE'" (click)="setPerspective('WHITE')">
            <strong>White</strong>
          </button>
          <button type="button" class="perspective-option" [class.perspective-option-active]="filters.userColor === 'BLACK'" (click)="setPerspective('BLACK')">
            <strong>Black</strong>
          </button>
        </div>

        <div class="opening-filter-grid">
          <label class="opening-field">
            <span>Account</span>
            <select [(ngModel)]="filters.accountId" (ngModelChange)="refresh()">
              <option value="">All accounts</option>
              <option *ngFor="let account of facets.accounts || []" [value]="facetKey(account)">{{ accountLabel(account) }}</option>
            </select>
          </label>

          <label class="opening-field">
            <span>Provider</span>
            <select [(ngModel)]="filters.provider" (ngModelChange)="refresh()">
              <option value="ALL">Lichess + Chess.com</option>
              <option value="LICHESS">Lichess</option>
              <option value="CHESS_COM">Chess.com</option>
            </select>
          </label>

          <label class="opening-field">
            <span>Result</span>
            <select [(ngModel)]="filters.resultForUser" (ngModelChange)="refresh()">
              <option value="">Any result</option>
              <option value="WIN">Win</option>
              <option value="DRAW">Draw</option>
              <option value="LOSS">Loss</option>
            </select>
          </label>

          <label class="opening-field">
            <span>Control</span>
            <select [(ngModel)]="filters.speedCategory" (ngModelChange)="refresh()">
              <option value="">Any control</option>
              <option value="bullet">Bullet</option>
              <option value="blitz,rapid">Blitz + rapid</option>
              <option value="blitz">Blitz</option>
              <option value="rapid">Rapid</option>
              <option value="classical">Classical</option>
              <option *ngFor="let speed of customSpeedFacets()" [value]="facetKey(speed)">{{ facetLabel(speed) }}</option>
            </select>
          </label>

          <label class="opening-field">
            <span>Analysis</span>
            <select [(ngModel)]="filters.analysisStatus" (ngModelChange)="refresh()">
              <option value="">Any status</option>
              <option value="NOT_ANALYZED">Not analysed</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>

          <label class="opening-field">
            <span>Time control</span>
            <input [(ngModel)]="filters.timeControl" (keyup.enter)="refresh()" placeholder="e.g. 10+5" />
          </label>

          <label class="opening-field">
            <span>Opponent</span>
            <input [(ngModel)]="filters.opponent" (keyup.enter)="refresh()" placeholder="Username" />
          </label>

          <label class="opening-field">
            <span>Opening</span>
            <input [(ngModel)]="filters.openingName" (keyup.enter)="refresh()" placeholder="Sicilian, London..." />
          </label>

          <label class="opening-field compact">
            <span>Min accuracy</span>
            <input [(ngModel)]="filters.minAccuracy" (keyup.enter)="refresh()" inputmode="decimal" placeholder="0" />
          </label>

          <label class="opening-field compact">
            <span>Max accuracy</span>
            <input [(ngModel)]="filters.maxAccuracy" (keyup.enter)="refresh()" inputmode="decimal" placeholder="100" />
          </label>

          <label class="opening-field compact">
            <span>Opp. rating &gt;</span>
            <input [(ngModel)]="filters.minOpponentRating" (keyup.enter)="refresh()" inputmode="numeric" placeholder="1200" />
          </label>

          <label class="opening-field compact">
            <span>From</span>
            <input type="date" [(ngModel)]="filters.from" (ngModelChange)="refresh()" />
          </label>

          <label class="opening-field compact">
            <span>To</span>
            <input type="date" [(ngModel)]="filters.to" (ngModelChange)="refresh()" />
          </label>
        </div>

        <div class="opening-filter-actions">
          <button type="button" (click)="refresh()" [disabled]="loading">{{ loading ? 'Loading...' : 'Apply filters' }}</button>
          <button type="button" class="secondary" (click)="resetFilters()" [disabled]="loading">Reset filters</button>
        </div>
      </section>

      <p *ngIf="error" class="status-error">{{ error }}</p>

      <div class="opening-workbench">
        <section class="workbench-panel opening-board-panel">
          <div class="opening-panel-header">
            <div>
              <h3 class="workbench-panel-title">Board probe</h3>
              <p class="workbench-panel-subtitle">{{ perspectiveHelpText() }}</p>
            </div>
            <div class="side-stack">
              <span class="side-pill">{{ analysis?.sideToMove || sideToMoveLabel() }} to move</span>
              <span class="turn-pill" [class.turn-pill-user]="isUserTurn()">{{ turnOwnerLabel() }}</span>
            </div>
          </div>

          <div class="board-stage opening-board-stage">
            <app-engine-eval-bar
              [analysis]="engine"
              [currentFen]="currentFen"
              [flipped]="isBlackPerspective()"
              [fitHeight]="true"
            ></app-engine-eval-bar>

            <div class="board-shell">
              <app-chess-board
                [fen]="currentFen"
                [side]="boardSide()"
                [lastMove]="lastMove"
                [arrows]="analysisArrows()"
                [sound]="false"
                [positionVersion]="boardPositionVersion"
                (move)="onBoardMove($event)"
              ></app-chess-board>
            </div>
          </div>

          <div class="board-action-row">
            <button type="button" class="secondary" (click)="resetBoard()" [disabled]="history.length === 0">⏮ Start</button>
            <button type="button" class="secondary" (click)="goBack()" [disabled]="history.length === 0" title="Left arrow">← Back</button>
            <button type="button" class="secondary" (click)="flipBoard()">Flip board</button>
            <span class="keyboard-hint">Keyboard: ← to go back, Home for start</span>
          </div>

          <div class="opening-line-card">
            <p class="metric-label">Current line</p>
            <p class="opening-line-text">{{ lineLabel() }}</p>
          </div>
        </section>

        <section class="workbench-panel opening-tree-panel">
          <div class="opening-panel-header">
            <div>
              <h3 class="workbench-panel-title">Next moves from your games</h3>
              <p class="workbench-panel-subtitle">Each row is a move you actually played or faced from this exact normalized position.</p>
            </div>
            <button type="button" class="secondary" (click)="refresh()" [disabled]="loading">Refresh</button>
          </div>

          <div class="opening-position-summary">
            <div>
              <p class="metric-label">Position WDL</p>
              <p class="opening-wdl-line">{{ wdlLabel(wdl) }}</p>
            </div>
          </div>

          <section class="engine-summary-card" aria-label="Stockfish opening evaluation">
            <app-stockfish-panel
              [analysis]="engine"
              [currentFen]="currentFen"
              (analyze)="rerunAnalysis()"
            ></app-stockfish-panel>
          </section>

          <div class="opening-next-moves-frame" [class.opening-next-moves-loading]="loading">
            <p *ngIf="loading" class="status-note opening-loading-note">Loading opening analysis...</p>

            <div *ngIf="analysis && analysis.nextMoves.length === 0" class="empty-state compact-empty opening-next-empty">
              No indexed rated games reached this position with the current filters. Index more games or widen the filters.
            </div>

            <div class="opening-move-tree" *ngIf="analysis && analysis.nextMoves.length > 0">
              <button
                *ngFor="let move of analysis.nextMoves"
                type="button"
                class="opening-move-row"
                (click)="playMove(move)"
                [disabled]="loading"
              >
                <span class="move-node-dot"></span>
                <span class="move-main">
                  <strong>{{ move.moveSan || move.moveUci }}</strong>
                  <small>{{ move.moveUci }}</small>
                </span>
                <span class="move-wdl">
                  <span>{{ wdlLabel(move.games) }}</span>
                  <small>{{ scoreLabel(move.games) }}</small>
                </span>
              </button>
            </div>

            <div class="opening-move-tree opening-move-tree-placeholder" *ngIf="loading && !analysis" aria-hidden="true">
              <div *ngFor="let row of loadingMoveRows" class="opening-move-row opening-move-row-placeholder">
                <span class="move-node-dot"></span>
                <span class="move-main">
                  <strong>&nbsp;</strong>
                  <small>&nbsp;</small>
                </span>
                <span class="move-wdl">
                  <span>&nbsp;</span>
                  <small>&nbsp;</small>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      .opening-page { gap: 1rem; }
      .opening-hero { display: flex; gap: 1.25rem; align-items: stretch; justify-content: space-between; }
      .opening-hero-stats { display: grid; grid-template-columns: repeat(3, minmax(108px, 1fr)); gap: 0.8rem; min-width: min(430px, 100%); }
      .opening-mini-card { min-height: 112px; }
      .opening-filters { display: grid; gap: 1rem; }
      .opening-panel-header { display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between; }
      .opening-section-title { margin: 0; font-size: 1.15rem; }
      .opening-muted { margin: 0.25rem 0 0; color: var(--muted); line-height: 1.35; }
      .side-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.55rem 0.85rem; font-weight: 800; color: var(--accent-strong); background: var(--accent-soft); white-space: nowrap; }
      .perspective-switch { display: inline-flex; width: fit-content; gap: 0.25rem; border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem; background: rgba(35, 27, 21, 0.06); }
      .perspective-option { min-height: 34px; border-radius: 999px; padding: 0.42rem 0.9rem; background: transparent; color: var(--muted-strong); box-shadow: none; font-size: 0.84rem; }
      .perspective-option:hover:not(:disabled) { transform: none; background: rgba(255,255,255,0.55); }
      .perspective-option-active { background: var(--surface-strong); color: var(--accent-strong); box-shadow: 0 6px 14px rgba(73, 48, 25, 0.08); }
      .side-stack { display: grid; justify-items: end; gap: 0.45rem; }
      .turn-pill { display: inline-flex; width: fit-content; align-items: center; border-radius: 999px; padding: 0.35rem 0.65rem; background: rgba(35, 27, 21, 0.08); color: var(--muted-strong); font-size: 0.78rem; font-weight: 900; }
      .turn-pill-user { background: var(--success-soft); color: var(--success); }
      .opening-filter-grid { display: grid; grid-template-columns: repeat(6, minmax(130px, 1fr)); gap: 0.75rem; }
      .opening-field { display: grid; gap: 0.35rem; color: var(--muted-strong); font-size: 0.82rem; font-weight: 800; }
      .opening-field span { text-transform: uppercase; letter-spacing: 0.06em; }
      .opening-field input, .opening-field select { min-height: 42px; border-radius: 14px; border: 1px solid var(--border); background: rgba(255,255,255,0.78); padding: 0 0.75rem; color: var(--text); font-weight: 700; }
      .opening-field.compact { min-width: 120px; }
      .opening-filter-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
      .opening-workbench { display: grid; grid-template-columns: minmax(320px, 0.9fr) minmax(360px, 1.1fr); gap: 1rem; align-items: start; }
      .opening-board-panel, .opening-tree-panel { display: grid; gap: 1rem; }
      .opening-board-stage { --opening-eval-width: 34px; --opening-board-gap: 0.65rem; grid-template-columns: var(--opening-eval-width) minmax(0, min(520px, calc(100% - var(--opening-eval-width) - var(--opening-board-gap)))); gap: var(--opening-board-gap); justify-content: center; margin-top: 0; min-width: 0; }
      .opening-board-stage app-engine-eval-bar { height: 100%; min-width: 0; }
      .opening-board-stage .board-shell { width: 100%; min-width: 0; }
      .opening-board-stage app-chess-board { display: block; width: 100%; min-width: 0; }
      .opening-board-stage app-chess-board ::ng-deep .board-shell { width: 100%; }
      .board-action-row { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; }
      .opening-line-card { border: 1px solid var(--border); border-radius: 18px; background: rgba(255,255,255,0.6); padding: 0.9rem; }
      .opening-line-text { margin: 0.2rem 0 0; font-weight: 800; color: var(--text); line-height: 1.45; }
      .opening-position-summary { display: flex; justify-content: space-between; gap: 1rem; border: 1px solid var(--border); border-radius: 20px; background: rgba(255,255,255,0.58); padding: 1rem; }
      .opening-wdl-line { margin: 0.25rem 0 0; font-size: 1.35rem; font-weight: 900; color: var(--text); }
      .opening-score-ring { display: inline-grid; place-items: center; min-width: 74px; height: 74px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-strong); font-weight: 900; }
      .engine-summary-card { display: grid; gap: 0.65rem; border: 1px solid var(--border); border-radius: 20px; background: rgba(255,255,255,0.58); padding: 1rem; }
      .opening-next-moves-frame { position: relative; display: grid; gap: 0.65rem; min-height: 194px; }
      .opening-loading-note { position: absolute; right: 0; top: -0.25rem; z-index: 2; border: 1px solid var(--border); border-radius: 999px; padding: 0.38rem 0.65rem; background: rgba(255, 252, 247, 0.96); box-shadow: 0 8px 18px rgba(35, 27, 21, 0.08); font-weight: 800; }
      .opening-next-moves-loading .opening-move-tree, .opening-next-moves-loading .opening-next-empty { opacity: 0.52; }
      .opening-move-tree { position: relative; display: grid; gap: 0.65rem; }
      .opening-move-tree::before { content: ''; position: absolute; left: 12px; top: 10px; bottom: 10px; width: 2px; background: rgba(35, 27, 21, 0.1); }
      .opening-move-row { position: relative; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 0.8rem; align-items: center; width: 100%; border: 1px solid var(--border); border-radius: 18px; background: rgba(255,255,255,0.72); padding: 0.85rem; text-align: left; color: var(--text); cursor: pointer; }
      .opening-move-row:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(35, 27, 21, 0.1); }
      .opening-move-row:disabled { cursor: wait; transform: none; box-shadow: none; }
      .opening-move-tree-placeholder .opening-move-row-placeholder { cursor: wait; }
      .opening-move-row-placeholder .move-main, .opening-move-row-placeholder .move-wdl { opacity: 0.28; background: linear-gradient(90deg, rgba(35,27,21,0.08), rgba(255,255,255,0.44), rgba(35,27,21,0.08)); border-radius: 10px; }
      .move-node-dot { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 5px var(--accent-soft); z-index: 1; }
      .move-main, .move-wdl { display: grid; gap: 0.18rem; }
      .move-main small, .move-wdl small { color: var(--muted); font-weight: 700; }
      .move-wdl { text-align: right; font-weight: 900; }
      @media (max-width: 1050px) {
        .opening-hero, .opening-workbench { grid-template-columns: 1fr; display: grid; }
        .opening-filter-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
      }
      @media (max-width: 680px) {
        .opening-hero-stats { grid-template-columns: 1fr; }
        .perspective-switch { display: flex; width: 100%; }
        .perspective-option { flex: 1; justify-content: center; }
        .opening-filter-grid { grid-template-columns: 1fr; }
        .opening-panel-header, .opening-position-summary { display: grid; }
        .side-stack { justify-items: start; }
        .move-wdl { text-align: left; }
      }
      @media (max-width: 640px) {
        .opening-board-stage { grid-template-columns: minmax(0, min(100%, 520px)); gap: 0; }
      }
    `,
  ],
})
export class OpeningAnalysisPageComponent implements OnInit, OnDestroy {
  readonly loadingMoveRows = [0, 1, 2];

  facets: ImportedGameFacetsResponse = {};
  filters: OpeningFilters = this.defaultFilters();
  analysis: OpeningAnalysisResponse | null = null;
  engine: EngineAnalysis = { fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] };
  loading = false;
  error: string | null = null;
  boardPositionVersion = 0;
  lastMove: { from: string; to: string } | null = null;
  history: PlayedMove[] = [];
  boardFlipped = false;
  currentFen = new Chess().fen();

  private analysisTimer?: ReturnType<typeof setTimeout>;
  private engineRequestSeq = 0;
  private chess = new Chess();

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goBack();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.resetBoard();
    }
  }

  ngOnInit() {
    this.loadFacets();
    this.refresh();
    this.scheduleAnalysis();
  }

  ngOnDestroy() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
  }

  get wdl(): OpeningWdl {
    return this.analysis?.games ?? { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null };
  }

  loadFacets() {
    this.api.get<ImportedGameFacetsResponse>('/imported-games/facets').subscribe({
      next: (facets) => (this.facets = facets || {}),
      error: () => (this.facets = {}),
    });
  }

  refresh() {
    this.loading = true;
    this.error = null;
    this.api.get<OpeningAnalysisResponse>(`/opening-analysis${this.queryString()}`).subscribe({
      next: (analysis) => {
        this.analysis = analysis;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.error || 'Could not load opening analysis.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onBoardMove(uci: string) {
    const move = this.tryPlayUci(uci);
    if (!move) {
      this.boardPositionVersion += 1;
      return;
    }
    this.commitPlayedMove(move);
  }

  playMove(move: OpeningNextMove) {
    const played = this.tryPlayUci(move.moveUci);
    if (!played) return;
    this.commitPlayedMove(played, move.moveSan || undefined);
  }

  setPerspective(color: UserColor) {
    if (this.filters.userColor === color) return;
    this.filters.userColor = color;
    this.boardFlipped = false;
    this.resetBoard();
  }

  goBack() {
    const undone = this.chess.undo();
    if (!undone) return;
    this.history.pop();
    const previous = this.history[this.history.length - 1];
    this.lastMove = previous ? { from: previous.from, to: previous.to } : null;
    this.syncBoardState();
  }

  resetBoard() {
    this.chess = new Chess();
    this.history = [];
    this.lastMove = null;
    this.syncBoardState();
  }

  flipBoard() {
    this.boardFlipped = !this.boardFlipped;
    this.boardPositionVersion += 1;
  }

  boardSide(): UserColor {
    if (this.boardFlipped) return this.filters.userColor === 'BLACK' ? 'WHITE' : 'BLACK';
    return this.filters.userColor === 'BLACK' ? 'BLACK' : 'WHITE';
  }

  resetFilters() {
    this.filters = this.defaultFilters();
    this.boardFlipped = false;
    this.resetBoard();
  }

  queryString(): string {
    const params = new URLSearchParams();
    params.set('fen', this.currentFen);
    params.set('rated', 'true');
    params.set('limit', '200');
    params.set('sort', 'endedAtDesc');
    if (this.filters.accountId) params.set('accountIds', this.filters.accountId);
    if (this.filters.provider && this.filters.provider !== 'ALL') params.set('providers', this.filters.provider);
    if (this.filters.resultForUser) params.set('resultForUser', this.filters.resultForUser);
    params.set('userColor', this.filters.userColor);
    if (this.filters.speedCategory) params.set('speedCategory', this.filters.speedCategory);
    if (this.filters.timeControl.trim()) params.set('timeControl', this.filters.timeControl.trim());
    if (this.filters.opponent.trim()) params.set('opponent', this.filters.opponent.trim());
    if (this.filters.openingName.trim()) params.set('openingName', this.filters.openingName.trim());
    if (this.filters.analysisStatus) params.set('analysisStatus', this.filters.analysisStatus);
    if (this.filters.minAccuracy.trim()) params.set('minAccuracy', this.filters.minAccuracy.trim());
    if (this.filters.maxAccuracy.trim()) params.set('maxAccuracy', this.filters.maxAccuracy.trim());
    if (this.filters.minOpponentRating.trim()) params.set('minOpponentRating', this.filters.minOpponentRating.trim());
    if (this.filters.from) params.set('from', this.dayStartIso(this.filters.from));
    if (this.filters.to) params.set('to', this.dayEndIso(this.filters.to));
    return `?${params.toString()}`;
  }

  dayStartIso(value: string): string {
    return `${value}T00:00:00.000Z`;
  }

  dayEndIso(value: string): string {
    return `${value}T23:59:59.999Z`;
  }

  defaultFilters(): OpeningFilters {
    return {
      accountId: '',
      provider: 'ALL',
      resultForUser: '',
      userColor: 'WHITE',
      speedCategory: '',
      timeControl: '',
      opponent: '',
      openingName: '',
      analysisStatus: '',
      minAccuracy: '',
      maxAccuracy: '',
      minOpponentRating: '',
      from: '',
      to: '',
    };
  }

  customSpeedFacets(): FacetValue[] {
    const builtIns = new Set(['bullet', 'blitz', 'rapid', 'classical']);
    return (this.facets.speeds || []).filter((speed) => !builtIns.has(String(this.facetKey(speed)).toLowerCase()));
  }

  facetKey(facet: FacetValue): string {
    return String(facet.id ?? facet.value ?? facet.name ?? facet.username ?? '');
  }

  facetLabel(facet: FacetValue): string {
    const value = facet.label ?? facet.name ?? facet.username ?? facet.value ?? facet.id ?? 'Unknown';
    const count = typeof facet.count === 'number' ? ` (${facet.count})` : '';
    return `${value}${count}`;
  }

  accountLabel(account: FacetValue): string {
    const name = account.name || account.username || account.label || account.value || account.id;
    const provider = account.provider ? this.providerLabel(account.provider) : '';
    const count = typeof account.count === 'number' ? ` · ${account.count}` : '';
    return `${provider ? provider + ' · ' : ''}${name}${count}`;
  }

  providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }

  wdlLabel(wdl: OpeningWdl): string {
    return `${wdl.wins} ${wdl.draws} ${wdl.losses}`;
  }

  scoreLabel(wdl: OpeningWdl): string {
    return typeof wdl.scorePct === 'number' ? `${wdl.scorePct}%` : '—';
  }

  lineLabel(): string {
    return this.history.length ? this.history.map((move) => move.san || move.uci).join(' ') : 'Start position';
  }

  sideToMoveLabel(): UserColor {
    return this.chess.turn() === 'w' ? 'WHITE' : 'BLACK';
  }

  isUserTurn(): boolean {
    return this.sideToMoveLabel() === this.filters.userColor;
  }

  turnOwnerLabel(): string {
    return this.isUserTurn() ? 'Your move' : 'Opponent move';
  }

  perspectiveHelpText(): string {
    if (this.filters.userColor === 'BLACK') {
      return 'Black perspective: start with the opponent move, then inspect your replies from indexed games.';
    }
    return 'White perspective: play your opening moves from the start position and inspect your indexed continuations.';
  }

  rerunAnalysis() {
    if (!this.currentFen) return;
    const fen = this.currentFen;
    const requestId = ++this.engineRequestSeq;
    const keepCurrentLines = this.engine.fen === fen;

    this.engine = {
      fen,
      running: true,
      ready: false,
      error: null,
      bestMove: keepCurrentLines ? this.engine.bestMove : null,
      lines: keepCurrentLines ? this.engine.lines : [],
    };
    this.cdr.detectChanges();

    this.api.post<BackendPositionAnalysisResponse>('/position-analysis', { fen, depth: 12, multipv: 3 }).subscribe({
      next: (response) => {
        if (requestId !== this.engineRequestSeq) return;
        this.engine = this.mapBackendPositionAnalysis(response.position, fen);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (requestId !== this.engineRequestSeq) return;
        this.engine = {
          ...this.engine,
          fen,
          running: false,
          ready: false,
          error: err?.error?.message || err?.error?.error || 'Could not load backend Stockfish analysis.',
        };
        this.cdr.detectChanges();
      },
    });
  }

  scheduleAnalysis() {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.rerunAnalysis(), 250);
  }

  analysisArrows() {
    const move = this.bestMoveLabel();
    if (!move || move === '(none)') return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  }

  bestMoveLabel() {
    if (this.engine.fen !== this.currentFen) return null;
    return this.engine.bestMove || this.engine.lines[0]?.pv?.[0] || null;
  }

  isBlackPerspective() {
    return this.boardSide() === 'BLACK';
  }

  private tryPlayUci(uci: string): any | null {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.slice(4, 5) || undefined;
    try {
      return this.chess.move({ from, to, promotion });
    } catch {
      return null;
    }
  }

  private commitPlayedMove(move: any, sanOverride?: string) {
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    this.history.push({
      san: sanOverride || move.san || uci,
      uci,
      from: move.from,
      to: move.to,
      fenAfter: this.chess.fen(),
    });
    this.lastMove = { from: move.from, to: move.to };
    this.syncBoardState();
  }

  private syncBoardState() {
    this.currentFen = this.chess.fen();
    this.boardPositionVersion += 1;
    this.refresh();
    this.scheduleAnalysis();
  }

  private mapBackendPositionAnalysis(position: BackendPositionAnalysis, requestedFen: string): EngineAnalysis {
    return {
      fen: requestedFen,
      running: false,
      ready: true,
      error: null,
      bestMove: position.bestMoveUci ?? position.lines[0]?.moveUci ?? null,
      lines: position.lines.map((line) => ({
        multipv: line.multipv,
        depth: line.depth,
        scoreCp: this.scoreFromWhiteToSideToMove(line.scoreCpWhite, requestedFen),
        mate: this.scoreFromWhiteToSideToMove(line.mateWhite, requestedFen),
        pv: line.pvUci,
      })),
    };
  }

  private scoreFromWhiteToSideToMove(value: number | undefined, fen: string): number | undefined {
    if (value === undefined) return undefined;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }

}
