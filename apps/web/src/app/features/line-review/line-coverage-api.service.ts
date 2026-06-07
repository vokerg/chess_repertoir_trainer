import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';

export type LineCoverageStatus =
  | 'MATCHED_LINE'
  | 'USER_DEVIATION'
  | 'OPPONENT_UNCOVERED'
  | 'LINE_ENDED'
  | 'NOT_REACHED'
  | 'UNINDEXED_GAME';

export interface LineCoverageGame {
  gameId: number;
  provider: string;
  providerGameId: string | null;
  providerUrl: string | null;
  endedAt: string | null;
  importedAt: string | null;
  userColor: 'WHITE' | 'BLACK' | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
  status: LineCoverageStatus;
  plyNumber: number | null;
  fenBefore: string | null;
  normalizedFenBefore: string | null;
  sideToMove: 'WHITE' | 'BLACK' | null;
  expectedMoveUci: string | null;
  expectedMoveUcis: string[];
  expectedMoveSans: string[];
  playedMoveUci: string | null;
  playedSan: string | null;
  matchedLineNodeId: number | null;
  parentLineNodeId: number | null;
}

export interface LineCoverageResponse {
  line: {
    id: number;
    chapterId: number;
    name: string;
    sideToTrain: 'WHITE' | 'BLACK';
    startingFen: string;
    repertoireUpdatedAt: string;
    hasMoves: boolean;
  };
  summary: {
    gamesSinceUpdate: number;
    indexedGamesSinceUpdate: number;
    reachedLine: number;
    matchedLine: number;
    userDeviations: number;
    opponentUncovered: number;
    lineEnded: number;
    notReached: number;
    unindexedGames: number;
  };
  deviations: LineCoverageGame[];
}

@Injectable({ providedIn: 'root' })
export class LineCoverageApiService {
  constructor(private api: ApiService) {}

  getLineCoverage(
    lineId: number,
    params: { status?: LineCoverageStatus; limit?: number; offset?: number } = {},
  ): Observable<LineCoverageResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.api.get<LineCoverageResponse>(`/lines/${lineId}/coverage${suffix}`);
  }
}
