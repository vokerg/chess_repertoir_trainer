import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';

type Provider = 'LICHESS' | 'CHESS_COM';
type UserColor = 'WHITE' | 'BLACK';
type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';
type AnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
type PlyIndexStatus = 'NOT_INDEXED' | 'INDEXED' | 'FAILED';

interface ImportedGamePlayer {
  username?: string | null;
  rating?: number | null;
}

interface ImportedGameAnalysisSummary {
  status: AnalysisStatus;
  runId?: number | null;
  depth?: number | null;
  completedAt?: string | null;
  createdAt?: string | null;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  userAccuracy?: number | null;
  summary?: Record<string, unknown> | null;
  criticalMoveCount?: number | null;
}

interface ImportedGamePlyIndexSummary {
  status: PlyIndexStatus;
  indexedAt?: string | null;
  error?: string | null;
}

interface ImportedGamePlyIndexResult {
  importedGameId: number;
  status: 'INDEXED' | 'ALREADY_INDEXED' | 'FAILED';
  pliesIndexed?: number | null;
  plyIndexedAt?: string | null;
  error?: string;
}

interface ImportedGameListItem {
  id: number;
  accountId: number;
  provider: Provider;
  providerGameId: string;
  providerUrl?: string | null;
  endedAt?: string | null;
  startedAt?: string | null;
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
  result?: string | null;
  resultForUser?: ResultForUser | null;
  status?: string | null;
  opening?: {
    eco?: string | null;
    name?: string | null;
  } | null;
  plyIndex: ImportedGamePlyIndexSummary;
  analysis: ImportedGameAnalysisSummary;
}

interface ImportedGameSearchResponse {
  items: ImportedGameListItem[];
  pageInfo: {
    nextCursor?: string | null;
    hasMore: boolean;
  };
  appliedFilters: Record<string, unknown>;
}

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

interface GameFilters {
  accountId: string;
  provider: '' | Provider | 'ALL';
  resultForUser: '' | ResultForUser;
  userColor: '' | UserColor;
  speedCategory: string;
  rated: '' | 'true' | 'false';
  timeControl: string;
  opponent: string;
  openingName: string;
  analysisStatus: '' | AnalysisStatus;
  plyIndexStatus: '' | PlyIndexStatus;
  minAccuracy: string;
  maxAccuracy: string;
  minOpponentRating: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-games-explorer-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="games-page stack">
      <section class="section-card games-hero">
        <div>
          <span class="eyebrow">Games explorer</span>
          <h2 class="page-heading page-heading-library">Search imported games</h2>
          <p class="page-subtitle">
            Filter your Lichess and Chess.com archive, compare result and accuracy signals, then send any game into backend Stockfish analysis or lightweight ply indexing.
          </p>
        </div>
        <div class="games-hero-stats" aria-label="Imported games summary">
          <div class="metric-card games-mini-card">
            <p class="metric-label">Loaded</p>
            <p class="metric-value">{{ filteredGames().length }}</p>
          </div>
          <div class="metric-card games-mini-card">
            <p class="metric-label">Analysed</p>
            <p class="metric-value">{{ analysedCount() }}</p>
          </div>
          <div class="metric-card games-mini-card">
            <p class="metric-label">Ply indexed</p>
            <p class="metric-value">{{ plyIndexedCount() }}</p>
          </div>
          <button
            type="button"
            class="metric-card games-mini-card games-mini-action"
            (click)="indexAllVisibleGames()"
            [disabled]="loading || bulkIndexing || bulkIndexableGames().length === 0"
          >
            <span class="metric-label">Index all</span>
            <span class="metric-value games-action-value">{{ bulkIndexing ? bulkIndexProgressLabel() : bulkIndexableGames().length }}</span>
          </button>
        </div>
      </section>

      <section class="section-card games-filters" aria-label="Game filters">
        <div class="games-filter-grid">
          <label class="games-field">
            <span>Account</span>
            <select [(ngModel)]="filters.accountId" (ngModelChange)="refresh()">
              <option value="">All accounts</option>
              <option *ngFor="let account of facets.accounts || []" [value]="facetKey(account)">
                {{ accountLabel(account) }}
              </option>
            </select>
          </label>

