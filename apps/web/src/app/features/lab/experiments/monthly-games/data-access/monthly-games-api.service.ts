import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { MonthlyGamesResponse } from './monthly-games.models';

@Injectable()
export class MonthlyGamesApiService {
  private readonly api = inject(ApiService);

  getMonthlyGames(excludeBullet: boolean): Observable<MonthlyGamesResponse> {
    return this.api.get<MonthlyGamesResponse>(`/lab/monthly-games?excludeBullet=${excludeBullet}`);
  }
}
