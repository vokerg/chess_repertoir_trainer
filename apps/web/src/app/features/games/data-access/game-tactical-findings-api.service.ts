import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export type GameTacticalFindingKind = 'MISSED_SHOT' | 'PUNISHED_OPPONENT_BLUNDER' | 'USER_BLUNDER';

export interface GameTacticalFinding {
  id: number;
  importedGameId: number;
  kind: GameTacticalFindingKind;
  triggerPlyNumber: number;
  userReplyPlyNumber: number | null;
  moveUci: string;
  bestMoveUci: string | null;
  swingCp: number | null;
}

interface TacticalFindingResponse {
  items: GameTacticalFinding[];
}

@Injectable()
export class GameTacticalFindingsApiService {
  private readonly api = inject(ApiService);

  getForGame(gameId: number): Observable<GameTacticalFinding[]> {
    return this.api
      .get<TacticalFindingResponse>(`/lab/tactical-detections?gameId=${gameId}&limit=200`)
      .pipe(map((response) => response.items));
  }
}
