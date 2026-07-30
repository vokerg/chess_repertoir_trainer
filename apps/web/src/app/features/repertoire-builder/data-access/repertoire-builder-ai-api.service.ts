import { Injectable, inject } from '@angular/core';
import type {
  AiBuilderCandidateExplanationRequest,
  AiBuilderCandidateExplanationResponse,
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
}
