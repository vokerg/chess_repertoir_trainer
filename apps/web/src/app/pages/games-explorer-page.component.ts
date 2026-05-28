import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

type Provider = 'LICHESS' | 'CHESS_COM';
type UserColor = 'WHITE' | 'BLACK';
type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';
type AnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

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
  variant: string;
  rated: '' | 'true' | 'false';
  timeControl: string;
  opponent: string;
  openingName: string;
  analysisStatus: '' | AnalysisStatus;
  minAccuracy: string;
  maxAccuracy: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-games-explorer-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="games-page stack">
      <section class="section-card games-hero">
        <div>
          <span class="eyebrow">Games explorer</span>
          <h2 class="page-heading page-heading-library">Search imported games</h2>
          <p class="page-subtitle">
            Filter your Lichess and Chess.com archive, compare result and accuracy signals, then send any game into backend Stockfish analysis.
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
            <p class="metric-label">Avg accuracy</p>
            <p class="metric-value">{{ averageAccuracyLabel() }}</p>
          </div>
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
            <span>Speed</span>
            <select [(ngModel)]="filters.speedCategory" (ngModelChange)="refresh()">
              <option value="">Any speed</option>
              <option value="bullet">Bullet</option>
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
            <span>Variant</span>
            <select [(ngModel)]="filters.variant" (ngModelChange)="refresh()">
              <option value="">Any variant</option>
              <option *ngFor="let variant of facets.variants || []" [value]="facetKey(variant)">{{ facetLabel(variant) }}</option>
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
            <span>Time control</span>
            <input [(ngModel)]="filters.timeControl" (keyup.enter)="refresh()" placeholder="e.g. 300+0" />
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
          No imported games match these filters. Try widening provider, speed, or analysis filters.
        </div>

        <div class="games-table-wrap" *ngIf="filteredGames().length > 0">
          <table class="games-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Result</th>
                <th>Players</th>
                <th>Speed</th>
                <th>Opening</th>
                <th>Accuracy</th>
                <th>Analysis</th>
                <th class="games-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let game of filteredGames()">
                <td>
                  <div class="game-title-cell">
                    <span class="provider-pill" [ngClass]="providerClass(game.provider)">{{ providerLabel(game.provider) }}</span>
                    <div>
                      <p class="game-main">{{ gameDateLabel(game) }}</p>
                      <p class="games-muted">{{ game.timeControl?.raw || timeControlLabel(game) }} · {{ game.rated === true ? 'Rated' : game.rated === false ? 'Casual' : 'Rating unknown' }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="result-pill" [ngClass]="resultClass(game.resultForUser)">{{ resultLabel(game.resultForUser) }}</span>
                  <p class="games-muted">{{ colorLabel(game.userColor) }}</p>
                </td>
                <td>
                  <p class="game-main">{{ playerLabel(game.white) }} <span class="games-muted">vs</span> {{ playerLabel(game.black) }}</p>
                  <p class="games-muted">Opponent: {{ game.opponentUsername || 'Unknown' }}</p>
                </td>
                <td>
                  <p class="game-main">{{ speedLabel(game.speedCategory) }}</p>
                  <p class="games-muted">{{ game.variant || 'standard' }}</p>
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
                  <span class="analysis-pill" [ngClass]="analysisClass(game.analysis?.status)">{{ analysisLabel(game.analysis?.status) }}</span>
                  <p class="games-muted">{{ analysisMeta(game.analysis) }}</p>
                </td>
                <td>
                  <div class="games-row-actions">
                    <button *ngIf="game.analysis?.status === 'COMPLETED'; else analyseAction" type="button" class="secondary analysed-action" disabled>
                      Analysed
                    </button>
                    <ng-template #analyseAction>
                      <button type="button" (click)="analyse(game)" [disabled]="analysingGameId === game.id || game.analysis?.status === 'RUNNING'">
                        {{ analysingGameId === game.id || game.analysis?.status === 'RUNNING' ? 'Analysing...' : 'Analyse' }}
                      </button>
                    </ng-template>
                    <a *ngIf="game.providerUrl" class="games-link-button" [href]="game.providerUrl" target="_blank" rel="noreferrer">Open</a>
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
      .games-hero-stats { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 0.75rem; min-width: min(100%, 440px); }
      .games-mini-card { padding: 0.9rem; }
      .games-mini-card .metric-value { font-size: 1.55rem; }
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
      .games-table { width: 100%; min-width: 1180px; border-collapse: collapse; }
      .games-table th { text-align: left; padding: 0.85rem 0.9rem; color: var(--muted-strong); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.1em; background: rgba(35, 27, 21, 0.05); }
      .games-table td { padding: 0.95rem 0.9rem; border-top: 1px solid var(--border); vertical-align: top; }
      .game-title-cell { display: flex; gap: 0.7rem; align-items: flex-start; }
      .game-main { margin: 0; font-weight: 800; color: var(--text); line-height: 1.3; }
      .opening-name { max-width: 220px; }
      .provider-pill, .result-pill, .analysis-pill { display: inline-flex; align-items: center; white-space: nowrap; border-radius: 999px; padding: 0.32rem 0.6rem; font-size: 0.76rem; font-weight: 900; }
      .provider-lichess { background: rgba(35, 27, 21, 0.08); color: var(--text); }
      .provider-chess-com { background: var(--success-soft); color: var(--success); }
      .result-win, .analysis-completed { background: var(--success-soft); color: var(--success); }
      .result-draw, .analysis-running { background: var(--warning-soft); color: var(--warning); }
      .result-loss, .analysis-failed { background: var(--danger-soft); color: var(--danger); }
      .result-unknown, .analysis-not-analysed { background: rgba(35, 27, 21, 0.08); color: var(--muted-strong); }
      .games-actions-heading { width: 170px; }
      .games-row-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
      .games-row-actions button { padding: 0.65rem 0.85rem; }
      .analysed-action { color: var(--success); opacity: 0.82; }
      .games-link-button { display: inline-flex; align-items: center; min-height: 38px; border-radius: 999px; padding: 0 0.85rem; text-decoration: none; background: rgba(35, 27, 21, 0.08); color: var(--text); font-weight: 800; }
      .games-pagination { display: flex; justify-content: center; padding-top: 0.25rem; }
      .games-empty { border: 1px dashed var(--border-strong); border-radius: 24px; padding: 1.4rem; color: var(--muted); }
      .status-error { color: var(--danger); font-weight: 800; }
      .status-note { color: var(--muted); font-weight: 700; }
      @media (max-width: 980px) { .games-filter-grid { grid-template-columns: repeat(2, minmax(170px, 1fr)); } .games-hero-stats { grid-template-columns: repeat(3, 1fr); } }
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
  pageInfo: ImportedGameSearchResponse['pageInfo'] = { nextCursor: null, hasMore: false };

  filters: GameFilters = this.defaultFilters();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadFacets();
    this.refresh();
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
    this.analysingGameId = game.id;
    this.error = null;
    this.api.post<ImportedGameAnalysisSummary>(`/imported-games/${game.id}/analysis-runs`, {}).subscribe({
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

  resetFilters() {
    this.filters = this.defaultFilters();
    this.refresh();
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
    if (this.filters.variant) params.set('variant', this.filters.variant);
    if (this.filters.rated) params.set('rated', this.filters.rated);
    if (this.filters.opponent.trim()) params.set('opponent', this.filters.opponent.trim());
    if (this.filters.openingName.trim()) params.set('openingName', this.filters.openingName.trim());
    if (this.filters.analysisStatus) params.set('analysisStatus', this.filters.analysisStatus);
    if (this.filters.minAccuracy.trim()) params.set('minAccuracy', this.filters.minAccuracy.trim());
    if (this.filters.maxAccuracy.trim()) params.set('maxAccuracy', this.filters.maxAccuracy.trim());
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
      variant: '',
      rated: '',
      timeControl: '',
      opponent: '',
      openingName: '',
      analysisStatus: '',
      minAccuracy: '',
      maxAccuracy: '',
      from: '',
      to: '',
    };
  }

  customSpeedFacets(): FacetValue[] {
    const builtIns = new Set(['bullet', 'blitz', 'rapid', 'classical']);
    return (this.facets.speeds || []).filter((speed) => !builtIns.has(String(this.facetKey(speed)).toLowerCase()));
  }

  filteredGames(): ImportedGameListItem[] {
    const timeControl = this.filters.timeControl.trim().toLowerCase();
    if (!timeControl) return this.games;
    return this.games.filter((game) => {
      const raw = (game.timeControl?.raw || this.timeControlLabel(game)).toLowerCase();
      return raw.includes(timeControl);
    });
  }

  analysedCount(): number {
    return this.filteredGames().filter((game) => game.analysis?.status === 'COMPLETED').length;
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

  analysisLabel(status?: AnalysisStatus | null): string {
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'RUNNING') return 'Running';
    if (status === 'FAILED') return 'Failed';
    return 'Not analysed';
  }

  analysisClass(status?: AnalysisStatus | null): string {
    if (status === 'COMPLETED') return 'analysis-completed';
    if (status === 'RUNNING') return 'analysis-running';
    if (status === 'FAILED') return 'analysis-failed';
    return 'analysis-not-analysed';
  }

  analysisMeta(analysis?: ImportedGameAnalysisSummary | null): string {
    if (!analysis || analysis.status === 'NOT_ANALYZED') return 'Ready to analyse';
    if (analysis.status === 'RUNNING') return 'Analysis in progress';
    if (analysis.status === 'FAILED') return 'Try analysing again';
    return 'Analysis saved';
  }

  playerLabel(player?: ImportedGamePlayer | null): string {
    if (!player) return 'Unknown';
    return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
  }

  colorLabel(color?: UserColor | null): string {
    if (color === 'WHITE') return 'You had White';
    if (color === 'BLACK') return 'You had Black';
    return 'Colour unknown';
  }

  speedLabel(speed?: string | null): string {
    return speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Unknown';
  }

  gameDateLabel(game: ImportedGameListItem): string {
    if (!game.endedAt) return `Game #${game.id}`;
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(game.endedAt));
  }

  timeControlLabel(game: ImportedGameListItem): string {
    const initial = game.timeControl?.initial;
    const increment = game.timeControl?.increment;
    if (typeof initial === 'number' && typeof increment === 'number') return `${initial}+${increment}`;
    return 'Time control unknown';
  }

  accuracyLabel(value?: number | null): string {
    return typeof value === 'number' ? `${Math.round(value)}%` : '—';
  }
}
