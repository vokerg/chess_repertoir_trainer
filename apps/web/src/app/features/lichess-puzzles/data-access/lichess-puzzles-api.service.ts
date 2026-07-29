import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CreateLichessPuzzleRoundBody,
  LichessPuzzleRound,
  SubmitLichessPuzzleMoveResponse,
} from '@chess-trainer/contracts/lichess-puzzles';
import { ApiService } from '../../../core/api/api.service';

@Injectable()
export class LichessPuzzlesApiService {
  private readonly api = inject(ApiService);

  createRound(input: CreateLichessPuzzleRoundBody): Observable<LichessPuzzleRound> {
    return this.api.post<LichessPuzzleRound>('/lichess-puzzles/rounds', input);
  }

  getRound(roundId: number): Observable<LichessPuzzleRound> {
    return this.api.get<LichessPuzzleRound>(`/lichess-puzzles/rounds/${roundId}`);
  }

  submitMove(roundId: number, moveUci: string): Observable<SubmitLichessPuzzleMoveResponse> {
    return this.api.post<SubmitLichessPuzzleMoveResponse>(
      `/lichess-puzzles/rounds/${roundId}/moves`,
      { moveUci },
    );
  }

  abandonRound(roundId: number): Observable<LichessPuzzleRound> {
    return this.api.post<LichessPuzzleRound>(`/lichess-puzzles/rounds/${roundId}/abandon`, {});
  }

  retrySync(roundId: number): Observable<LichessPuzzleRound> {
    return this.api.post<LichessPuzzleRound>(`/lichess-puzzles/rounds/${roundId}/retry-sync`, {});
  }
}
