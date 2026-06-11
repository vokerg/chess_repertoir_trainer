import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { OpeningAnalysisFacets, OpeningAnalysisResponse } from './opening-analysis.models';

@Injectable()
export class OpeningAnalysisApiService {
  private readonly api = inject(ApiService);

  getFacets(): Observable<OpeningAnalysisFacets> {
    return this.api.get<OpeningAnalysisFacets>('/imported-games/facets');
  }

  getAnalysis(query: string): Observable<OpeningAnalysisResponse> {
    return this.api.get<OpeningAnalysisResponse>(`/opening-analysis${query}`);
  }
}
