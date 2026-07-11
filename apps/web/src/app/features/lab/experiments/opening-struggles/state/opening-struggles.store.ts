import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { emptyImportedGameFacets, ImportedGameFacetsResponse } from '../../../../../shared/games/game.models';
import { defaultGameFilters, GameFilters } from '../../../../../shared/games/filters/game-filter.model';
import { OpeningStrugglesApiService } from '../data-access/opening-struggles-api.service';
import {
  OpeningStruggleItem,
  OpeningStrugglesCriteria,
} from '../data-access/opening-struggles.models';

const defaultCriteria: OpeningStrugglesCriteria = {
  minGames: 5,
  maxPly: 20,
  limit: 100,
  resultMetric: 'lossRate',
  minLossRate: 60,
  maxWinRate: 40,
  maxScorePct: 40,
  evalMetric: 'none',
  maxUserEvalCp: -100,
};

function defaultOpeningStrugglesGameFilters(): GameFilters {
  return { ...defaultGameFilters(), rated: 'true' };
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
  readonly metricsDisabled = computed(() => {
    const criteria = this.criteria();
    return criteria.resultMetric === 'none' && criteria.evalMetric === 'none';
  });

  setGameFilters(filters: GameFilters): void {
    this.gameFilters.set(filters);
  }

  resetGameFilters(): void {
    this.gameFilters.set(defaultOpeningStrugglesGameFilters());
    void this.load();
  }

  updateCriteria<K extends keyof OpeningStrugglesCriteria>(key: K, value: OpeningStrugglesCriteria[K]): void {
    this.criteria.update((criteria) => ({ ...criteria, [key]: value }));
  }

  async initialize(): Promise<void> {
    await this.loadFacets();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.getOpeningStruggles(this.gameFilters(), this.criteria()));
      this.items.set(response.items);
      this.totalFilteredGames.set(response.totalFilteredGames);
      this.indexedFilteredGames.set(response.indexedFilteredGames);
      this.loaded.set(true);
    } catch {
      this.error.set('Could not load opening struggles.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFacets(): Promise<void> {
    try {
      this.facets.set(await firstValueFrom(this.api.getFacets()));
    } catch {
      this.facets.set(emptyImportedGameFacets());
    }
  }
}
