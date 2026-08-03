import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type { LibraryCatalogResponse } from './library.models';

@Injectable()
export class LibraryApiService {
  private readonly api = inject(ApiService);

  getCatalog(): Observable<LibraryCatalogResponse> {
    return this.api.get<LibraryCatalogResponse>('/library/catalog');
  }
}
