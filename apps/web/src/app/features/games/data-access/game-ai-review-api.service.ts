import { inject, Injectable } from '@angular/core';
import type {
  AiGameReviewResponse,
  AiGameReviewStateResponse,
} from '@chess-trainer/contracts/ai';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

@Injectable({ providedIn: 'root' })
export class GameAiReviewApiService {
  private readonly api = inject(ApiService);

  get(gameId: number): Observable<AiGameReviewStateResponse> {
    return this.api.get<AiGameReviewStateResponse>(`/imported-games/${gameId}/ai-review`);
  }

  generate(gameId: number): Observable<AiGameReviewResponse> {
    return this.api.post<AiGameReviewResponse>(`/imported-games/${gameId}/ai-review`, null);
  }
}
