import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FacetValue,
  ImportedGameFacetsResponse,
  Provider,
  UserColor,
} from '../../features/games/data-access/games.models';
import { GameFilters } from './game-filter.model';

@Component({
  selector: 'app-game-filter-panel',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-filter-panel.component.html',
  styleUrl: './game-filter-panel.component.css',
})
export class GameFilterPanelComponent {
  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>({});
  readonly loading = input(false);
  readonly lockedUserColor = input<UserColor | null>(null);
  readonly filtersChange = output<GameFilters>();
  readonly apply = output<void>();
  readonly reset = output<void>();

  protected setFilter<K extends keyof GameFilters>(key: K, value: GameFilters[K]): void {
    if (key === 'userColor' && this.lockedUserColor()) return;
    this.filtersChange.emit(this.withLockedColor({ ...this.filters(), [key]: value }));
    this.apply.emit();
  }

  protected setFilterValue<K extends keyof GameFilters>(key: K, value: string): void {
    this.filtersChange.emit(this.withLockedColor({ ...this.filters(), [key]: value }));
  }

  protected customSpeedFacets(): FacetValue[] {
    const builtIns = new Set(['bullet', 'blitz', 'rapid', 'classical']);
    return (this.facets().speeds || []).filter(
      (speed) => !builtIns.has(String(this.facetKey(speed)).toLowerCase()),
    );
  }

  protected facetKey(facet: FacetValue): string {
    return String(facet.value ?? facet.id ?? facet.name ?? facet.username ?? '');
  }

  protected facetLabel(facet: FacetValue): string {
    const label =
      facet.label ?? facet.name ?? facet.username ?? facet.value ?? facet.id ?? 'Unknown';
    return facet.count === null || facet.count === undefined
      ? String(label)
      : `${label} (${facet.count})`;
  }

  protected accountLabel(facet: FacetValue): string {
    const name =
      facet.username || facet.name || facet.label || facet.value || facet.id || 'Account';
    const provider = facet.provider ? ` · ${this.providerLabel(facet.provider)}` : '';
    const count = facet.count === null || facet.count === undefined ? '' : ` (${facet.count})`;
    return `${name}${provider}${count}`;
  }

  private providerLabel(provider?: Provider | null): string {
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }

  private withLockedColor(filters: GameFilters): GameFilters {
    return this.lockedUserColor() ? { ...filters, userColor: this.lockedUserColor()! } : filters;
  }
}
