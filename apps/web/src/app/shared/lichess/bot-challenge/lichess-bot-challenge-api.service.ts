import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  LichessBotChallengeOptionsResponse,
  LichessBotChallengeResponse,
} from '@chess-trainer/contracts/lichess';
import { ApiService } from '../../../core/api/api.service';

export type { LichessBotChallengeOption } from '@chess-trainer/contracts/lichess';

export interface LichessBotChallengeBody {
  username: string;
  fen: string;
  color: 'white' | 'black' | 'random';
  rated: false;
  clock?: {
    limit: number;
    increment: number;
  };
}

@Injectable()
export class LichessBotChallengeApiService {
  private readonly api = inject(ApiService);

  getOptions(): Observable<LichessBotChallengeOptionsResponse> {
    return this.api.get<LichessBotChallengeOptionsResponse>('/me/lichess/bot-challenge-options');
  }

  challengeBot(body: LichessBotChallengeBody): Observable<LichessBotChallengeResponse> {
    return this.api.post<LichessBotChallengeResponse>('/me/lichess/challenge-bot', body);
  }
}
