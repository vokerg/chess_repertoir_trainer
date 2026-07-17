import { inject, Injectable } from '@angular/core';
import type {
  CreateImportedGameJobRunResponse,
  JobRunDetailResponse,
  JobRunKind,
  JobRunListResponse,
  JobTaskListResponse,
} from '@chess-trainer/contracts/jobs';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';

@Injectable({ providedIn: 'root' })
export class ImportedGameJobApiService {
  private readonly api = inject(ApiService);

  createJob(
    kind: JobRunKind,
    gameIds: readonly number[],
    force = false,
  ): Observable<CreateImportedGameJobRunResponse> {
    return this.api.post<CreateImportedGameJobRunResponse>('/imported-games/job-runs', {
      kind,
      gameIds,
      force,
    });
  }

  listJobs(active: boolean, limit = 100): Observable<JobRunListResponse> {
    return this.api.get<JobRunListResponse>(`/job-runs?active=${active}&limit=${limit}`);
  }

  getJob(jobRunId: number): Observable<JobRunDetailResponse> {
    return this.api.get<JobRunDetailResponse>(`/job-runs/${jobRunId}`);
  }

  cancelJob(jobRunId: number): Observable<JobRunDetailResponse> {
    return this.api.post<JobRunDetailResponse>(`/job-runs/${jobRunId}/cancel`, {});
  }

  retryJob(jobRunId: number): Observable<CreateImportedGameJobRunResponse> {
    return this.api.post<CreateImportedGameJobRunResponse>(`/job-runs/${jobRunId}/retry`, {});
  }

  listTasks(jobRunId: number, offset = 0, limit = 500): Observable<JobTaskListResponse> {
    return this.api.get<JobTaskListResponse>(
      `/job-runs/${jobRunId}/tasks?offset=${offset}&limit=${limit}`,
    );
  }
}
