import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { StatsSummary } from './stats.models';

@Injectable()
export class StatsApiService {
  private readonly api = inject(ApiService);
  getSummary(): Observable<StatsSummary> { return this.api.get<StatsSummary>('/stats/summary'); }
}
