import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { firstValueFrom } from 'rxjs';
import { percentage, sameOpening } from '../masters-explorer/masters-explorer.helpers';
import { ProgressiveListComponent } from '../ui/progressive-list/progressive-list.component';
import { LichessGamesExplorerApiService } from './lichess-games-explorer-api.service';
import {
  compactGameCount,
  exactGameCount,
} from './lichess-games-explorer.helpers';
import {
  defaultLichessGamesExplorerFilters,
  effectiveRatingLabel,
  evidencePeriodLabel,
  lichessRatingSelectionOptions,
  lichessSpeedPresetOptions,
  ratingSelectionValue,
  speedPresetLabel,
  type LichessGamesExplorerFilters,
} from './lichess-games-explorer.models';

@Component({
  selector: 'app-lichess-games-explorer-widget',
  standalone: true,
  imports: [ProgressiveListComponent],
  templateUrl: './lichess-games-explorer-widget.component.html',
  styleUrl: './lichess-games-explorer-widget.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessGamesExplorerWidgetComponent {
  private readonly api = inject(LichessGamesExplorerApiService);
  private readonly defaultFilters = defaultLichessGamesExplorerFilters();

  readonly fen = input.required<string>();
  readonly embedded = input(false);
  readonly moveSelected = output<string>();

  readonly filters = signal(this.defaultFilters);
  readonly response = signal<OpeningExplorerResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtersOpen = signal(false);

  protected readonly ratingOptions = lichessRatingSelectionOptions;
  protected readonly speedOptions = lichessSpeedPresetOptions;
  protected readonly percentage = percentage;
  protected readonly sameOpening = sameOpening;
  protected readonly compactGameCount = compactGameCount;
  protected readonly exactGameCount = exactGameCount;
  protected readonly hasGames = computed(() => (this.response()?.games.total ?? 0) > 0);
  protected readonly currentRatingSelection = computed(() => ratingSelectionValue(this.filters()));
  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();
    return Number(filters.speedPreset !== this.defaultFilters.speedPreset)
      + Number(
        filters.ratingTarget !== this.defaultFilters.ratingTarget
        || filters.ratingGroup !== this.defaultFilters.ratingGroup,
      );
  });
  protected readonly populationSummary = computed(() => {
    const population = this.response()?.population;
    if (!population) return null;
    const parts = [
      speedPresetLabel(population.requested.speedPreset),
      effectiveRatingLabel(population.effective.ratingGroups),
    ];
    if (population.peerResolution) {
      parts.push(evidencePeriodLabel(population.peerResolution.evidencePeriod));
    }
    return parts.join(' · ');
  });

  private requestId = 0;
  private requestedKey: string | null = null;

  constructor() {
    effect(() => {
      const fen = this.fen();
      const filters = this.filters();
      const key = JSON.stringify([fen, filters]);
      if (key === this.requestedKey) return;
      this.requestedKey = key;
      untracked(() => void this.load(fen, filters));
    });
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected setSpeedPreset(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const option = this.speedOptions.find((candidate) => candidate.value === value);
    if (!option) return;
    this.filters.update((filters) => ({ ...filters, speedPreset: option.value }));
  }

  protected setRatingSelection(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const option = this.ratingOptions.find((candidate) => candidate.value === value);
    if (!option) return;
    this.filters.update((filters) => ({
      ...filters,
      ratingTarget: option.target,
      ratingGroup: option.ratingGroup,
    }));
  }

  protected resetFilters(): void {
    this.filters.set(defaultLichessGamesExplorerFilters());
  }

  protected retry(): void {
    void this.load(this.fen(), this.filters());
  }

  private async load(
    fen: string,
    filters: LichessGamesExplorerFilters,
  ): Promise<void> {
    const currentRequestId = ++this.requestId;
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.getPosition(fen, filters));
      if (currentRequestId !== this.requestId) return;
      this.response.set(response);
    } catch (error) {
      if (currentRequestId !== this.requestId) return;
      this.error.set(readError(error));
      this.response.set(null);
    } finally {
      if (currentRequestId === this.requestId) this.loading.set(false);
    }
  }
}

function readError(error: unknown): string {
  const response = error as { error?: string | { error?: string; message?: string }; message?: string };
  if (typeof response?.error === 'string' && response.error) return response.error;
  if (typeof response?.error === 'object') {
    if (response.error.error) return response.error.error;
    if (response.error.message) return response.error.message;
  }
  return 'Could not load peer games from Lichess.';
}
