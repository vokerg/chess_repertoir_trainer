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
  SelectMenuComponent,
  type UiSelectMenuOption,
} from '../../ui/select-menu/select-menu.component';
import {
  FacetValue,
  emptyImportedGameFacets,
  ImportedGameFacetsResponse,
  Provider,
  UserColor,
} from '../game.models';
import { gameTagLabel } from '../game-tag-display';
import { GameFilters } from './game-filter.model';
import {
  detectGameFilterPeriod,
  gameFilterPeriodRange,
} from './game-filter-period';
import type { GameFilterPeriod } from './game-filter-period';

const PROVIDER_OPTIONS = [
  { value: 'ALL', label: 'Lichess + Chess.com' },
  { value: 'LICHESS', label: 'Lichess', marker: 'graphite' },
  { value: 'CHESS_COM', label: 'Chess.com', marker: 'action' },
] as const satisfies readonly UiSelectMenuOption[];

const RESULT_OPTIONS = [
  { value: '', label: 'Any result' },
  { value: 'WIN', label: 'Win', marker: 'success' },
  { value: 'DRAW', label: 'Draw', marker: 'neutral' },
  { value: 'LOSS', label: 'Loss', marker: 'danger' },
] as const satisfies readonly UiSelectMenuOption[];

const COLOR_OPTIONS = [
  { value: '', label: 'White or Black' },
  { value: 'WHITE', label: 'White', marker: 'neutral' },
  { value: 'BLACK', label: 'Black', marker: 'graphite' },
] as const satisfies readonly UiSelectMenuOption[];

const RATED_OPTIONS = [
  { value: '', label: 'Rated or casual' },
  { value: 'true', label: 'Rated', marker: 'action' },
  { value: 'false', label: 'Casual', marker: 'neutral' },
] as const satisfies readonly UiSelectMenuOption[];

const ANALYSIS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'NOT_ANALYZED', label: 'Not analysed', marker: 'neutral' },
  { value: 'RUNNING', label: 'Running', marker: 'info' },
  { value: 'COMPLETED', label: 'Completed', marker: 'success' },
  { value: 'FAILED', label: 'Failed', marker: 'danger' },
] as const satisfies readonly UiSelectMenuOption[];

const PERIOD_OPTIONS = [
  { value: 'TODAY', label: 'Today' },
  { value: '1M', label: '1M', caption: 'Last month' },
  { value: '3M', label: '3M', caption: 'Last 3 months' },
  { value: 'YTD', label: 'YTD', caption: 'Year to date' },
  { value: '1Y', label: '1Y', caption: 'Last year' },
  { value: '3Y', label: '3Y', caption: 'Last 3 years' },
  { value: '5Y', label: '5Y', caption: 'Last 5 years' },
  { value: 'ALL', label: 'All', caption: 'All imported games' },
  { value: 'CUSTOM', label: 'Custom', caption: 'Choose exact dates' },
] as const satisfies readonly UiSelectMenuOption[];

const INDEXED_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'NOT_INDEXED', label: 'Not indexed', marker: 'neutral' },
  { value: 'INDEXED', label: 'Indexed', marker: 'success' },
  { value: 'FAILED', label: 'Failed', marker: 'danger' },
] as const satisfies readonly UiSelectMenuOption[];

export type GameFilterPanelPresentation = 'default' | 'explorer';

@Component({
  selector: 'app-game-filter-panel',
  standalone: true,
  imports: [FormsModule, SelectMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-filter-panel.component.html',
  styleUrl: './game-filter-panel.component.css',
})
export class GameFilterPanelComponent {
  @ViewChild('tagsPicker') private tagsPicker?: ElementRef<HTMLElement>;

  readonly filters = input.required<GameFilters>();
  readonly facets = input<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly loading = input(false);
  readonly applyLabel = input('Apply filters');
  readonly showActions = input(true);
  readonly lockedUserColor = input<UserColor | null>(null);
  readonly presentation = input<GameFilterPanelPresentation>('default');
  readonly filtersChange = output<GameFilters>();
  readonly apply = output<void>();
  readonly reset = output<void>();
  readonly tagsOpen = signal(false);
  readonly moreFiltersOpen = signal(false);
  readonly providerOptions = PROVIDER_OPTIONS;
  readonly resultOptions = RESULT_OPTIONS;
  readonly colorOptions = COLOR_OPTIONS;
  readonly ratedOptions = RATED_OPTIONS;
  readonly analysisOptions = ANALYSIS_OPTIONS;
  readonly periodOptions = PERIOD_OPTIONS;
  readonly indexedOptions = INDEXED_OPTIONS;
  readonly accountOptions = computed<readonly UiSelectMenuOption[]>(() => [
    { value: '', label: 'All accounts' },
    ...(this.facets().accounts || []).map((account) => ({
      value: this.facetKey(account),
      label: this.accountLabel(account),
    })),
  ]);
  readonly controlOptions = computed<readonly UiSelectMenuOption[]>(() => [
    { value: '', label: 'Any control' },
    { value: 'bullet', label: 'Bullet' },
    { value: 'blitz,rapid', label: 'Blitz + rapid', marker: 'action' },
    { value: 'blitz', label: 'Blitz' },
    { value: 'rapid', label: 'Rapid' },
    { value: 'classical', label: 'Classical' },
    ...this.customSpeedFacets().map((speed) => ({
      value: this.facetKey(speed),
      label: this.facetLabel(speed),
    })),
  ]);
  readonly selectedPeriod = computed(() =>
    detectGameFilterPeriod({
      from: this.filters().from,
      to: this.filters().to,
    }),
  );
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
    if (key === 'userColor' && this.lockedUserColor()) return;
    const next = { ...this.filters(), [key]: value } as GameFilters;
    if (key === 'openingName') next.openingNameExact = '';
    this.filtersChange.emit(this.withLockedColor(next));
  }

  protected setPeriodValue(period: string): void {
    this.setPeriod(period as GameFilterPeriod);
  }

  protected setPeriod(period: GameFilterPeriod): void {
    if (period === 'CUSTOM') {
      this.moreFiltersOpen.set(true);
      return;
    }

    this.filtersChange.emit(
      this.withLockedColor({
        ...this.filters(),
        ...gameFilterPeriodRange(period),
      }),
    );
  }

  protected selectedTagCodes(): number[] {
    return this.filters().tagCodes;
  }

  protected tagSelectionLabel(): string {
    if (this.filters().tagFilter === 'NO_TAGS') return 'No tags';
    const count = this.selectedTagCodes().length;
    if (count === 0) return 'Any tags';
    if (count === 1) {
      const selectedTag = (this.facets().tags || []).find(
        (tag) => this.tagCode(tag) === this.selectedTagCodes()[0],
      );
      if (selectedTag) return this.tagLabel(selectedTag);
    }
    return `${count} selected`;
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

  protected tagLabel(facet: FacetValue): string {
    return gameTagLabel({
      code: this.tagCode(facet),
      name: String(facet.name ?? facet.label ?? facet.value ?? ''),
    });
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