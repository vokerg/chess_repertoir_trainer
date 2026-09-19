import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TopOpponentsApiService } from '../data-access/top-opponents-api.service';
import { TopOpponent } from '../data-access/top-opponents.models';

@Injectable()
export class TopOpponentsStore {
  private readonly api = inject(TopOpponentsApiService);
  readonly items = signal<readonly TopOpponent[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.getTopOpponents(50));
      this.items.set(response.items);
      this.loaded.set(true);
    } catch {
      this.error.set('Could not load top opponents.');
    } finally {
      this.loading.set(false);
    }
  }
}
