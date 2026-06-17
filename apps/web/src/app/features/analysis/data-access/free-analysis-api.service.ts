import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface FreeAnalysisImportedGame {
  pgn?: string | null;
  userColor?: 'WHITE' | 'BLACK' | null;
}

@Injectable()
export class FreeAnalysisApiService {
  private readonly api = inject(ApiService);

  getImportedGame(gameId: number): Observable<FreeAnalysisImportedGame> {
    return this.api.get<FreeAnalysisImportedGame>(`/imported-games/${gameId}`);
  }
}