          <label class="games-field">
            <span>Provider</span>
            <select [(ngModel)]="filters.provider" (ngModelChange)="refresh()">
              <option value="ALL">Lichess + Chess.com</option>
              <option value="LICHESS">Lichess</option>
              <option value="CHESS_COM">Chess.com</option>
            </select>
          </label>

          <label class="games-field">
            <span>Result</span>
            <select [(ngModel)]="filters.resultForUser" (ngModelChange)="refresh()">
              <option value="">Any result</option>
              <option value="WIN">Win</option>
              <option value="DRAW">Draw</option>
              <option value="LOSS">Loss</option>
            </select>
          </label>

          <label class="games-field">
            <span>Colour</span>
            <select [(ngModel)]="filters.userColor" (ngModelChange)="refresh()">
              <option value="">White or Black</option>
              <option value="WHITE">White</option>
              <option value="BLACK">Black</option>
            </select>
          </label>

          <label class="games-field">
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

          <label class="games-field">
            <span>Rated</span>
            <select [(ngModel)]="filters.rated" (ngModelChange)="refresh()">
              <option value="">Rated or casual</option>
              <option value="true">Rated</option>
              <option value="false">Casual</option>
            </select>
          </label>

          <label class="games-field">
            <span>Analysis</span>
            <select [(ngModel)]="filters.analysisStatus" (ngModelChange)="refresh()">
              <option value="">Any status</option>
              <option value="NOT_ANALYZED">Not analysed</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>

          <label class="games-field">
            <span>Indexed</span>
            <select [(ngModel)]="filters.plyIndexStatus" (ngModelChange)="refresh()">
              <option value="">Any status</option>
              <option value="NOT_INDEXED">Not indexed</option>
              <option value="INDEXED">Indexed</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>

          <label class="games-field">
            <span>Time control</span>
            <input [(ngModel)]="filters.timeControl" (keyup.enter)="refresh()" placeholder="e.g. 10+5" />
          </label>

          <label class="games-field">
            <span>Opponent</span>
            <input [(ngModel)]="filters.opponent" (keyup.enter)="refresh()" placeholder="Username" />
          </label>

          <label class="games-field">
            <span>Opening</span>
            <input [(ngModel)]="filters.openingName" (keyup.enter)="refresh()" placeholder="Sicilian, London..." />
          </label>

          <label class="games-field compact">
            <span>Min accuracy</span>
            <input [(ngModel)]="filters.minAccuracy" (keyup.enter)="refresh()" inputmode="decimal" placeholder="0" />
          </label>

          <label class="games-field compact">
            <span>Max accuracy</span>
            <input [(ngModel)]="filters.maxAccuracy" (keyup.enter)="refresh()" inputmode="decimal" placeholder="100" />
          </label>

          <label class="games-field compact">
            <span>Opp. rating &gt;</span>
            <input [(ngModel)]="filters.minOpponentRating" (keyup.enter)="refresh()" inputmode="numeric" placeholder="1200" />
          </label>

          <label class="games-field compact">
            <span>From</span>
            <input type="date" [(ngModel)]="filters.from" (ngModelChange)="refresh()" />
          </label>

          <label class="games-field compact">
            <span>To</span>
            <input type="date" [(ngModel)]="filters.to" (ngModelChange)="refresh()" />
          </label>
        </div>

        <div class="games-filter-actions">
          <button type="button" (click)="refresh()" [disabled]="loading">{{ loading ? 'Loading...' : 'Apply filters' }}</button>
          <button type="button" class="secondary" (click)="resetFilters()" [disabled]="loading">Reset</button>
        </div>
      </section>

      <section class="section-card games-table-card">
        <div class="games-table-header">
          <div>
            <h3 class="games-section-title">Imported games</h3>
            <p class="games-muted">{{ tableSubtitle() }}</p>
          </div>
          <button type="button" class="secondary" (click)="refresh()" [disabled]="loading">Refresh</button>
        </div>

        <p *ngIf="error" class="status-error">{{ error }}</p>
        <p *ngIf="loading && filteredGames().length === 0" class="status-note">Loading imported games...</p>

        <div *ngIf="!loading && !error && filteredGames().length === 0" class="empty-state games-empty">
          No imported games match these filters. Try widening provider, control, or analysis filters.
        </div>

