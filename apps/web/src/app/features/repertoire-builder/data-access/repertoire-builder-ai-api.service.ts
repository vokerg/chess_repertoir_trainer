import { Injectable, inject } from '@angular/core';
import type {
  AiBuilderCandidateExplanationRequest,
  AiBuilderCandidateExplanationResponse,
  AiBuilderCompletionSummaryRequest,
  AiBuilderCompletionSummaryResponse,
} from '@chess-trainer/contracts/ai';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

@Injectable()
export class RepertoireBuilderAiApiService {
  private readonly api = inject(ApiService);

  generateCandidateExplanation(
    request: AiBuilderCandidateExplanationRequest,
  ): Observable<AiBuilderCandidateExplanationResponse> {
    return this.api.post<AiBuilderCandidateExplanationResponse>(
      '/ai/repertoire-builder/candidate-explanation',
      request,
    );
  }

  generateCompletionSummary(
    request: AiBuilderCompletionSummaryRequest,
  ): Observable<AiBuilderCompletionSummaryResponse> {
    return this.api.post<AiBuilderCompletionSummaryResponse>(
      '/ai/repertoire-builder/completion-summary',
      request,
    );
  }
}