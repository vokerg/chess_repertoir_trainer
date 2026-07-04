import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import {
  ScenarioAttemptResult,
  ScenarioTrainingHistoryResponse,
  ScenarioTrainingSession,
  StartScenarioRequest,
  SubmitScenarioAttemptRequest,
} from './scenario-training.models';

@Injectable()
export class ScenarioTrainingApiService {
  private readonly api = inject(ApiService);

  startTacticalMissedShot(request: StartScenarioRequest): Observable<ScenarioTrainingSession> {
    return this.api.post<ScenarioTrainingSession>('/scenario-training/tactical-missed-shot/start', request);
  }

  getSession(sessionId: number): Observable<ScenarioTrainingSession> {
    return this.api.get<ScenarioTrainingSession>(`/scenario-training/${sessionId}`);
  }

  submitAttempt(sessionId: number, request: SubmitScenarioAttemptRequest): Observable<ScenarioAttemptResult> {
    return this.api.post<ScenarioAttemptResult>(`/scenario-training/${sessionId}/attempt`, request);
  }

  complete(sessionId: number): Observable<ScenarioTrainingSession> {
    return this.api.post<ScenarioTrainingSession>(`/scenario-training/${sessionId}/complete`, {});
  }

  history(): Observable<ScenarioTrainingHistoryResponse> {
    return this.api.get<ScenarioTrainingHistoryResponse>('/scenario-training/history');
  }
}
