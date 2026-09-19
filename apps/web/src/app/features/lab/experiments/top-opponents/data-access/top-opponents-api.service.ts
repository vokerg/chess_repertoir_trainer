import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import type { TopOpponentsResponse } from './top-opponents.models';

@Injectable()
export class TopOpponentsApiService {
  private readonly api = inject(ApiService);

  getTopOpponents(limit: number): Observable<TopOpponentsResponse> {
    return this.api.get<TopOpponentsResponse>(`/lab/top-opponents?limit=${limit}`);
  }
}
