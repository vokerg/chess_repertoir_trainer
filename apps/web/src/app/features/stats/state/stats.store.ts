import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StatsApiService } from '../data-access/stats-api.service';
import { StatsSummary } from '../data-access/stats.models';

@Injectable()
export class StatsStore {
  private readonly api = inject(StatsApiService);
  readonly summary = signal<StatsSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.summary.set(await firstValueFrom(this.api.getSummary()));
    } catch (error) {
      this.summary.set(null);
      const response = error as { error?: { message?: string; error?: string } };
      this.error.set(response?.error?.message || response?.error?.error || 'Could not load training statistics.');
    } finally {
      this.loading.set(false);
    }
  }
}
