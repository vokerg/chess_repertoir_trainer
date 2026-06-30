import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MonthlyGamesApiService } from '../data-access/monthly-games-api.service';
import { MonthlyGamesRow } from '../data-access/monthly-games.models';

@Injectable()
export class MonthlyGamesStore {
  private readonly api = inject(MonthlyGamesApiService);
  readonly items = signal<readonly MonthlyGamesRow[]>([]);
  readonly excludeBullet = signal(false);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.api.getMonthlyGames(this.excludeBullet()));
      this.items.set(response.items);
      this.loaded.set(true);
    } catch {
      this.error.set('Could not load monthly games.');
    } finally {
      this.loading.set(false);
    }
  }

  setExcludeBullet(excludeBullet: boolean): void {
    this.excludeBullet.set(excludeBullet);
  }
}
