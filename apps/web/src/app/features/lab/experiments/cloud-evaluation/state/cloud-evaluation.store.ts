import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { CloudEvaluationResponse } from '@chess-trainer/contracts/lab';
import { firstValueFrom } from 'rxjs';
import { CloudEvaluationApiService } from '../data-access/cloud-evaluation-api.service';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

@Injectable()
export class CloudEvaluationStore {
  private readonly api = inject(CloudEvaluationApiService);

  readonly fen = signal(STARTING_FEN);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<CloudEvaluationResponse | null>(null);

  async lookup(): Promise<void> {
    if (this.loading()) return;
    const fen = this.fen().trim();
    this.result.set(null);
    if (!fen) {
      this.error.set('Enter a FEN to look up.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      this.result.set(await firstValueFrom(this.api.lookup(fen)));
    } catch (error) {
      const message = error instanceof HttpErrorResponse ? error.error?.error : null;
      this.error.set(typeof message === 'string' ? message : 'Could not retrieve the Lichess cloud evaluation.');
    } finally {
      this.loading.set(false);
    }
  }
}
