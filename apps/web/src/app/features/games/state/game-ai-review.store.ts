import { inject, Injectable, signal } from '@angular/core';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { firstValueFrom } from 'rxjs';
import { GameAiReviewApiService } from '../data-access/game-ai-review-api.service';

export type GameAiReviewStatus = 'IDLE' | 'LOADING' | 'GENERATING' | 'READY' | 'ERROR';

@Injectable()
export class GameAiReviewStore {
  private readonly api = inject(GameAiReviewApiService);
  private requestId = 0;

  readonly status = signal<GameAiReviewStatus>('IDLE');
  readonly review = signal<AiGameReviewResponse | null>(null);
  readonly error = signal<string | null>(null);

  reset(): void {
    this.requestId += 1;
    this.status.set('IDLE');
    this.review.set(null);
    this.error.set(null);
  }

  async load(gameId: number): Promise<void> {
    const requestId = ++this.requestId;
    this.status.set('LOADING');
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.api.get(gameId));
      if (requestId !== this.requestId) return;
      this.review.set(response.review);
      this.status.set(response.review ? 'READY' : 'IDLE');
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.error.set(readError(error, 'Could not load the saved AI game review.'));
      this.status.set('ERROR');
    }
  }

  async generate(gameId: number): Promise<void> {
    if (this.status() === 'GENERATING') return;
    const requestId = ++this.requestId;
    this.status.set('GENERATING');
    this.error.set(null);

    try {
      const review = await firstValueFrom(this.api.generate(gameId));
      if (requestId !== this.requestId) return;
      this.review.set(review);
      this.status.set('READY');
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.error.set(readError(error, 'Could not generate the AI game review.'));
      this.status.set('ERROR');
    }
  }
}

function readError(error: unknown, fallback: string): string {
  const response = error as {
    error?: string | { error?: string; message?: string };
    message?: string;
  };
  if (typeof response?.error === 'string' && response.error) return response.error;
  if (typeof response?.error === 'object') {
    if (response.error.error) return response.error.error;
    if (response.error.message) return response.error.message;
  }
  if (response?.message) return response.message;
  return fallback;
}
