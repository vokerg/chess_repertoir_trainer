import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FacetValue, ImportedGameFacetsResponse, Provider } from '../../features/games/data-access/games.models';
import { GameFilters } from './game-filter.model';

@Component({
  selector: 'app-game-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section-card games-filters" aria-label="Game filters">
      <div class="games-filter-grid">
        <label class="games-field">
          <span>Account</span>
          <select [ngModel]="filters().accountId" (ngModelChange)="setFilter('accountId', $event)">
            <option value="">All accounts</option>
            <option *ngFor="let account of facets().accounts || []" [value]="facetKey(account)">
              {{ accountLabel(account) }}
            </option>
          </select>
        </label>

        <label class="games-field">
          <span>Provider</span>
          <select [ngModel]="filters().provider" (ngModelChange)="setFilter('provider', $event)">
            <option value="ALL">Lichess + Chess.com</option>
            <option value="LICHESS">Lichess</option>
            <option value="CHESS_COM">Chess.com</option>
          </select>
        </label>

        <label class="games-field">
          <span>Result</span>
          <select [ngModel]="filters().resultForUser" (ngModelChange)="setFilter('resultForUser', $event)">
            <option value="">Any result</option>
            <option value="WIN">Win</option>
            <option value="DRAW">Draw</option>
            <option value="LOSS">Loss</option>
          </select>
        </label>

        <label class="games-field">
          <span>Colour</span>
          <select [ngModel]="filters().userColor" (ngModelChange)="setFilter('userColor', $event)">
            <option value="">White or Black</option>
            <option value="WHITE">White</option>
            <option value="BLACK">Black</option>
          </select>
        </label>

        <label class="games-field">
          <span>Control</span>
          <select [ngModel]="filters().speedCategory" (ngModelChange)="setFilter('speedCategory', $event)">
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
          <select [ngModel]="filters().rated" (ngModelChange)="setFilter('rated', $event)">
            <option value="">Rated or casual</option>
            <option value="true">Rated</option>
            <option value="false">Casual</option>
          </select>
        </label>

        <label class="games-field">
          <span>Analysis</span>
          <select [ngModel]="filters().analysisStatus" (ngModelChange)="setFilter('analysisStatus', $event)">
            <option value="">Any status</option>
            <option value="NOT_ANALYZED">Not analysed</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>

        <label class="games-field">
          <span>Indexed</span>
          <select [ngModel]="filters().plyIndexStatus" (ngModelChange)="setFilter('plyIndexStatus', $event)">
            <option value="">Any status</option>
            <option value="NOT_INDEXED">Not indexed</option>
            <option value="INDEXED">Indexed</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>

        <label class="games-field">
          <span>Time control</span>
          <input [ngModel]="filters().timeControl" (ngModelChange)="setFilterValue('timeControl', $event)" (keyup.enter)="apply.emit()" placeholder="e.g. 10+5" />
        </label>

        <label class="games-field">
          <span>Opponent</span>
          <input [ngModel]="filters().opponent" (ngModelChange)="setFilterValue('opponent', $event)" (keyup.enter)="apply.emit()" placeholder="Username" />
        </label>

        <label class="games-field">
          <span>Opening</span>
          <input [ngModel]="filters().openingName" (ngModelChange)="setFilterValue('openingName', $event)" (keyup.enter)="apply.emit()" placeholder="Sicilian, London..." />
        </label>

        <label class="games-field compact">
          <span>Min accuracy</span>
          <input [ngModel]="filters().minAccuracy" (ngModelChange)="setFilterValue('minAccuracy', $event)" (keyup.enter)="apply.emit()" inputmode="decimal" placeholder="0" />
        </label>

        <label class="games-field compact">
          <span>Max accuracy</span>
          <input [ngModel]="filters().maxAccuracy" (ngModelChange)="setFilterValue('maxAccuracy', $event)" (keyup.enter)="apply.emit()" inputmode="decimal" placeholder="100" />
        </label>

        <label class="games-field compact">
          <span>Opp. rating &gt;</span>
          <input [ngModel]="filters().minOpponentRating" (ngModelChange)="setFilterValue('minOpponentRating', $event)" (keyup.enter)="apply.emit()" inputmode="numeric" placeholder="1200" />
        </label>

        <label class="games-field compact">
          <span>From</span>
          <input type="date" [ngModel]="filters().from" (ngModelChange)="setFilter('from', $event)" />
        </label>

        <label class="games-field compact">
          <span>To</span>
          <input type="date" [ngModel]="filters().to" (ngModelChange)="setFilter('to', $event)" />
        </label>
      </div>

      <div class="games-filter-actions">
        <button type="button" (click)="apply.emit()" [disabled]="loading()">{{ loading() ? 'Loading...' : 'Apply filters' }}</button>
        <button type="button" class="secondary" (click)="reset.emit()" [disabled]="loading()">Reset</button>
      </div>
    </section>
  `,
  styles: [
    `
      .games-filters { display: grid; gap: 1rem; }
      .games-filter-grid { display: grid; grid-template-columns: repeat(4, minmax(170px, 1fr)); gap: 0.85rem; }
      .games-field { display: grid; gap: 0.35rem; color: var(--muted-strong); font-weight: 800; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; }
      .games-field input, .games-field select { text-transform: none; letter-spacing: 0; font-weight: 600; }
      .games-filter-actions { display: flex; gap: 0.65rem; flex-wrap: wrap; }
      @media (max-width: 980px) { .games-filter-grid { grid-template-columns: repeat(2, minmax(170px, 1fr)); } }
      @media (max-width: 640px) { .games-filter-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class GameFilterPanelComponent {
  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>({});
  readonly loading = input(false);
  readonly filtersChange = output<GameFilters>();
  readonly apply = output<void>();
  readonly reset = output<void>();

  protected setFilter<K extends keyof GameFilters>(key: K, value: GameFilters[K]): void {
    this.filtersChange.emit({ ...this.filters(), [key]: value });
    this.apply.emit();
  }

  protected setFilterValue<K extends keyof GameFilters>(key: K, value: string): void {
    this.filtersChange.emit({ ...this.filters(), [key]: value });
  }

  protected customSpeedFacets(): FacetValue[] {
    const builtIns = new Set(['bullet', 'blitz', 'rapid', 'classical']);
    return (this.facets().speeds || []).filter((speed) => !builtIns.has(String(this.facetKey(speed)).toLowerCase()));
  }

  protected facetKey(facet: FacetValue): string {
    return String(facet.value ?? facet.id ?? facet.name ?? facet.username ?? '');
  }

  protected facetLabel(facet: FacetValue): string {
    const label = facet.label ?? facet.name ?? facet.username ?? facet.value ?? facet.id ?? 'Unknown';
    return facet.count === null || facet.count === undefined ? String(label) : `${label} (${facet.count})`;
  }

  protected accountLabel(facet: FacetValue): string {
    const name = facet.username || facet.name || facet.label || facet.value || facet.id || 'Account';
    const provider = facet.provider ? ` · ${this.providerLabel(facet.provider)}` : '';
    const count = facet.count === null || facet.count === undefined ? '' : ` (${facet.count})`;
    return `${name}${provider}${count}`;
  }

  private providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }
}
