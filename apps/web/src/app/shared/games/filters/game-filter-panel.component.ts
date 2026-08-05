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
import { detectGameFilterPeriod, gameFilterPeriodRange } from './game-filter-period';
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

type AdvancedGameFilterId =
  | 'provider'
  | 'speedCategory'
  | 'rated'
  | 'analysisStatus'
  | 'tags'
  | 'plyIndexStatus'
  | 'timeControl'
  | 'opponent'
  | 'opening'
  | 'accuracy'
  | 'opponentRating';

interface ActiveAdvancedGameFilter {
  id: AdvancedGameFilterId;
  label: string;
}

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
  @ViewChild('moreFiltersDialog') private moreFiltersDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('moreFiltersClose') private moreFiltersClose?: ElementRef<HTMLButtonElement>;
  private previousFocus: HTMLElement | null = null;

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
  readonly activeAdvancedFilters = computed<readonly ActiveAdvancedGameFilter[]>(() => {
    const filters = this.filters();
    const active: ActiveAdvancedGameFilter[] = [];

    if (filters.provider && filters.provider !== 'ALL') {
      active.push({
        id: 'provider',
        label: this.optionLabel(this.providerOptions, filters.provider),
      });
    }
    if (filters.speedCategory.trim()) {
      active.push({
        id: 'speedCategory',
        label: this.optionLabel(this.controlOptions(), filters.speedCategory),
      });
    }
    if (filters.rated) {
      active.push({ id: 'rated', label: this.optionLabel(this.ratedOptions, filters.rated) });
    }
    if (filters.analysisStatus) {
      active.push({
        id: 'analysisStatus',
        label: this.optionLabel(this.analysisOptions, filters.analysisStatus),
      });
    }
    if (filters.tagFilter || filters.tagCodes.length > 0) {
      active.push({ id: 'tags', label: this.tagSelectionLabel() });
    }
    if (filters.plyIndexStatus) {
      active.push({
        id: 'plyIndexStatus',
        label: `Indexed: ${this.optionLabel(this.indexedOptions, filters.plyIndexStatus)}`,
      });
    }
    if (filters.timeControl.trim()) {
      active.push({ id: 'timeControl', label: `Time: ${filters.timeControl}` });
    }
    if (filters.opponent.trim()) {
      active.push({ id: 'opponent', label: `Opponent: ${filters.opponent}` });
    }
    const opening = filters.openingNameExact.trim() || filters.openingName.trim();
    if (opening) {
      active.push({ id: 'opening', label: `Opening: ${opening}` });
    }
    if (filters.minAccuracy.trim() || filters.maxAccuracy.trim()) {
      active.push({
        id: 'accuracy',
        label: this.rangeLabel('Accuracy', filters.minAccuracy, filters.maxAccuracy, '%'),
      });
    }
    if (filters.minOpponentRating.trim() || filters.maxOpponentRating.trim()) {
      active.push({
        id: 'opponentRating',
        label: this.rangeLabel('Opp. rating', filters.minOpponentRating, filters.maxOpponentRating),
      });
    }

    return active;
  });
  readonly advancedFilterCount = computed(() => this.activeAdvancedFilters().length);

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

  protected openMoreFilters(): void {
    const dialog = this.moreFiltersDialog?.nativeElement;
    if (!dialog || dialog.open) return;
    this.closeTagsPicker();
    this.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.moreFiltersOpen.set(true);
    dialog.showModal();
    queueMicrotask(() => this.moreFiltersClose?.nativeElement.focus());
  }

  protected closeMoreFilters(): void {
    const dialog = this.moreFiltersDialog?.nativeElement;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    this.finishClosingMoreFilters();
  }

  protected onMoreFiltersCancel(event: Event): void {
    event.preventDefault();
    this.closeMoreFilters();
  }

  protected onMoreFiltersBackdrop(event: MouseEvent): void {
    if (event.target === this.moreFiltersDialog?.nativeElement) {
      this.closeMoreFilters();
    }
  }

  protected onMoreFiltersClosed(): void {
    this.finishClosingMoreFilters();
  }

  protected applyFromMoreFilters(): void {
    this.closeMoreFilters();
    this.apply.emit();
  }

  protected resetFromMoreFilters(): void {
    this.closeMoreFilters();
    this.reset.emit();
  }

  protected clearAdvancedFilter(id: AdvancedGameFilterId): void {
    const filters = { ...this.filters() };
    switch (id) {
      case 'provider':
        filters.provider = 'ALL';
        break;
      case 'speedCategory':
        filters.speedCategory = '';
        break;
      case 'rated':
        filters.rated = '';
        break;
      case 'analysisStatus':
        filters.analysisStatus = '';
        break;
      case 'tags':
        filters.tagFilter = '';
        filters.tagCodes = [];
        break;
      case 'plyIndexStatus':
        filters.plyIndexStatus = '';
        break;
      case 'timeControl':
        filters.timeControl = '';
        break;
      case 'opponent':
        filters.opponent = '';
        break;
      case 'opening':
        filters.openingName = '';
        filters.openingNameExact = '';
        break;
      case 'accuracy':
        filters.minAccuracy = '';
        filters.maxAccuracy = '';
        break;
      case 'opponentRating':
        filters.minOpponentRating = '';
        filters.maxOpponentRating = '';
        break;
    }
    this.filtersChange.emit(this.withLockedColor(filters));
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
      this.openMoreFilters();
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
    this.filtersChange.emit(
      this.withLockedColor({
        ...this.filters(),
        tagFilter: checked ? 'NO_TAGS' : '',
        tagCodes: checked ? [] : this.filters().tagCodes,
      }),
    );
  }

  protected isTagSelected(code: number): boolean {
    return !this.noTagsSelected() && this.selectedTagCodes().includes(code);
  }

  protected toggleTagCode(code: number, checked: boolean): void {
    const selectedCodes = new Set(this.selectedTagCodes());
    if (checked) selectedCodes.add(code);
    else selectedCodes.delete(code);
    this.filtersChange.emit(
      this.withLockedColor({
        ...this.filters(),
        tagFilter: '',
        tagCodes: Array.from(selectedCodes).sort((left, right) => left - right),
      }),
    );
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

  private optionLabel(options: readonly UiSelectMenuOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value;
  }

  private rangeLabel(label: string, minimum: string, maximum: string, suffix = ''): string {
    if (minimum.trim() && maximum.trim()) {
      return `${label}: ${minimum}${suffix}–${maximum}${suffix}`;
    }
    if (minimum.trim()) return `${label}: ${minimum}${suffix}+`;
    return `${label}: up to ${maximum}${suffix}`;
  }

  private finishClosingMoreFilters(): void {
    this.moreFiltersOpen.set(false);
    this.closeTagsPicker();
    const target = this.previousFocus;
    this.previousFocus = null;
    if (target?.isConnected) queueMicrotask(() => target.focus());
  }

  private withLockedColor(filters: GameFilters): GameFilters {
    return this.lockedUserColor() ? { ...filters, userColor: this.lockedUserColor()! } : filters;
  }
}
