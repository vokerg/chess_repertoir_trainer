import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../components/page-header.component';
import { ApiService } from '../services/api.service';

type LabExperiment = 'top-opponents' | 'monthly-games';

interface LabTopOpponent {
  opponentUsername: string;
  games: number;
}

interface LabTopOpponentsResponse {
  items: LabTopOpponent[];
}

interface LabMonthlyGamesRow {
  year: number;
  month: number;
  monthStart: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct?: number | null;
  avgOpponentRatingLichess?: number | null;
  avgOpponentRatingChessCom?: number | null;
  highestRatedLichess?: number | null;
  highestRatedChessCom?: number | null;
}

interface LabMonthlyGamesResponse {
  excludeBullet: boolean;
  items: LabMonthlyGamesRow[];
}

@Component({
  selector: 'app-lab-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  template: `
    <section class="lab-page stack">
      <app-page-header title="Lab" subtitle="Run focused reports from imported games.">
        <button type="button" class="page-header-action secondary lab-back" *ngIf="selected" (click)="clearSelection()">All experiments</button>
      </app-page-header>

      <section class="lab-layout">
        <aside class="section-card lab-menu" aria-label="Lab experiments">
          <button
            type="button"
            class="lab-menu-item"
            [class.lab-menu-item-active]="selected === 'top-opponents'"
            (click)="selectExperiment('top-opponents')"
          >
            <span>
              <strong>Top opponents</strong>
              <small>Grouped by opponent name</small>
            </span>
            <span class="pill">List</span>
          </button>

          <button
            type="button"
            class="lab-menu-item"
            [class.lab-menu-item-active]="selected === 'monthly-games'"
            (click)="selectExperiment('monthly-games')"
          >
            <span>
              <strong>Monthly games</strong>
              <small>Year/month WDL and rating snapshots</small>
            </span>
            <span class="pill">Table</span>
          </button>
        </aside>

        <section class="section-card lab-panel" *ngIf="!selected">
          <div class="empty-state lab-empty">
            Choose an experiment from the Lab menu.
          </div>
        </section>

        <section class="section-card lab-panel stack" *ngIf="selected === 'top-opponents'">
          <div class="lab-panel-header">
            <div>
              <span class="eyebrow">Opponent frequency</span>
              <h3 class="collection-title">Top opponents by source</h3>
            </div>
            <button type="button" class="page-header-action secondary" (click)="loadTopOpponents()" [disabled]="topOpponentsLoading">
              {{ topOpponentsLoading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>

          <p class="status-note" *ngIf="topOpponentsLoading">Loading top opponents...</p>
          <p class="status-note danger-copy" *ngIf="topOpponentsError">{{ topOpponentsError }}</p>

          <div class="table-wrap" *ngIf="!topOpponentsLoading && topOpponents.length > 0">
            <table class="lab-table">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Games</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let opponent of topOpponents">
                  <td class="primary-cell">{{ opponent.opponentUsername }}</td>
                  <td>{{ opponent.games }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-state" *ngIf="!topOpponentsLoading && !topOpponentsError && topOpponents.length === 0">
            No imported opponents found yet.
          </div>
        </section>

        <section class="section-card lab-panel stack" *ngIf="selected === 'monthly-games'">
          <div class="lab-panel-header">
            <div>
              <span class="eyebrow">Calendar aggregate</span>
              <h3 class="collection-title">Games by year and month</h3>
            </div>
            <div class="lab-actions">
              <label class="lab-toggle">
                <input type="checkbox" [(ngModel)]="excludeBullet" (ngModelChange)="loadMonthlyGames()" />
                <span>Exclude bullet</span>
              </label>
              <button type="button" class="page-header-action secondary" (click)="loadMonthlyGames()" [disabled]="monthlyGamesLoading">
                {{ monthlyGamesLoading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
          </div>

          <p class="status-note" *ngIf="monthlyGamesLoading">Loading monthly table...</p>
          <p class="status-note danger-copy" *ngIf="monthlyGamesError">{{ monthlyGamesError }}</p>

          <div class="table-wrap" *ngIf="!monthlyGamesLoading && monthlyGames.length > 0">
            <table class="lab-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Games</th>
                  <th>WDL</th>
                  <th>Score</th>
                  <th>Avg opp. Lichess</th>
                  <th>Avg opp. Chess.com</th>
                  <th>Highest Lichess</th>
                  <th>Highest Chess.com</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of monthlyGames">
                  <td class="primary-cell">{{ monthLabel(row) }}</td>
                  <td>{{ row.games }}</td>
                  <td>{{ wdlLabel(row) }}</td>
                  <td>{{ percentLabel(row.scorePct) }}</td>
                  <td>{{ ratingLabel(row.avgOpponentRatingLichess) }}</td>
                  <td>{{ ratingLabel(row.avgOpponentRatingChessCom) }}</td>
                  <td>{{ ratingLabel(row.highestRatedLichess) }}</td>
                  <td>{{ ratingLabel(row.highestRatedChessCom) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="empty-state" *ngIf="!monthlyGamesLoading && !monthlyGamesError && monthlyGames.length === 0">
            No imported games found for the selected options.
          </div>
        </section>
      </section>
    </section>
  `,
  styles: [
    `
    .lab-page { gap: 1rem; }
    .lab-back { flex: 0 0 auto; }
    .lab-layout { display: grid; grid-template-columns: minmax(230px, 310px) minmax(0, 1fr); gap: 1rem; align-items: start; }
    .lab-menu { display: grid; gap: 0.65rem; padding: 0.8rem; }
    .lab-menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.9rem;
      padding: 0.9rem;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(255,255,255,0.56);
      color: var(--text);
      box-shadow: none;
      text-align: left;
    }
    .lab-menu-item:hover { transform: none; background: rgba(35, 27, 21, 0.05); }
    .lab-menu-item-active { border-color: rgba(183, 121, 39, 0.35); background: var(--accent-soft); color: var(--accent-strong); }
    .lab-menu-item strong { display: block; font-size: 0.98rem; line-height: 1.2; }
    .lab-menu-item small { display: block; margin-top: 0.24rem; color: var(--muted); font-weight: 700; line-height: 1.25; }
    .lab-panel { min-width: 0; }
    .lab-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .lab-actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
    .lab-toggle { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--muted-strong); font-weight: 800; }
    .lab-toggle input { width: auto; accent-color: var(--accent); }
    .lab-empty { min-height: 220px; display: grid; place-items: center; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 18px; background: rgba(255,255,255,0.58); }
    .lab-table { width: 100%; border-collapse: collapse; min-width: 840px; }
    .lab-panel .lab-table:has(th:nth-child(2):last-child) { min-width: 360px; }
    .lab-table th, .lab-table td { padding: 0.78rem 0.85rem; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
    .lab-table th { color: var(--muted); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(247, 236, 217, 0.58); }
    .lab-table tbody tr:last-child td { border-bottom: 0; }
    .primary-cell { font-weight: 900; color: var(--text); }
    .danger-copy { color: var(--danger); }
    @media (max-width: 840px) {
      .lab-layout { grid-template-columns: 1fr; }
    }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabPageComponent {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  selected: LabExperiment | null = null;
  excludeBullet = false;

  topOpponents: LabTopOpponent[] = [];
  topOpponentsLoading = false;
  topOpponentsLoaded = false;
  topOpponentsError = '';

  monthlyGames: LabMonthlyGamesRow[] = [];
  monthlyGamesLoading = false;
  monthlyGamesLoaded = false;
  monthlyGamesError = '';

  selectExperiment(experiment: LabExperiment) {
    this.selected = experiment;
    if (experiment === 'top-opponents' && !this.topOpponentsLoaded) {
      this.loadTopOpponents();
    }
    if (experiment === 'monthly-games' && !this.monthlyGamesLoaded) {
      this.loadMonthlyGames();
    }
  }

  clearSelection() {
    this.selected = null;
  }

  loadTopOpponents() {
    this.topOpponentsLoading = true;
    this.topOpponentsError = '';
    this.api.get<LabTopOpponentsResponse>('/lab/top-opponents?limit=50').subscribe({
      next: (response) => {
        this.topOpponents = response.items;
        this.topOpponentsLoaded = true;
        this.topOpponentsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.topOpponentsError = 'Could not load top opponents.';
        this.topOpponentsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMonthlyGames() {
    this.monthlyGamesLoading = true;
    this.monthlyGamesError = '';
    this.api.get<LabMonthlyGamesResponse>(`/lab/monthly-games?excludeBullet=${this.excludeBullet}`).subscribe({
      next: (response) => {
        this.monthlyGames = response.items;
        this.monthlyGamesLoaded = true;
        this.monthlyGamesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.monthlyGamesError = 'Could not load monthly games.';
        this.monthlyGamesLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  monthLabel(row: LabMonthlyGamesRow) {
    return `${row.year}-${String(row.month).padStart(2, '0')}`;
  }

  wdlLabel(row: Pick<LabMonthlyGamesRow, 'wins' | 'draws' | 'losses'>) {
    return `${row.wins}-${row.draws}-${row.losses}`;
  }

  percentLabel(value?: number | null) {
    return value === null || value === undefined ? '-' : `${value.toFixed(1)}%`;
  }

  ratingLabel(value?: number | null) {
    return value === null || value === undefined ? '-' : Math.round(value).toString();
  }
}
