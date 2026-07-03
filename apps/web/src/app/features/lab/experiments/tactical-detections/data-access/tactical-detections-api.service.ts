import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import {
  TacticalDetectionListQuery,
  TacticalDetectionListResponse,
  TacticalDetectionRunRequest,
  TacticalDetectionRunResponse,
} from './tactical-detections.models';

function buildQuery(query: TacticalDetectionListQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.kind) params.set('kind', query.kind);
  params.set('limit', String(query.limit));
  return params.toString();
}

@Injectable()
export class TacticalDetectionsApiService {
  private readonly api = inject(ApiService);

  runDetection(request: TacticalDetectionRunRequest): Observable<TacticalDetectionRunResponse> {
    return this.api.post<TacticalDetectionRunResponse>('/lab/tactical-detections/run', request);
  }

  getDetections(query: TacticalDetectionListQuery): Observable<TacticalDetectionListResponse> {
    return this.api.get<TacticalDetectionListResponse>(`/lab/tactical-detections?${buildQuery(query)}`);
  }
}
