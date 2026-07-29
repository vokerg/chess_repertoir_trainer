import { Injectable, inject } from '@angular/core';
import type {
  CandidateDecisionRequest,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import type {
  LichessGamesRatingGroup,
  LichessGamesRatingTarget,
  LichessGamesSpeedPreset,
  OpeningExplorerResponse,
} from '@chess-trainer/contracts/opening-explorer';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

@Injectable()
export class RepertoireBuilderApiService {
  private readonly api = inject(ApiService);

  getCandidates(request: CandidateDecisionRequest): Observable<CandidateDecisionResponse> {
    return this.api.post<CandidateDecisionResponse>('/candidate-decisions', request);
  }

  getPopulation(input: {
    fen: string;
    speedPreset: LichessGamesSpeedPreset;
    ratingTarget: LichessGamesRatingTarget;
    ratingGroup: LichessGamesRatingGroup | null;
  }): Observable<OpeningExplorerResponse> {
    const params = new URLSearchParams({
      fen: input.fen,
      speedPreset: input.speedPreset,
      ratingTarget: input.ratingTarget,
    });
    if (input.ratingTarget === 'GROUP' && input.ratingGroup !== null) {
      params.set('ratingGroup', String(input.ratingGroup));
    }
    return this.api.get<OpeningExplorerResponse>(`/lichess-games-explorer?${params.toString()}`);
  }
}
