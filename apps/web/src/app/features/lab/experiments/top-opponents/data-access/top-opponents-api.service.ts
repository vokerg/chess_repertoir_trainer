import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { TopOpponentsResponse } from './top-opponents.models';

@Injectable()
export class TopOpponentsApiService {
  private readonly api = inject(ApiService);

  getTopOpponents(limit: number): Observable<TopOpponentsResponse> {
    return this.api.get<TopOpponentsResponse>(`/lab/top-opponents?limit=${limit}`);
  }
}
