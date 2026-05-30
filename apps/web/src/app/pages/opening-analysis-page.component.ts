import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '../components/chess-board.component';
import { ApiService } from '../services/api.service';

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
  imports: [CommonModule, FormsModule, RouterModule, ChessBoardComponent],
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
        <div class="opening-filter-heading">
          <div>
            <h3 class="opening-section-title">Game filters</h3>
            <p class="opening-muted">These reuse the imported-games filters. Rated-only is always applied on top.</p>
          </div>
          <span class="rated-only-pill">Rated games only</span>
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
            <span>Colour</span>
            <select [(ngModel)]="filters.userColor" (ngModelChange)="refresh()">
              <option value="">White or Black</option>
              <option value="WHITE">White</option>
              <option value="BLACK">Black</option>
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
              <p class="workbench-panel-subtitle">Play legal moves to move through a position. The lookup updates after every move.</p>
            </div>
            <span class="side-pill">{{ analysis?.sideToMove || sideToMoveLabel() }} to move</span>
          </div>

          <div class="board-stage opening-board-stage">
            <div class="board-shell">
              <app-chess-board
                [fen]="currentFen"
                [side]="boardSide()"
                [lastMove]="lastMove"
                [sound]="false"
                [positionVersion]="boardPositionVersion"
                (move)="onBoardMove($event)"
              ></app-chess-board>
            </div>
          </div>

          <div class="board-action-row">
            <button type="button" class="secondary" (click)="resetBoard()" [disabled]="history.length === 0">⏮ Start</button>
            <button type="button" class="secondary" (click)="goBack()" [disabled]="history.length === 0">← Previous</button>
            <button type="button" class="secondary" (click)="flipBoard()">Flip board</button>
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
              <p class="opening-muted">{{ analysis?.occurrences || 0 }} indexed occurrence{{ (analysis?.occurrences || 0) === 1 ? '' : 's' }} · {{ analysis?.normalizedFen || '—' }}</p>
            </div>
            <div class="opening-score-ring">{{ scoreLabel(wdl) }}</div>
          </div>

          <p *ngIf="loading" class="status-note">Loading opening analysis...</p>

          <div *ngIf="!loading && analysis && analysis.nextMoves.length === 0" class="empty-state compact-empty">
            No indexed rated games reached this position with the current filters. Index more games or widen the filters.
          </div>

          <div class="opening-move-tree" *ngIf="!loading && analysis && analysis.nextMoves.length > 0">
            <button
              *ngFor="let move of analysis.nextMoves"
              type="button"
              class="opening-move-row"
              (click)="playMove(move)"
            >
              <span class="move-node-dot"></span>
              <span class="move-main">
                <strong>{{ move.moveSan || move.moveUci }}</strong>
                <small>{{ move.moveUci }} · {{ move.occurrences }} occurrence{{ move.occurrences === 1 ? '' : 's' }}</small>
              </span>
              <span class="move-wdl">
                <span>{{ wdlLabel(move.games) }}</span>
                <small>{{ scoreLabel(move.games) }}</small>
              </span>
            </button>
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
      .opening-filter-heading, .opening-panel-header { display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between; }
      .opening-section-title { margin: 0; font-size: 1.15rem; }
      .opening-muted { margin: 0.25rem 0 0; color: var(--muted); line-height: 1.35; }
      .rated-only-pill, .side-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.55rem 0.85rem; font-weight: 800; color: var(--accent-strong); background: var(--accent-soft); white-space: nowrap; }
      .opening-filter-grid { display: grid; grid-template-columns: repeat(6, minmax(130px, 1fr)); gap: 0.75rem; }
      .opening-field { display: grid; gap: 0.35rem; color: var(--muted-strong); font-size: 0.82rem; font-weight: 800; }
      .opening-field span { text-transform: uppercase; letter-spacing: 0.06em; }
      .opening-field input, .opening-field select { min-height: 42px; border-radius: 14px; border: 1px solid var(--border); background: rgba(255,255,255,0.78); padding: 0 0.75rem; color: var(--text); font-weight: 700; }
      .opening-field.compact { min-width: 120px; }
      .opening-filter-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
      .opening-workbench { display: grid; grid-template-columns: minmax(320px, 0.9fr) minmax(360px, 1.1fr); gap: 1rem; align-items: start; }
      .opening-board-panel, .opening-tree-panel { display: grid; gap: 1rem; }
      .opening-board-stage { justify-content: center; }
      .board-action-row { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; }
      .opening-line-card { border: 1px solid var(--border); border-radius: 18px; background: rgba(255,255,255,0.6); padding: 0.9rem; }
      .opening-line-text { margin: 0.2rem 0 0; font-weight: 800; color: var(--text); line-height: 1.45; }
      .opening-position-summary { display: flex; justify-content: space-between; gap: 1rem; border: 1px solid var(--border); border-radius: 20px; background: rgba(255,255,255,0.58); padding: 1rem; }
      .opening-wdl-line { margin: 0.25rem 0 0; font-size: 1.35rem; font-weight: 900; color: var(--text); }
      .opening-score-ring { display: inline-grid; place-items: center; min-width: 74px; height: 74px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-strong); font-weight: 900; }
      .opening-move-tree { position: relative; display: grid; gap: 0.65rem; }
      .opening-move-tree::before { content: ''; position: absolute; left: 12px; top: 10px; bottom: 10px; width: 2px; background: rgba(35, 27, 21, 0.1); }
      .opening-move-row { position: relative; display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 0.8rem; align-items: center; width: 100%; border: 1px solid var(--border); border-radius: 18px; background: rgba(255,255,255,0.72); padding: 0.85rem; text-align: left; color: var(--text); cursor: pointer; }
      .opening-move-row:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(35, 27, 21, 0.1); }
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
        .opening-filter-grid { grid-template-columns: 1fr; }
        .opening-filter-heading, .opening-panel-header, .opening-position-summary { display: grid; }
        .move-wdl { text-align: left; }
      }
    `,
  ],
})
export class OpeningAnalysisPageComponent implements OnInit {
  facets: ImportedGameFacetsResponse = {};
  filters: OpeningFilters = this.defaultFilters();
  analysis: OpeningAnalysisResponse | null = null;
  loading = false;
  error: string | null = null;
  boardPositionVersion = 0;
  lastMove: { from: string; to: string } | null = null;
  history: PlayedMove[] = [];
  boardFlipped = false;
  currentFen = new Chess().fen();

  private chess = new Chess();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadFacets();
    this.refresh();
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
    this.refresh();
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
    if (this.filters.userColor) params.set('userColor', this.filters.userColor);
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
      userColor: '',
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
    return `${wdl.wins}-${wdl.draws}-${wdl.losses}`;
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
  }
}
