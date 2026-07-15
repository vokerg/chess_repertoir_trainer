import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { emptyImportedGameFacets, ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { defaultGameFilters, GameFilters } from '../../../shared/games/filters/game-filter.model';
import { OpeningStrugglesApiService } from '../data-access/opening-struggles-api.service';
import {
  OpeningStruggleItem,
  OpeningStrugglesCriteria,
} from '../data-access/opening-struggles.models';

const defaultCriteria: OpeningStrugglesCriteria = {
  mode: 'results',
  minGames: 5,
  minLossRate: 60,
  minOccurrences: 5,
  minAverageCentipawnLoss: 60,
  minEvaluatedGames: 5,
  maxAverageUserEvalCp: -80,
  openingDepth: 10,
  limit: 100,
};

function defaultOpeningStrugglesGameFilters(): GameFilters {
  return { ...defaultGameFilters(), rated: 'true' };
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 422) {
    const message = error.error?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'The selected game scope is too large. Narrow the date, account, or game filters.';
  }
  return 'Could not load opening struggles.';
}

@Injectable()
export class OpeningStrugglesStore {
  private readonly api = inject(OpeningStrugglesApiService);
  readonly gameFilters = signal<GameFilters>(defaultOpeningStrugglesGameFilters());
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly criteria = signal<OpeningStrugglesCriteria>(defaultCriteria);
  readonly items = signal<readonly OpeningStruggleItem[]>([]);
  readonly totalFilteredGames = signal(0);
  readonly indexedFilteredGames = signal(0);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly isResultsMode = computed(() => this.criteria().mode === 'results');
  readonly isRepeatedMistakesMode = computed(() => this.criteria().mode === 'repeatedMistakes');

  setGameFilters(filters: GameFilters): void {
    this.gameFilters.set(filters);
  }

  resetGameFilters(): void {
    this.gameFilters.set(defaultOpeningStrugglesGameFilters());
    void this.load();
  }

  updateCriteria<K extends keyof OpeningStrugglesCriteria>(key: K, value: OpeningStrugglesCriteria[K]): void {
    const modeChanged = key === 'mode' && value !== this.criteria().mode;
    this.criteria.update((criteria) => ({ ...criteria, [key]: value }));
    if (modeChanged) this.clearResults();
  }

  async initialize(): Promise<void> {
    await this.loadFacets();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.clearResults();
    try {
      const response = await firstValueFrom(this.api.getOpeningStruggles(this.gameFilters(), this.criteria()));
      this.items.set(response.items);
      this.totalFilteredGames.set(response.totalFilteredGames);
      this.indexedFilteredGames.set(response.indexedFilteredGames);
      this.loaded.set(true);
    } catch (error) {
      this.error.set(loadErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private clearResults(): void {
    this.items.set([]);
    this.totalFilteredGames.set(0);
    this.indexedFilteredGames.set(0);
    this.loaded.set(false);
    this.error.set(null);
  }

  private async loadFacets(): Promise<void> {
    try {
      this.facets.set(await firstValueFrom(this.api.getFacets()));
    } catch {
      this.facets.set(emptyImportedGameFacets());
    }
  }
}
