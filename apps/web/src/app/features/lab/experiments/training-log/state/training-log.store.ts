import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TrainingLogApiService } from '../data-access/training-log-api.service';
import { TrainingLogItem } from '../data-access/training-log.models';

@Injectable()
export class TrainingLogStore {
  private readonly api = inject(TrainingLogApiService);
  readonly items = signal<readonly TrainingLogItem[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.getTrainingLog());
      this.items.set(response.items);
      this.loaded.set(true);
    } catch {
      this.error.set('Could not load training log.');
    } finally {
      this.loading.set(false);
    }
  }
}
