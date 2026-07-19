import { inject, Injectable, signal } from '@angular/core';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { firstValueFrom } from 'rxjs';
import { GameAiReviewApiService } from '../data-access/game-ai-review-api.service';

export type GameAiReviewStatus = 'IDLE' | 'GENERATING' | 'READY' | 'ERROR';

@Injectable()
export class GameAiReviewStore {
  private readonly api = inject(GameAiReviewApiService);

  readonly status = signal<GameAiReviewStatus>('IDLE');
  readonly review = signal<AiGameReviewResponse | null>(null);
  readonly error = signal<string | null>(null);

  async generate(gameId: number): Promise<void> {
    if (this.status() === 'GENERATING') return;
    this.status.set('GENERATING');
    this.error.set(null);

    try {
      const review = await firstValueFrom(this.api.generate(gameId));
      this.review.set(review);
      this.status.set('READY');
    } catch (error) {
      this.error.set(readError(error));
      this.status.set('ERROR');
    }
  }
}

function readError(error: unknown): string {
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
  return 'Could not generate the AI game review.';
}
