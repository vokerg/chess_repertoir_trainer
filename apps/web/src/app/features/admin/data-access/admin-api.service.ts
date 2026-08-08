import { Injectable, inject } from '@angular/core';
import type {
  AdminMeResponse,
  AdminUserDetailResponse,
  AdminUserListResponse,
  AdminUserWorkResponse,
} from '@chess-trainer/contracts/admin';
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
}
