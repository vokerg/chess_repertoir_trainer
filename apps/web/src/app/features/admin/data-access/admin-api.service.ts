import { Injectable, inject } from '@angular/core';
import type {
  AdminMeResponse,
  AdminUserDetailResponse,
  AdminUserListResponse,
  AdminUserWorkResponse,
} from '@chess-trainer/contracts/admin';
import type {
  AccountGameDataLifecyclePreviewRequest,
  DataLifecycleExecuteRequest,
  DataLifecycleOperationResponse,
  DataLifecyclePreviewResponse,
} from '@chess-trainer/contracts/data-lifecycle';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

@Injectable()
export class AdminApiService {
  private readonly api = inject(ApiService);

  getMe(): Observable<AdminMeResponse> {
    return this.api.get<AdminMeResponse>('/admin/me');
  }

  listUsers(cursor: string | null, limit: number): Observable<AdminUserListResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return this.api.get<AdminUserListResponse>(`/admin/users?${params.toString()}`);
  }

  getUserDetail(userId: number): Observable<AdminUserDetailResponse> {
    return this.api.get<AdminUserDetailResponse>(`/admin/users/${userId}`);
  }

  getUserWork(userId: number, limit: number): Observable<AdminUserWorkResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    return this.api.get<AdminUserWorkResponse>(`/admin/users/${userId}/work?${params.toString()}`);
  }

  previewLifecycle(
    userId: number,
    request: AccountGameDataLifecyclePreviewRequest,
  ): Observable<DataLifecyclePreviewResponse> {
    return this.api.post<DataLifecyclePreviewResponse>(
      `/admin/users/${userId}/data-lifecycle/preview`,
      request,
    );
  }

  executeLifecycle(
    userId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
  ): Observable<DataLifecycleOperationResponse> {
    return this.api.post<DataLifecycleOperationResponse>(
      `/admin/users/${userId}/data-lifecycle/${operationId}/execute`,
      request,
    );
  }

  getLifecycle(userId: number, operationId: number): Observable<DataLifecycleOperationResponse> {
    return this.api.get<DataLifecycleOperationResponse>(
      `/admin/users/${userId}/data-lifecycle/${operationId}`,
    );
  }

  stopLifecycle(userId: number, operationId: number): Observable<DataLifecycleOperationResponse> {
    return this.api.post<DataLifecycleOperationResponse>(
      `/admin/users/${userId}/data-lifecycle/${operationId}/stop`,
      {},
    );
  }
}
