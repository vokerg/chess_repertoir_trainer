import type { GameLibrary, GameLibrariesResponse, GameLibraryMutationResponse } from '@chess-trainer/contracts/imported-games';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  GameTagDefinitionsResponse,
  ImportedGameAnalysisResponse,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameSearchResponse,
} from './games.models';
import {
  serializeImportedGameSearchQuery,
  type ImportedGameSearchCriteria,
} from '../../../shared/games/filters/imported-game-search-query.codec';

@Injectable({ providedIn: 'root' })
export class GamesApiService {
  private readonly api = inject(ApiService);

  getLibraries(): Observable<GameLibrariesResponse> {
    return this.api.get<GameLibrariesResponse>('/game-libraries');
  }

  createLibrary(name: string): Observable<GameLibrary> {
    return this.api.post<GameLibrary>('/game-libraries', { name });
  }

  renameLibrary(id: number, name: string): Observable<GameLibraryMutationResponse> {
    return this.api.patch<GameLibraryMutationResponse>(`/game-libraries/${id}`, { name });
  }

  deleteLibrary(id: number): Observable<GameLibraryMutationResponse> {
    return this.api.delete<GameLibraryMutationResponse>(`/game-libraries/${id}`);
  }

  setLiked(gameId: number, liked: boolean): Observable<GameLibraryMutationResponse> {
    return this.api.put<GameLibraryMutationResponse>(`/imported-games/${gameId}/like`, { liked });
  }

  setMembership(libraryId: number, gameId: number, included: boolean): Observable<GameLibraryMutationResponse> {
    const url = `/game-libraries/${libraryId}/games/${gameId}`;
    return included ? this.api.put<GameLibraryMutationResponse>(url, {}) : this.api.delete<GameLibraryMutationResponse>(url);
  }

  getGame(gameId: number): Observable<ImportedGameDetail> {
    return this.api.get<ImportedGameDetail>(`/imported-games/${gameId}`);
  }

  getAnalysis(gameId: number): Observable<ImportedGameAnalysisResponse> {
    return this.api.get<ImportedGameAnalysisResponse>(`/imported-games/${gameId}/analysis`);
  }

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  getGameTagDefinitions(): Observable<GameTagDefinitionsResponse> {
    return this.api.get<GameTagDefinitionsResponse>('/imported-games/tag-definitions');
  }

  searchGames(
    criteria: ImportedGameSearchCriteria,
    cursor?: string | null,
  ): Observable<ImportedGameSearchResponse> {
    const params = serializeImportedGameSearchQuery(criteria, { cursor });
    return this.api.get<ImportedGameSearchResponse>(`/imported-games?${params.toString()}`);
  }
}
