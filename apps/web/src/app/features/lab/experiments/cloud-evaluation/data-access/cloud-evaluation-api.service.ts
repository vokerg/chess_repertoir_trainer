import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CloudEvaluationResponse } from '@chess-trainer/contracts/lab';
import { ApiService } from '../../../../../core/api/api.service';

@Injectable()
export class CloudEvaluationApiService {
  private readonly api = inject(ApiService);

  lookup(fen: string): Observable<CloudEvaluationResponse> {
    return this.api.get<CloudEvaluationResponse>(
      '/lab/cloud-evaluation?fen=' + encodeURIComponent(fen),
    );
  }
}
