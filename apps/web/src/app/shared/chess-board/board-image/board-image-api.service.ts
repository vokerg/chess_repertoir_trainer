import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';

export type BoardImagePov = 'white' | 'black';
export type BoardImageTurn = 'none' | 'auto' | 'white' | 'black';
export interface BoardImageUrlResponse {
  url: string;
  fen: string;
  normalizedFen: string;
  pov: BoardImagePov;
  turn: Exclude<BoardImageTurn, 'auto'>;
}

@Injectable({ providedIn: 'root' })
export class BoardImageApiService {
  private readonly api = inject(ApiService);

  getUrl(fen: string, pov: BoardImagePov, turn: BoardImageTurn): Observable<BoardImageUrlResponse> {
    const params = new URLSearchParams({ fen, pov, turn });
    return this.api.get<BoardImageUrlResponse>(`/board-image-url?${params.toString()}`);
  }
}
