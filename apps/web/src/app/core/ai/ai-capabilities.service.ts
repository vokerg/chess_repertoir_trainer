import { inject, Injectable } from '@angular/core';
import type { AiCapabilitiesResponse } from '@chess-trainer/contracts/ai';
import { catchError, Observable, of, shareReplay } from 'rxjs';
import { ApiService } from '../api/api.service';

@Injectable({ providedIn: 'root' })
export class AiCapabilitiesService {
  private readonly api = inject(ApiService);
  private readonly capabilities$ = this.api.get<AiCapabilitiesResponse>('/ai/capabilities').pipe(
    catchError(() => of<AiCapabilitiesResponse>({ widgets: { gameReview: false } })),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  getCapabilities(): Observable<AiCapabilitiesResponse> {
    return this.capabilities$;
  }
}
