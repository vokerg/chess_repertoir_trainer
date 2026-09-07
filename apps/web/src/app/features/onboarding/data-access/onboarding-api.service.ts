import { Injectable, inject } from '@angular/core';
import type {
  OnboardingDispositionCommandResponse,
  OnboardingExpandBody,
  OnboardingReadinessResponse,
  OnboardingRunCommandResponse,
} from '@chess-trainer/contracts/onboarding';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

@Injectable()
export class OnboardingApiService {
  private readonly api = inject(ApiService);

  getReadiness(): Observable<OnboardingReadinessResponse> {
    return this.api.get<OnboardingReadinessResponse>('/me/onboarding');
  }

  start(accountId: number): Observable<OnboardingRunCommandResponse> {
    return this.api.post<OnboardingRunCommandResponse>('/me/onboarding/start', { accountId });
  }

  skip(): Observable<OnboardingDispositionCommandResponse> {
    return this.api.post<OnboardingDispositionCommandResponse>('/me/onboarding/skip', {});
  }

  finish(runId: number): Observable<OnboardingDispositionCommandResponse> {
    return this.api.post<OnboardingDispositionCommandResponse>(
      `/me/onboarding/runs/${runId}/finish`,
      {},
    );
  }

  pause(runId: number): Observable<OnboardingRunCommandResponse> {
    return this.runCommand(runId, 'pause');
  }

  resume(runId: number): Observable<OnboardingRunCommandResponse> {
    return this.runCommand(runId, 'resume');
  }

  cancel(runId: number): Observable<OnboardingRunCommandResponse> {
    return this.runCommand(runId, 'cancel');
  }

  retry(runId: number): Observable<OnboardingRunCommandResponse> {
    return this.runCommand(runId, 'retry');
  }

  restart(runId: number): Observable<OnboardingRunCommandResponse> {
    return this.runCommand(runId, 'restart');
  }

  expand(runId: number, body: OnboardingExpandBody): Observable<OnboardingRunCommandResponse> {
    return this.api.post<OnboardingRunCommandResponse>(`/me/onboarding/runs/${runId}/expand`, body);
  }

  private runCommand(
    runId: number,
    command: 'pause' | 'resume' | 'cancel' | 'retry' | 'restart',
  ): Observable<OnboardingRunCommandResponse> {
    return this.api.post<OnboardingRunCommandResponse>(
      `/me/onboarding/runs/${runId}/${command}`,
      {},
    );
  }
}
