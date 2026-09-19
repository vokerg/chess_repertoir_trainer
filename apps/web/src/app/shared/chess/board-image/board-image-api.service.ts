import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type { BoardImagePov, BoardImageTurn, BoardImageUrlResponse } from '@chess-trainer/contracts/board-images';

export type { BoardImagePov, BoardImageTurn, BoardImageUrlResponse } from '@chess-trainer/contracts/board-images';

@Injectable({ providedIn: 'root' })
export class BoardImageApiService {
  private readonly api = inject(ApiService);

  getUrl(fen: string, pov: BoardImagePov, turn: BoardImageTurn): Observable<BoardImageUrlResponse> {
    const params = new URLSearchParams({ fen, pov, turn });
    return this.api.get<BoardImageUrlResponse>(`/board-image-url?${params.toString()}`);
  }
}
