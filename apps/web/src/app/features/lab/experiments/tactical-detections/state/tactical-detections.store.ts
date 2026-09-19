import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { defaultGameFilters } from '../../../../../shared/games/filters/game-filter.model';
import type { GameFilters } from '../../../../../shared/games/filters/game-filter.model';
import { summaryGameFilters } from '../../../../../shared/games/filters/game-filter-summary';
import { emptyImportedGameFacets } from '../../../../../shared/games/game.models';
import type { ImportedGameFacetsResponse } from '../../../../../shared/games/game.models';
import { TacticalDetectionsApiService } from '../data-access/tactical-detections-api.service';
import {
  TacticalDetectionItem,
  TacticalDetectionKind,
  TacticalDetectionKindFilter,
  TacticalDetectionRunResponse,
} from '../data-access/tactical-detections.models';

@Injectable()
export class TacticalDetectionsStore {
  private readonly api = inject(TacticalDetectionsApiService);

  readonly gameFilters = signal<GameFilters>(defaultGameFilters());
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly filtersCollapsed = signal(true);
  readonly force = signal(false);
  readonly kindFilter = signal<TacticalDetectionKindFilter>('ALL');
  readonly limit = signal(100);
  readonly items = signal<readonly TacticalDetectionItem[]>([]);
  readonly runSummary = signal<TacticalDetectionRunResponse | null>(null);
  readonly loading = signal(false);
  readonly running = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly missedShots = computed(() => this.items().filter((item) => item.kind === 'MISSED_SHOT').length);
  readonly punishedOpponentBlunders = computed(() => this.items()
    .filter((item) => item.kind === 'PUNISHED_OPPONENT_BLUNDER').length);
  readonly userBlunders = computed(() => this.items().filter((item) => item.kind === 'USER_BLUNDER').length);
  readonly filterSummary = computed(() => summaryGameFilters(this.gameFilters()));

  setGameFilters(filters: GameFilters): void {
    this.gameFilters.set(filters);
  }

  resetGameFilters(): void {
    this.gameFilters.set(defaultGameFilters());
    void this.load();
  }

  toggleFilters(): void {
    this.filtersCollapsed.update((collapsed) => !collapsed);
  }

  setForce(value: boolean): void {
    this.force.set(value);
  }

  setKindFilter(value: TacticalDetectionKindFilter): void {
    this.kindFilter.set(value);
  }

  async initialize(): Promise<void> {
    this.facets.set(await firstValueFrom(this.api.getFacets()).catch(() => emptyImportedGameFacets()));
    await this.load();
  }

  async runDetection(): Promise<void> {
    this.running.set(true);
    this.error.set(null);
    try {
      const filters = this.gameFilters();
      const summary = await firstValueFrom(this.api.runDetection({
        from: filters.from || undefined,
        to: filters.to || undefined,
        force: this.force(),
      }));
      this.runSummary.set(summary);
      await this.load();
    } catch {
      this.error.set('Could not run tactical detection.');
    } finally {
      this.running.set(false);
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const filter = this.kindFilter();
      const kind: TacticalDetectionKind | undefined = filter === 'ALL' ? undefined : filter;
      const response = await firstValueFrom(this.api.getDetections(this.gameFilters(), {
        kind,
        limit: this.limit(),
      }));
      this.items.set(response.items);
      this.loaded.set(true);
    } catch {
      this.error.set('Could not load tactical detections.');
    } finally {
      this.loading.set(false);
    }
  }
}
