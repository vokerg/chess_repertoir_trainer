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
import type {
  LichessGamesRatingGroup,
  LichessGamesSpeed,
  OpeningExplorerResponse,
} from '@chess-trainer/contracts/opening-explorer';
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
  lichessRatingOptions,
  lichessSpeedOptions,
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

  readonly fen = input.required<string>();
  readonly moveSelected = output<string>();

  readonly filters = signal(defaultLichessGamesExplorerFilters());
  readonly response = signal<OpeningExplorerResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtersOpen = signal(false);

  protected readonly ratingOptions = lichessRatingOptions;
  protected readonly speedOptions = lichessSpeedOptions;
  protected readonly percentage = percentage;
  protected readonly sameOpening = sameOpening;
  protected readonly compactGameCount = compactGameCount;
  protected readonly exactGameCount = exactGameCount;
  protected readonly hasGames = computed(() => (this.response()?.games.total ?? 0) > 0);
  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();
    return Number(Boolean(filters.since))
      + Number(Boolean(filters.until))
      + Number(filters.ratings.length !== lichessRatingOptions.length)
      + Number(filters.speeds.length !== lichessSpeedOptions.length);
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

  protected setSince(event: Event): void {
    this.patchMonth('since', event);
  }

  protected setUntil(event: Event): void {
    this.patchMonth('until', event);
  }

  protected toggleRating(value: LichessGamesRatingGroup): void {
    const selected = this.filters().ratings.includes(value);
    const ratings = selected
      ? this.filters().ratings.filter((rating) => rating !== value)
      : [...this.filters().ratings, value];
    if (ratings.length === 0) return;
    this.filters.update((filters) => ({ ...filters, ratings }));
  }

  protected toggleSpeed(value: LichessGamesSpeed): void {
    const selected = this.filters().speeds.includes(value);
    const speeds = selected
      ? this.filters().speeds.filter((speed) => speed !== value)
      : [...this.filters().speeds, value];
    if (speeds.length === 0) return;
    this.filters.update((filters) => ({ ...filters, speeds }));
  }

  protected resetFilters(): void {
    this.filters.set(defaultLichessGamesExplorerFilters());
  }

  protected retry(): void {
    void this.load(this.fen(), this.filters());
  }

  private patchMonth(key: 'since' | 'until', event: Event): void {
    const value = (event.target as HTMLInputElement).value || null;
    const next = { ...this.filters(), [key]: value };
    if (next.since && next.until && next.since > next.until) return;
    this.filters.set(next);
  }

  private async load(
    fen: string,
    filters: ReturnType<typeof defaultLichessGamesExplorerFilters>,
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
