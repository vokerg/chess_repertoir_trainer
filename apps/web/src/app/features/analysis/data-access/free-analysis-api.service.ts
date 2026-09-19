import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface FreeAnalysisImportedGame {
  pgn?: string | null;
  userColor?: 'WHITE' | 'BLACK' | null;
}

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
export class FreeAnalysisApiService {
  private readonly api = inject(ApiService);

  getImportedGame(gameId: number): Observable<FreeAnalysisImportedGame> {
    return this.api.get<FreeAnalysisImportedGame>(`/imported-games/${gameId}`);
  }

  getLichessBotChallengeOptions(): Observable<LichessBotChallengeOptionsResponse> {
    return this.api.get<LichessBotChallengeOptionsResponse>('/me/lichess/bot-challenge-options');
  }

  challengeLichessBot(body: LichessBotChallengeBody): Observable<LichessBotChallengeResponse> {
    return this.api.post<LichessBotChallengeResponse>('/me/lichess/challenge-bot', body);
  }
}