        <div class="games-table-wrap" *ngIf="filteredGames().length > 0">
          <table class="games-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Result</th>
                <th>Players</th>
                <th>Control</th>
                <th>Opening</th>
                <th>Accuracy</th>
                <th aria-label="Status"></th>
                <th class="games-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let game of filteredGames()">
                <td>
                  <a class="game-title-cell game-detail-link" [routerLink]="['/games', game.id]" aria-label="Open imported game replay">
                    <span class="provider-pill" [ngClass]="providerClass(game.provider)">{{ providerLabel(game.provider) }}</span>
                    <div>
                      <p class="game-main">{{ gameDateLabel(game) }}</p>
                      <p class="games-muted">{{ displayTimeControl(game) }} · {{ game.rated === true ? 'Rated' : game.rated === false ? 'Casual' : 'Rating unknown' }}</p>
                    </div>
                  </a>
                </td>
                <td>
                  <span class="result-pill" [ngClass]="resultClass(game.resultForUser)">{{ resultLabel(game.resultForUser) }}</span>
                  <p class="games-muted">{{ colorLabel(game.userColor) }}</p>
                </td>
                <td>
                  <p class="game-main players-line">
                    <a *ngIf="profileUrl(game.provider, game.white?.username); else whiteName" class="profile-link" [href]="profileUrl(game.provider, game.white?.username)" target="_blank" rel="noreferrer">{{ playerLabel(game.white) }}</a>
                    <ng-template #whiteName>{{ playerLabel(game.white) }}</ng-template>
                    <span class="games-muted players-separator">vs</span>
                    <a *ngIf="profileUrl(game.provider, game.black?.username); else blackName" class="profile-link" [href]="profileUrl(game.provider, game.black?.username)" target="_blank" rel="noreferrer">{{ playerLabel(game.black) }}</a>
                    <ng-template #blackName>{{ playerLabel(game.black) }}</ng-template>
                  </p>
                </td>
                <td>
                  <p class="game-main">{{ timeClassLabel(game.speedCategory) }}</p>
                  <p class="games-muted">{{ displayTimeControl(game) }}</p>
                </td>
                <td>
                  <p class="game-main">{{ game.opening?.eco || '—' }}</p>
                  <p class="games-muted opening-name">{{ game.opening?.name || 'Opening unavailable' }}</p>
                </td>
                <td>
                  <p class="game-main">{{ accuracyLabel(game.analysis?.userAccuracy) }}</p>
                  <p class="games-muted">W {{ accuracyLabel(game.analysis?.whiteAccuracy) }} · B {{ accuracyLabel(game.analysis?.blackAccuracy) }}</p>
                </td>
                <td>
                  <p class="game-main">{{ analysisStatusLabel(game) }}</p>
                  <p class="games-muted games-status-secondary">{{ plyIndexStatusLabel(game) }}</p>
                </td>
                <td>
                  <div class="games-row-actions">
                    <div class="games-action-menu">
                      <button
                        type="button"
                        class="games-action-menu-trigger"
                        aria-label="More actions"
                        [attr.aria-expanded]="isActionMenuOpen(game.id)"
                        (click)="toggleActionMenu(game.id, $event)"
                      >
                        •••
                      </button>
                      <div *ngIf="isActionMenuOpen(game.id)" class="games-action-menu-panel">
                        <button
                          *ngIf="!canForceReanalyse(game); else reanalyseAction"
                          type="button"
                          class="games-action-menu-item games-action-menu-item-button"
                          (click)="analyse(game)"
                          [disabled]="analysingGameId === game.id || game.analysis?.status === 'RUNNING'"
                        >
                          {{ analysingGameId === game.id || game.analysis?.status === 'RUNNING' ? 'Analysing...' : 'Analyse' }}
                        </button>
                        <ng-template #reanalyseAction>
                          <button
                            type="button"
                            class="games-action-menu-item games-action-menu-item-button"
                            (click)="forceReanalyse(game)"
                            [disabled]="analysingGameId === game.id"
                          >
                            {{ analysingGameId === game.id ? 'Re-analysing...' : 'Force re-analysis' }}
                          </button>
                        </ng-template>
                        <button
                          *ngIf="game.plyIndex?.status !== 'INDEXED'"
                          type="button"
                          class="games-action-menu-item games-action-menu-item-button"
                          (click)="indexPlies(game)"
                          [disabled]="indexingPlyGameId === game.id"
                        >
                          {{ indexingPlyGameId === game.id ? 'Indexing...' : plyIndexActionLabel(game) }}
                        </button>
                        <a *ngIf="game.providerUrl" class="games-action-menu-item" [href]="game.providerUrl" target="_blank" rel="noreferrer" (click)="closeActionMenu()">Open on {{ providerLabel(game.provider) }}</a>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="games-pagination" *ngIf="pageInfo.hasMore || filteredGames().length > 0">
          <button type="button" class="secondary" (click)="loadMore()" [disabled]="loading || !pageInfo.hasMore">
            {{ pageInfo.hasMore ? (loading ? 'Loading...' : 'Load more') : 'All matching games loaded' }}
          </button>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .games-page { gap: 1rem; }
      .games-hero { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: end; }
      .games-hero-stats { display: grid; grid-template-columns: repeat(4, minmax(102px, 1fr)); gap: 0.55rem; min-width: min(100%, 520px); }
      .games-mini-card { padding: 0.72rem 0.82rem; border-radius: 18px; }
      .games-mini-card .metric-label { font-size: 0.7rem; letter-spacing: 0.08em; }
      .games-mini-card .metric-value { font-size: 1.28rem; line-height: 1.05; }
      .games-mini-action { display: grid; gap: 0.3rem; align-content: center; text-align: left; border: 1px solid var(--border); background: rgba(35, 27, 21, 0.05); color: var(--text); cursor: pointer; transition: background 140ms ease, border-color 140ms ease, color 140ms ease; }
      .games-mini-action:hover:not(:disabled) { background: var(--accent-soft); color: var(--accent-strong); border-color: rgba(190, 126, 59, 0.35); }
      .games-mini-action:disabled { opacity: 0.55; cursor: default; }
      .games-action-value { font-size: 1rem; }
      .games-filters { display: grid; gap: 1rem; }
      .games-filter-grid { display: grid; grid-template-columns: repeat(4, minmax(170px, 1fr)); gap: 0.85rem; }
      .games-field { display: grid; gap: 0.35rem; color: var(--muted-strong); font-weight: 800; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; }
      .games-field input, .games-field select { text-transform: none; letter-spacing: 0; font-weight: 600; }
      .games-filter-actions { display: flex; gap: 0.65rem; flex-wrap: wrap; }
      .games-table-card { display: grid; gap: 1rem; overflow: hidden; }
      .games-table-header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; flex-wrap: wrap; }
      .games-section-title { margin: 0; font-size: 1.35rem; letter-spacing: -0.03em; }
      .games-muted { margin: 0.25rem 0 0; color: var(--muted); font-size: 0.88rem; line-height: 1.35; }
      .games-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 24px; background: rgba(255, 252, 247, 0.72); }
      .games-table { width: 100%; min-width: 1220px; border-collapse: collapse; }
      .games-table th { text-align: left; padding: 0.85rem 0.9rem; color: var(--muted-strong); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(35, 27, 21, 0.05); }
      .games-table td { padding: 0.95rem 0.9rem; border-top: 1px solid var(--border); vertical-align: top; }
      .game-title-cell { display: flex; gap: 0.7rem; align-items: flex-start; }
      .game-detail-link { text-decoration: none; border-radius: 18px; padding: 0.25rem; margin: -0.25rem; transition: background 140ms ease, color 140ms ease; }
      .game-detail-link:hover { background: var(--accent-soft); }
      .game-detail-link:hover .game-main { color: var(--accent-strong); }
      .game-main { margin: 0; font-weight: 800; color: var(--text); line-height: 1.3; }
      .players-line { display: inline-flex; align-items: baseline; flex-wrap: wrap; gap: 0.45rem; }
      .players-separator { margin-top: 0; font-weight: 700; }
      .profile-link { color: var(--text); text-decoration: none; border-bottom: 1px solid rgba(35,27,21,0.22); }
      .profile-link:hover { color: var(--accent-strong); border-color: var(--accent-strong); }
      .muted-profile { color: var(--muted); }
      .opening-name { max-width: 220px; }
      .provider-pill, .result-pill, .ply-status-pill { display: inline-flex; align-items: center; white-space: nowrap; border-radius: 999px; padding: 0.32rem 0.6rem; font-size: 0.76rem; font-weight: 900; }
      .provider-lichess { background: rgba(35, 27, 21, 0.08); color: var(--text); }
      .provider-chess-com { background: var(--success-soft); color: var(--success); }
      .result-win, .ply-indexed { background: var(--success-soft); color: var(--success); }
      .result-draw { background: var(--warning-soft); color: var(--warning); }
      .result-loss, .ply-failed { background: var(--danger-soft); color: var(--danger); }
      .result-unknown, .ply-not-indexed { background: rgba(35, 27, 21, 0.08); color: var(--muted-strong); }
      .games-status-secondary { margin-top: 0.15rem; }
      .games-actions-heading { width: 240px; }
      .games-row-actions { display: flex; gap: 0.45rem; align-items: center; justify-content: flex-end; }
      .games-link-button { display: inline-flex; align-items: center; min-height: 38px; border-radius: 999px; padding: 0 0.85rem; text-decoration: none; background: rgba(35, 27, 21, 0.08); color: var(--text); font-weight: 800; }
      .game-replay-button { background: var(--accent-soft); color: var(--accent-strong); }
      .games-action-menu { position: relative; }
      .games-action-menu-trigger { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255, 252, 247, 0.92); color: var(--muted-strong); cursor: pointer; font-weight: 900; letter-spacing: 0.12em; padding: 0; }
      .games-action-menu-trigger[aria-expanded='true'] { background: var(--accent-soft); color: var(--accent-strong); border-color: rgba(190, 126, 59, 0.35); }
      .games-action-menu-panel { position: absolute; right: 0; top: calc(100% + 0.4rem); z-index: 3; display: grid; min-width: 170px; padding: 0.45rem; border-radius: 18px; border: 1px solid var(--border); background: rgba(255, 252, 247, 0.98); box-shadow: 0 18px 34px rgba(35, 27, 21, 0.12); }
      .games-action-menu-item { display: block; border-radius: 12px; padding: 0.7rem 0.8rem; color: var(--text); text-decoration: none; font-weight: 700; }
      .games-action-menu-item-button { width: 100%; border: 0; background: transparent; text-align: left; }
      .games-action-menu-item:hover { background: rgba(35, 27, 21, 0.06); color: var(--accent-strong); }
      .games-pagination { display: flex; justify-content: center; padding-top: 0.25rem; }
      .games-empty { border: 1px dashed var(--border-strong); border-radius: 24px; padding: 1.4rem; color: var(--muted); }
      .status-error { color: var(--danger); font-weight: 800; }
      .status-note { color: var(--muted); font-weight: 700; }
      @media (max-width: 980px) { .games-filter-grid { grid-template-columns: repeat(2, minmax(170px, 1fr)); } .games-hero-stats { grid-template-columns: repeat(2, minmax(120px, 1fr)); } }
      @media (max-width: 640px) { .games-filter-grid, .games-hero-stats { grid-template-columns: 1fr; } }
    `,
  ],
})
export class GamesExplorerPageComponent implements OnInit {
  games: ImportedGameListItem[] = [];
  facets: ImportedGameFacetsResponse = {};
  loading = false;
  error: string | null = null;
  analysingGameId: number | null = null;
  indexingPlyGameId: number | null = null;
  bulkIndexing = false;
  bulkIndexCompleted = 0;
  bulkIndexTotal = 0;
  activeActionMenuGameId: number | null = null;
  pageInfo: ImportedGameSearchResponse['pageInfo'] = { nextCursor: null, hasMore: false };

  filters: GameFilters = this.defaultFilters();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadFacets();
    this.refresh();
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.games-action-menu')) return;
    this.closeActionMenu();
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey() {
    this.closeActionMenu();
  }

  loadFacets() {
    this.api.get<ImportedGameFacetsResponse>('/imported-games/facets').subscribe({
      next: (data) => {
        this.facets = data || {};
        this.cdr.detectChanges();
      },
    });
  }

  refresh() {
    this.closeActionMenu();
    this.resetBulkIndexState();
    this.games = [];
    this.pageInfo = { nextCursor: null, hasMore: false };
    this.loadGames();
  }

  loadMore() {
    if (!this.pageInfo.nextCursor || this.loading) return;
    this.loadGames(this.pageInfo.nextCursor);
  }

  loadGames(cursor?: string | null) {
    this.loading = true;
    this.error = null;
    this.api.get<ImportedGameSearchResponse>(`/imported-games${this.queryString(cursor)}`).subscribe({
      next: (data) => {
        this.games = cursor ? [...this.games, ...data.items] : data.items;
        this.pageInfo = data.pageInfo;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not load imported games.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  analyse(game: ImportedGameListItem) {
    this.closeActionMenu();
    this.runAnalysis(game);
  }

  forceReanalyse(game: ImportedGameListItem) {
    this.closeActionMenu();
    this.runAnalysis(game, true);
  }

  canForceReanalyse(game: ImportedGameListItem): boolean {
    return game.analysis?.status === 'RUNNING' || game.analysis?.status === 'FAILED' || game.analysis?.status === 'COMPLETED';
  }

  runAnalysis(game: ImportedGameListItem, force = false) {
    this.analysingGameId = game.id;
    this.error = null;
    this.api.post<ImportedGameAnalysisSummary>(`/imported-games/${game.id}/analysis-runs`, force ? { force: true } : {}).subscribe({
      next: () => {
        this.analysingGameId = null;
        this.refresh();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not start game analysis.';
        this.analysingGameId = null;
        this.cdr.detectChanges();
      },
    });
  }

  indexPlies(game: ImportedGameListItem) {
    if (game.plyIndex?.status === 'INDEXED') return;

    this.closeActionMenu();
    this.indexingPlyGameId = game.id;
    this.error = null;
    const force = game.plyIndex?.status === 'FAILED';
    this.api.post<ImportedGamePlyIndexResult>(`/imported-games/${game.id}/ply-index`, force ? { force: true } : {}).subscribe({
      next: () => {
        this.indexingPlyGameId = null;
        this.refresh();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not index game plies.';
        this.indexingPlyGameId = null;
        this.cdr.detectChanges();
      },
    });
  }

  async indexAllVisibleGames() {
    const games = this.bulkIndexableGames();
    if (!games.length || this.bulkIndexing) return;

    this.closeActionMenu();
    this.error = null;
    this.bulkIndexing = true;
    this.bulkIndexCompleted = 0;
    this.bulkIndexTotal = games.length;
    this.cdr.detectChanges();

    const concurrency = 4;
    let nextIndex = 0;
    const failures: string[] = [];

    const runWorker = async () => {
      while (nextIndex < games.length) {
        const game = games[nextIndex];
        nextIndex += 1;
        try {
          await this.indexSingleGame(game);
        } catch (err: any) {
          failures.push(err?.error?.message || err?.error?.error || err?.message || `Could not index game #${game.id}.`);
        } finally {
          this.bulkIndexCompleted += 1;
          this.cdr.detectChanges();
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, games.length) }, () => runWorker()));

    this.bulkIndexing = false;
    this.indexingPlyGameId = null;
    if (failures.length) {
      this.error = failures[0];
      this.cdr.detectChanges();
      return;
    }
    this.refresh();
  }

  resetFilters() {
    this.closeActionMenu();
    this.filters = this.defaultFilters();
    this.refresh();
  }

  bulkIndexableGames(): ImportedGameListItem[] {
    return this.filteredGames().filter((game) => game.plyIndex?.status !== 'INDEXED');
  }

  bulkIndexProgressLabel(): string {
    if (!this.bulkIndexing) return String(this.bulkIndexableGames().length);
    return `${this.bulkIndexCompleted}/${this.bulkIndexTotal}`;
  }

  toggleActionMenu(gameId: number, event?: Event) {
    event?.stopPropagation();
    this.activeActionMenuGameId = this.activeActionMenuGameId === gameId ? null : gameId;
  }

  closeActionMenu() {
    this.activeActionMenuGameId = null;
  }

  isActionMenuOpen(gameId: number): boolean {
    return this.activeActionMenuGameId === gameId;
  }

  queryString(cursor?: string | null): string {
    const params = new URLSearchParams();
    params.set('limit', '50');
    params.set('sort', 'endedAtDesc');
    if (cursor) params.set('cursor', cursor);
    if (this.filters.accountId) params.set('accountIds', this.filters.accountId);
    if (this.filters.provider && this.filters.provider !== 'ALL') params.set('providers', this.filters.provider);
    if (this.filters.resultForUser) params.set('resultForUser', this.filters.resultForUser);
    if (this.filters.userColor) params.set('userColor', this.filters.userColor);
    if (this.filters.speedCategory) params.set('speedCategory', this.filters.speedCategory);
    if (this.filters.rated) params.set('rated', this.filters.rated);
    if (this.filters.opponent.trim()) params.set('opponent', this.filters.opponent.trim());
    if (this.filters.openingName.trim()) params.set('openingName', this.filters.openingName.trim());
    if (this.filters.analysisStatus) params.set('analysisStatus', this.filters.analysisStatus);
    if (this.filters.plyIndexStatus) params.set('plyIndexStatus', this.filters.plyIndexStatus);
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

  defaultFilters(): GameFilters {
    return {
      accountId: '',
      provider: 'ALL',
      resultForUser: '',
      userColor: '',
      speedCategory: '',
      rated: '',
      timeControl: '',
      opponent: '',
      openingName: '',
      analysisStatus: '',
      plyIndexStatus: '',
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

  filteredGames(): ImportedGameListItem[] {
    const timeControl = this.normalizedTimeControlSearch(this.filters.timeControl);
    if (!timeControl) return this.games;
    return this.games.filter((game) => {
      const labels = [
        this.displayTimeControl(game),
        game.timeControl?.raw || '',
        this.timeControlFromRaw(game.timeControl?.raw),
      ];
      return labels.some((label) => this.normalizedTimeControlSearch(label).includes(timeControl));
    });
  }

  analysedCount(): number {
    return this.filteredGames().filter((game) => game.analysis?.status === 'COMPLETED').length;
  }

  plyIndexedCount(): number {
    return this.filteredGames().filter((game) => game.plyIndex?.status === 'INDEXED').length;
  }

  private async indexSingleGame(game: ImportedGameListItem) {
    this.indexingPlyGameId = game.id;
    const force = game.plyIndex?.status === 'FAILED';
    const result = await firstValueFrom(
      this.api.post<ImportedGamePlyIndexResult>(`/imported-games/${game.id}/ply-index`, force ? { force: true } : {})
    );

    if (result.status === 'FAILED') {
      game.plyIndex.status = 'FAILED';
      game.plyIndex.error = result.error || 'Could not index game plies.';
      throw new Error(game.plyIndex.error);
    }

    game.plyIndex.status = 'INDEXED';
    game.plyIndex.error = null;
  }

  private resetBulkIndexState() {
    this.bulkIndexing = false;
    this.bulkIndexCompleted = 0;
    this.bulkIndexTotal = 0;
  }

  averageAccuracyLabel(): string {
    const values = this.filteredGames()
      .map((game) => game.analysis?.userAccuracy)
      .filter((value): value is number => typeof value === 'number');
    if (values.length === 0) return '—';
    return `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)}%`;
  }

  tableSubtitle(): string {
    if (this.loading && this.filteredGames().length === 0) return 'Loading matching games...';
    if (this.filteredGames().length === 0) return 'No games loaded';
    const totalNote = this.filteredGames().length === this.games.length ? '' : ` · ${this.games.length} fetched`;
    return `${this.filteredGames().length} games shown${totalNote}${this.pageInfo.hasMore ? ' · more available' : ''}`;
  }

  facetKey(facet: FacetValue): string {
    return String(facet.value ?? facet.id ?? facet.name ?? facet.username ?? '');
  }

  facetLabel(facet: FacetValue): string {
    const label = facet.label ?? facet.name ?? facet.username ?? facet.value ?? facet.id ?? 'Unknown';
    return facet.count === null || facet.count === undefined ? String(label) : `${label} (${facet.count})`;
  }

  accountLabel(facet: FacetValue): string {
    const name = facet.username || facet.name || facet.label || facet.value || facet.id || 'Account';
    const provider = facet.provider ? ` · ${this.providerLabel(facet.provider)}` : '';
    const count = facet.count === null || facet.count === undefined ? '' : ` (${facet.count})`;
    return `${name}${provider}${count}`;
  }

  providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }

  providerClass(provider?: Provider | null): string {
    return provider === 'CHESS_COM' ? 'provider-chess-com' : 'provider-lichess';
  }

  profileUrl(provider?: Provider | null, username?: string | null): string | null {
    if (!provider || !username) return null;
    const encoded = encodeURIComponent(username);
    if (provider === 'LICHESS') return `https://lichess.org/@/${encoded}`;
    if (provider === 'CHESS_COM') return `https://www.chess.com/member/${encoded}`;
    return null;
  }

  resultLabel(result?: ResultForUser | null): string {
    if (result === 'WIN') return 'Win';
    if (result === 'DRAW') return 'Draw';
    if (result === 'LOSS') return 'Loss';
    return 'Unknown';
  }

  resultClass(result?: ResultForUser | null): string {
    if (result === 'WIN') return 'result-win';
    if (result === 'DRAW') return 'result-draw';
    if (result === 'LOSS') return 'result-loss';
    return 'result-unknown';
  }

  playerLabel(player?: ImportedGamePlayer | null): string {
    if (!player) return 'Unknown';
    return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
  }

  colorLabel(color?: UserColor | null): string {
    if (color === 'WHITE') return 'White';
    if (color === 'BLACK') return 'Black';
    return '—';
  }

  timeClassLabel(speed?: string | null): string {
    return speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Unknown';
  }

  gameDateLabel(game: ImportedGameListItem): string {
    if (!game.endedAt) return `#${game.id}`;
    return this.shortDate(game.endedAt);
  }

  shortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  }

  displayTimeControl(game: ImportedGameListItem): string {
    const fromParts = this.formatTimeControl(game.timeControl?.initial, game.timeControl?.increment);
    if (fromParts) return fromParts;
    return this.timeControlFromRaw(game.timeControl?.raw) || '—';
  }

  timeControlFromRaw(raw?: string | null): string {
    if (!raw) return '';
    const match = raw.match(/^(\d+)\s*\+\s*(\d+)$/);
    if (!match) return raw;
    return this.formatTimeControl(Number(match[1]), Number(match[2])) || raw;
  }

  formatTimeControl(initial?: number | null, increment?: number | null): string | null {
    if (typeof initial !== 'number' || typeof increment !== 'number') return null;
    return `${this.formatInitialMinutes(initial)}+${increment}`;
  }

  formatInitialMinutes(initialSeconds: number): string {
    if (initialSeconds < 60) return `${initialSeconds}s`;
    const minutes = initialSeconds / 60;
    return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
  }

  normalizedTimeControlSearch(value?: string | null): string {
    return (value || '').toLowerCase().replace(/\s+/g, '').replace(/\+0$/, '+0');
  }

  accuracyLabel(value?: number | null): string {
    return typeof value === 'number' ? `${Math.round(value)}%` : '—';
  }

  analysisStatusLabel(game: ImportedGameListItem): string {
    if (this.analysingGameId === game.id || game.analysis?.status === 'RUNNING') return 'Analysing...';
    if (game.analysis?.status === 'COMPLETED') return 'Analysed';
    return 'Not analysed';
  }

  plyIndexStatusLabel(game: ImportedGameListItem): string {
    if (this.indexingPlyGameId === game.id) return 'Indexing...';
    if (game.plyIndex?.status === 'INDEXED') return 'Indexed';
    return 'Not indexed';
  }

  plyIndexLabel(game: ImportedGameListItem): string {
    if (game.plyIndex?.status === 'INDEXED') return 'Indexed';
    if (game.plyIndex?.status === 'FAILED') return 'Failed';
    return 'Not indexed';
  }

  plyIndexActionLabel(game: ImportedGameListItem): string {
    return game.plyIndex?.status === 'FAILED' ? 'Retry ply index' : 'Index plies';
  }

  plyIndexClass(game: ImportedGameListItem): string {
    if (game.plyIndex?.status === 'INDEXED') return 'ply-indexed';
    if (game.plyIndex?.status === 'FAILED') return 'ply-failed';
    return 'ply-not-indexed';
  }

  plyIndexDateLabel(game: ImportedGameListItem): string {
    return game.plyIndex?.indexedAt ? `Indexed ${this.shortDate(game.plyIndex.indexedAt)}` : '';
  }
}
