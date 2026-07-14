import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PerformanceByRatingRow, PerformanceReportType } from '@chess-trainer/contracts/lab';
import { PerformanceByRatingApiService } from '../data-access/performance-by-rating-api.service';

export type PerformanceColumnId =
  | 'games'
  | 'wdl'
  | 'score'
  | 'whiteWdl'
  | 'blackWdl'
  | 'openingSuccess'
  | 'openingTrouble'
  | 'wasWinningAndLost'
  | 'wasLosingAndWon'
  | 'flaggedInWinningPosition'
  | 'opponentFlaggedInWinningPosition'
  | 'slowBleedLosses'
  | 'slowBleedWins'
  | 'averageAccuracy'
  | 'analysisCoverage';

export type PerformanceColumnPreset = 'core' | 'stories' | 'all' | 'custom';

export const PERFORMANCE_REPORT_TYPES: readonly PerformanceReportType[] = [
  'LICHESS_BLITZ',
  'LICHESS_RAPID',
  'CHESS_COM_BLITZ',
  'CHESS_COM_RAPID',
];

export const ALL_PERFORMANCE_COLUMNS: readonly PerformanceColumnId[] = [
  'games',
  'wdl',
  'score',
  'whiteWdl',
  'blackWdl',
  'openingSuccess',
  'openingTrouble',
  'wasWinningAndLost',
  'wasLosingAndWon',
  'flaggedInWinningPosition',
  'opponentFlaggedInWinningPosition',
  'slowBleedLosses',
  'slowBleedWins',
  'averageAccuracy',
  'analysisCoverage',
];

const CORE_COLUMNS: readonly PerformanceColumnId[] = [
  'games',
  'wdl',
  'score',
  'whiteWdl',
  'blackWdl',
  'openingSuccess',
  'openingTrouble',
  'wasWinningAndLost',
  'wasLosingAndWon',
  'averageAccuracy',
];

const STORY_COLUMNS: readonly PerformanceColumnId[] = [
  'games',
  'openingSuccess',
  'openingTrouble',
  'wasWinningAndLost',
  'wasLosingAndWon',
  'flaggedInWinningPosition',
  'opponentFlaggedInWinningPosition',
  'slowBleedLosses',
  'slowBleedWins',
  'averageAccuracy',
  'analysisCoverage',
];

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function subtractCalendarMonths(date: Date, months: number): Date {
  const originalDay = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastTargetDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, lastTargetDay));
  return target;
}

function defaultRange() {
  const to = new Date();
  return {
    from: dateInputValue(subtractCalendarMonths(to, 3)),
    to: dateInputValue(to),
  };
}

function sameColumns(left: readonly PerformanceColumnId[], right: readonly PerformanceColumnId[]) {
  return left.length === right.length && left.every((column) => right.includes(column));
}

@Injectable()
export class PerformanceByRatingStore {
  private readonly api = inject(PerformanceByRatingApiService);
  private readonly defaults = defaultRange();

  readonly from = signal(this.defaults.from);
  readonly to = signal(this.defaults.to);
  readonly items = signal<readonly PerformanceByRatingRow[]>([]);
  readonly enabledTypes = signal<readonly PerformanceReportType[]>(PERFORMANCE_REPORT_TYPES);
  readonly visibleColumns = signal<readonly PerformanceColumnId[]>(CORE_COLUMNS);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly filteredItems = computed(() => {
    const enabled = new Set(this.enabledTypes());
    return this.items().filter((item) => enabled.has(item.type));
  });

  readonly selectedPreset = computed<PerformanceColumnPreset>(() => {
    const columns = this.visibleColumns();
    if (sameColumns(columns, CORE_COLUMNS)) return 'core';
    if (sameColumns(columns, STORY_COLUMNS)) return 'stories';
    if (sameColumns(columns, ALL_PERFORMANCE_COLUMNS)) return 'all';
    return 'custom';
  });

  readonly visibleColumnCount = computed(() => this.visibleColumns().length);

  setFrom(value: string): void {
    this.from.set(value);
  }

  setTo(value: string): void {
    this.to.set(value);
  }

  isTypeEnabled(type: PerformanceReportType): boolean {
    return this.enabledTypes().includes(type);
  }

  toggleType(type: PerformanceReportType): void {
    const current = this.enabledTypes();
    this.enabledTypes.set(
      current.includes(type) ? current.filter((candidate) => candidate !== type) : [...current, type],
    );
  }

  isColumnVisible(column: PerformanceColumnId): boolean {
    return this.visibleColumns().includes(column);
  }

  toggleColumn(column: PerformanceColumnId): void {
    const current = this.visibleColumns();
    this.visibleColumns.set(
      current.includes(column)
        ? current.filter((candidate) => candidate !== column)
        : ALL_PERFORMANCE_COLUMNS.filter((candidate) => candidate === column || current.includes(candidate)),
    );
  }

  setPreset(preset: Exclude<PerformanceColumnPreset, 'custom'>): void {
    if (preset === 'core') this.visibleColumns.set(CORE_COLUMNS);
    if (preset === 'stories') this.visibleColumns.set(STORY_COLUMNS);
    if (preset === 'all') this.visibleColumns.set(ALL_PERFORMANCE_COLUMNS);
  }

  async initialize(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.from() || !this.to()) {
      this.error.set('Choose both dates.');
      return;
    }
    if (this.from() > this.to()) {
      this.error.set('From date must not be after to date.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.getPerformanceByRating({
        from: this.from(),
        to: this.to(),
      }));
      this.items.set(response.items);
      this.from.set(response.range.from);
      this.to.set(response.range.to);
      this.loaded.set(true);
    } catch {
      this.error.set('Could not load performance by rating.');
    } finally {
      this.loading.set(false);
    }
  }
}
