import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TacticalDetectionsApiService } from '../data-access/tactical-detections-api.service';
import {
  TacticalDetectionItem,
  TacticalDetectionKind,
  TacticalDetectionKindFilter,
  TacticalDetectionRunResponse,
} from '../data-access/tactical-detections.models';

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    from: dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

@Injectable()
export class TacticalDetectionsStore {
  private readonly api = inject(TacticalDetectionsApiService);
  private readonly defaults = currentMonthRange();

  readonly from = signal(this.defaults.from);
  readonly to = signal(this.defaults.to);
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

  setFrom(value: string): void {
    this.from.set(value);
  }

  setTo(value: string): void {
    this.to.set(value);
  }

  setForce(value: boolean): void {
    this.force.set(value);
  }

  setKindFilter(value: TacticalDetectionKindFilter): void {
    this.kindFilter.set(value);
    void this.load();
  }

  async initialize(): Promise<void> {
    await this.load();
  }

  async runDetection(): Promise<void> {
    this.running.set(true);
    this.error.set(null);
    try {
      const summary = await firstValueFrom(this.api.runDetection({
        from: this.from(),
        to: this.to(),
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
      const response = await firstValueFrom(this.api.getDetections({
        from: this.from(),
        to: this.to(),
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
