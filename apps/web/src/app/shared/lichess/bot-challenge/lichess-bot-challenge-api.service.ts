import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface LichessBotChallengeOption {
  username: string;
  label: string;
}

export interface LichessBotChallengeOptionsResponse {
  bots: LichessBotChallengeOption[];
  defaultUsername: string;
}

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

export interface LichessBotChallengeResponse {
  challengeId: string | null;
  url: string | null;
  username: string;
  rawStatus?: string;
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
