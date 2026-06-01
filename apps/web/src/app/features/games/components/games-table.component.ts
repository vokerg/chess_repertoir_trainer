import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ImportedGameListItem,
  ImportedGamePageInfo,
  ImportedGamePlayer,
  Provider,
  ResultForUser,
  UserColor,
} from '../data-access/games.models';
import { GameActionMenuComponent } from './game-action-menu.component';

@Component({
  selector: 'app-games-table',
  standalone: true,
  imports: [CommonModule, RouterModule, GameActionMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section-card games-table-card">
      <div class="games-table-header">
        <div>
          <h3 class="games-section-title">Imported games</h3>
          <p class="games-muted">{{ tableSubtitle() }}</p>
        </div>
        <button type="button" class="secondary" (click)="refresh.emit()" [disabled]="loading()">Refresh</button>
      </div>

      <p *ngIf="error()" class="status-error">{{ error() }}</p>
      <p *ngIf="loading() && games().length === 0" class="status-note">Loading imported games...</p>

      <div *ngIf="!loading() && !error() && games().length === 0" class="empty-state games-empty">
        No imported games match these filters. Try widening provider, control, or analysis filters.
      </div>

      <div class="games-table-wrap" *ngIf="games().length > 0">
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
            <tr *ngFor="let game of games()">
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
                  <app-game-action-menu
                    [game]="game"
                    [open]="isActionMenuOpen(game.id)"
                    [analysing]="analysingGameId() === game.id"
                    [indexing]="indexingPlyGameId() === game.id"
                    (toggle)="toggleActionMenu(game.id, $event)"
                    (close)="closeActionMenu()"
                    (analyse)="analyseGame(game)"
                    (forceReanalyse)="forceReanalyseGame(game)"
                    (indexPlies)="indexGamePlies(game)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="games-pagination" *ngIf="pageInfo().hasMore || games().length > 0">
        <button type="button" class="secondary" (click)="loadMore.emit()" [disabled]="loading() || !pageInfo().hasMore">
          {{ pageInfo().hasMore ? (loading() ? 'Loading...' : 'Load more') : 'All matching games loaded' }}
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .games-table-card { display: grid; gap: 1rem; overflow: hidden; }
      .games-table-header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; flex-wrap: wrap; }
      .games-section-title { margin: 0; font-size: 1.35rem; letter-spacing: -0.03em; }
      .games-muted { margin: 0.25rem 0 0; color: var(--muted); font-size: 0.88rem; line-height: 1.35; }
      .games-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 24px; background: rgba(255, 252, 247, 0.72); }
      .games-table { width: 100%; min-width: 1040px; border-collapse: collapse; }
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
      .opening-name { max-width: 220px; }
      .provider-pill, .result-pill { display: inline-flex; align-items: center; white-space: nowrap; border-radius: 999px; padding: 0.32rem 0.6rem; font-size: 0.76rem; font-weight: 900; }
      .provider-lichess { background: rgba(35, 27, 21, 0.08); color: var(--text); }
      .provider-chess-com { background: var(--success-soft); color: var(--success); }
      .result-win { background: var(--success-soft); color: var(--success); }
      .result-draw { background: var(--warning-soft); color: var(--warning); }
      .result-loss { background: var(--danger-soft); color: var(--danger); }
      .result-unknown { background: rgba(35, 27, 21, 0.08); color: var(--muted-strong); }
      .games-status-secondary { margin-top: 0.15rem; }
      .games-actions-heading { width: 60px; text-align: right !important; }
      .games-row-actions { display: flex; gap: 0.45rem; align-items: center; justify-content: flex-end; }
      .games-pagination { display: flex; justify-content: center; padding-top: 0.25rem; }
      .games-empty { border: 1px dashed var(--border-strong); border-radius: 24px; padding: 1.4rem; color: var(--muted); }
      .status-error { color: var(--danger); font-weight: 800; }
      .status-note { color: var(--muted); font-weight: 700; }
    `,
  ],
})
export class GamesTableComponent {
  readonly games = input.required<ImportedGameListItem[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly tableSubtitle = input('No games loaded');
  readonly pageInfo = input.required<ImportedGamePageInfo>();
  readonly analysingGameId = input<number | null>(null);
  readonly indexingPlyGameId = input<number | null>(null);
  readonly refresh = output<void>();
  readonly loadMore = output<void>();
  readonly analyse = output<ImportedGameListItem>();
  readonly forceReanalyse = output<ImportedGameListItem>();
  readonly indexPlies = output<ImportedGameListItem>();

  protected activeActionMenuGameId: number | null = null;

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.games-action-menu')) return;
    this.closeActionMenu();
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.closeActionMenu();
  }

  protected toggleActionMenu(gameId: number, event?: Event): void {
    event?.stopPropagation();
    this.activeActionMenuGameId = this.activeActionMenuGameId === gameId ? null : gameId;
  }

  protected closeActionMenu(): void {
    this.activeActionMenuGameId = null;
  }

  protected isActionMenuOpen(gameId: number): boolean {
    return this.activeActionMenuGameId === gameId;
  }

  protected analyseGame(game: ImportedGameListItem): void {
    this.closeActionMenu();
    this.analyse.emit(game);
  }

  protected forceReanalyseGame(game: ImportedGameListItem): void {
    this.closeActionMenu();
    this.forceReanalyse.emit(game);
  }

  protected indexGamePlies(game: ImportedGameListItem): void {
    this.closeActionMenu();
    this.indexPlies.emit(game);
  }

  protected providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }

  protected providerClass(provider?: Provider | null): string {
    return provider === 'CHESS_COM' ? 'provider-chess-com' : 'provider-lichess';
  }

  protected profileUrl(provider?: Provider | null, username?: string | null): string | null {
    if (!provider || !username) return null;
    const encoded = encodeURIComponent(username);
    if (provider === 'LICHESS') return `https://lichess.org/@/${encoded}`;
    if (provider === 'CHESS_COM') return `https://www.chess.com/member/${encoded}`;
    return null;
  }

  protected resultLabel(result?: ResultForUser | null): string {
    if (result === 'WIN') return 'Win';
    if (result === 'DRAW') return 'Draw';
    if (result === 'LOSS') return 'Loss';
    return 'Unknown';
  }

  protected resultClass(result?: ResultForUser | null): string {
    if (result === 'WIN') return 'result-win';
    if (result === 'DRAW') return 'result-draw';
    if (result === 'LOSS') return 'result-loss';
    return 'result-unknown';
  }

  protected playerLabel(player?: ImportedGamePlayer | null): string {
    if (!player) return 'Unknown';
    return `${player.username || 'Unknown'}${player.rating ? ` (${player.rating})` : ''}`;
  }

  protected colorLabel(color?: UserColor | null): string {
    if (color === 'WHITE') return 'White';
    if (color === 'BLACK') return 'Black';
    return '—';
  }

  protected timeClassLabel(speed?: string | null): string {
    return speed ? speed.charAt(0).toUpperCase() + speed.slice(1) : 'Unknown';
  }

  protected gameDateLabel(game: ImportedGameListItem): string {
    if (!game.endedAt) return `#${game.id}`;
    return this.shortDate(game.endedAt);
  }

  protected shortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  }

  protected displayTimeControl(game: ImportedGameListItem): string {
    const fromParts = this.formatTimeControl(game.timeControl?.initial, game.timeControl?.increment);
    if (fromParts) return fromParts;
    return this.timeControlFromRaw(game.timeControl?.raw) || '—';
  }

  protected timeControlFromRaw(raw?: string | null): string {
    if (!raw) return '';
    const match = raw.match(/^(\d+)\s*\+\s*(\d+)$/);
    if (!match) return raw;
    return this.formatTimeControl(Number(match[1]), Number(match[2])) || raw;
  }

  protected formatTimeControl(initial?: number | null, increment?: number | null): string | null {
    if (typeof initial !== 'number' || typeof increment !== 'number') return null;
    return `${this.formatInitialMinutes(initial)}+${increment}`;
  }

  protected formatInitialMinutes(initialSeconds: number): string {
    if (initialSeconds < 60) return `${initialSeconds}s`;
    const minutes = initialSeconds / 60;
    return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
  }

  protected accuracyLabel(value?: number | null): string {
    return typeof value === 'number' ? `${Math.round(value)}%` : '—';
  }

  protected analysisStatusLabel(game: ImportedGameListItem): string {
    if (this.analysingGameId() === game.id) return 'Queueing...';
    if (game.analysis?.status === 'QUEUED') return 'Queued';
    if (game.analysis?.status === 'RUNNING') return 'Analysing...';
    if (game.analysis?.status === 'COMPLETED') return 'Analysed';
    if (game.analysis?.status === 'FAILED') return 'Failed';
    if (game.analysis?.status === 'INTERRUPTED') return 'Interrupted';
    return 'Not analysed';
  }

  protected plyIndexStatusLabel(game: ImportedGameListItem): string {
    if (this.indexingPlyGameId() === game.id) return 'Indexing...';
    if (game.plyIndex?.status === 'INDEXED') return 'Indexed';
    return 'Not indexed';
  }
}
