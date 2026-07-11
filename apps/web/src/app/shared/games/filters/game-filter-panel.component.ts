import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FacetValue,
  emptyImportedGameFacets,
  ImportedGameFacetsResponse,
  Provider,
  UserColor,
} from '../game.models';
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
  @ViewChild('tagsPicker') private tagsPicker?: ElementRef<HTMLElement>;

  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly loading = input(false);
  readonly lockedUserColor = input<UserColor | null>(null);
  readonly filtersChange = output<GameFilters>();
  readonly apply = output<void>();
  readonly reset = output<void>();
  readonly tagsOpen = signal(false);
  readonly moreFiltersOpen = signal(false);
  readonly advancedFilterCount = computed(() => {
    const filters = this.filters();
    return [
      filters.plyIndexStatus,
      filters.timeControl,
      filters.opponent,
      filters.openingName,
      filters.minAccuracy,
      filters.maxAccuracy,
      filters.minOpponentRating,
      filters.maxOpponentRating,
    ].filter((value) => value.trim().length > 0).length;
  });

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const picker = this.tagsPicker?.nativeElement;
    if (!picker || !this.tagsOpen()) return;
    if (event.target instanceof Node && picker.contains(event.target)) return;
    this.closeTagsPicker();
  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    this.closeTagsPicker();
  }

  protected toggleTagsPicker(event?: Event): void {
    event?.preventDefault();
    this.tagsOpen.update((open) => !open);
  }

  protected closeTagsPicker(): void {
    this.tagsOpen.set(false);
  }

  protected setFilter<K extends keyof GameFilters>(key: K, value: GameFilters[K]): void {
    if (key === 'userColor' && this.lockedUserColor()) return;
    this.filtersChange.emit(this.withLockedColor({ ...this.filters(), [key]: value }));
  }

  protected setFilterValue<K extends keyof GameFilters>(key: K, value: string): void {
    this.filtersChange.emit(this.withLockedColor({ ...this.filters(), [key]: value }));
  }

  protected selectedTagCodes(): number[] {
    return this.filters().tagCodes;
  }

  protected tagSelectionLabel(): string {
    if (this.filters().tagFilter === 'NO_TAGS') return 'No tags';
    const count = this.selectedTagCodes().length;
    if (count === 0) return 'Any tags';
    return count === 1 ? '1 selected' : `${count} selected`;
  }

  protected noTagsSelected(): boolean {
    return this.filters().tagFilter === 'NO_TAGS';
  }

  protected toggleNoTags(checked: boolean): void {
    this.filtersChange.emit(this.withLockedColor({
      ...this.filters(),
      tagFilter: checked ? 'NO_TAGS' : '',
      tagCodes: checked ? [] : this.filters().tagCodes,
    }));
  }

  protected isTagSelected(code: number): boolean {
    return !this.noTagsSelected() && this.selectedTagCodes().includes(code);
  }

  protected toggleTagCode(code: number, checked: boolean): void {
    const selectedCodes = new Set(this.selectedTagCodes());
    if (checked) selectedCodes.add(code);
    else selectedCodes.delete(code);
    this.filtersChange.emit(this.withLockedColor({
      ...this.filters(),
      tagFilter: '',
      tagCodes: Array.from(selectedCodes).sort((left, right) => left - right),
    }));
  }

  protected customSpeedFacets(): FacetValue[] {
    const builtIns = new Set(['bullet', 'blitz', 'rapid', 'classical']);
    return (this.facets().speeds || []).filter(
      (speed) => !builtIns.has(String(this.facetKey(speed)).toLowerCase()),
    );
  }

  protected tagCode(facet: FacetValue): number {
    return Number(facet.value ?? facet.id ?? 0);
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
