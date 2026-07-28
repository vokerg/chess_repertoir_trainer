import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  PlayerChessProfileQuery,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import { ApiService } from '../../../core/api/api.service';
import type { PlayerChessProfileAccountOption } from './player-chess-profile.models';

@Injectable()
export class PlayerChessProfileApiService {
  private readonly api = inject(ApiService);

  getAccounts(): Observable<readonly PlayerChessProfileAccountOption[]> {
    return this.api.get<readonly PlayerChessProfileAccountOption[]>('/me/accounts');
  }

  getProfile(query: PlayerChessProfileQuery): Observable<PlayerChessProfileResponse> {
    const params = new URLSearchParams();
    if (query.accountIds?.length) params.set('accountIds', query.accountIds.join(','));
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    params.set('speedPreset', query.speedPreset);
    params.set('colors', query.colors.join(','));
    params.set('rated', String(query.rated));
    if (query.minUserRating !== undefined) params.set('minUserRating', String(query.minUserRating));
    if (query.maxUserRating !== undefined) params.set('maxUserRating', String(query.maxUserRating));
    if (query.minOpponentRating !== undefined) {
      params.set('minOpponentRating', String(query.minOpponentRating));
    }
    if (query.maxOpponentRating !== undefined) {
      params.set('maxOpponentRating', String(query.maxOpponentRating));
    }
    params.set('supportingGamesLimit', String(query.supportingGamesLimit));

    return this.api.get<PlayerChessProfileResponse>(`/player-chess-profile?${params.toString()}`);
  }
}
