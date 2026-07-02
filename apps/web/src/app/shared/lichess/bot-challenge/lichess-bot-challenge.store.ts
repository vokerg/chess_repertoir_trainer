import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  LichessBotChallengeApiService,
  LichessBotChallengeOption,
} from './lichess-bot-challenge-api.service';

@Injectable()
export class LichessBotChallengeStore {
  private readonly api = inject(LichessBotChallengeApiService);

  readonly open = signal(false);
  readonly options = signal<readonly LichessBotChallengeOption[]>([]);
  readonly defaultUsername = signal<string | null>(null);
  readonly username = signal('');
  readonly color = signal<'white' | 'black' | 'random'>('white');
  readonly limit = signal(300);
  readonly increment = signal(3);
  readonly loadingOptions = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly fen = signal<string | null>(null);

  readonly canChallenge = computed(() => Boolean(this.fen() && this.username() && !this.submitting()));

  openForFen(fen: string): void {
    this.fen.set(fen);
    this.open.set(true);
    this.error.set(null);
    void this.loadOptions();
  }

  close(): void {
    if (this.submitting()) return;
    this.open.set(false);
  }

  setUsername(username: string): void {
    if (this.options().some((bot) => bot.username === username)) {
      this.username.set(username);
    }
  }

  setColor(color: string): void {
    if (color === 'white' || color === 'black' || color === 'random') {
      this.color.set(color);
    }
  }

  setLimit(value: string | number): void {
    const limit = Number(value);
    if (Number.isFinite(limit)) this.limit.set(Math.max(1, Math.floor(limit)));
  }

  setIncrement(value: string | number): void {
    const increment = Number(value);
    if (Number.isFinite(increment)) this.increment.set(Math.max(0, Math.floor(increment)));
  }

  async submit(): Promise<void> {
    const fen = this.fen();
    if (!fen || !this.username()) return;
    this.submitting.set(true);
    this.error.set(null);

    try {
      const result = await firstValueFrom(
        this.api.challengeBot({
          username: this.username(),
          fen,
          color: this.color(),
          rated: false,
          clock: {
            limit: this.limit(),
            increment: this.increment(),
          },
        }),
      );
      if (!result.url) throw new Error('Lichess accepted the challenge but did not return a URL.');
      window.open(result.url, '_blank', 'noopener');
      this.open.set(false);
    } catch (error) {
      this.error.set(readError(error, 'Lichess rejected the challenge.'));
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadOptions(): Promise<void> {
    if (this.options().length || this.loadingOptions()) return;
    this.loadingOptions.set(true);
    this.error.set(null);

    try {
      const options = await firstValueFrom(this.api.getOptions());
      this.options.set(options.bots);
      this.defaultUsername.set(options.defaultUsername);
      this.username.set(options.defaultUsername || options.bots[0]?.username || '');
    } catch (error) {
      this.error.set(readError(error, 'Could not load Lichess bot challenge options.'));
    } finally {
      this.loadingOptions.set(false);
    }
  }
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { error?: string; message?: string } };
  return response?.error?.error || response?.error?.message || fallback;
}
