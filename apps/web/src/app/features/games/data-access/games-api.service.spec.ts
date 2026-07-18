import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { GamesApiService } from './games-api.service';

describe('GamesApiService', () => {
  let service: GamesApiService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({}));
    TestBed.configureTestingModule({
      providers: [GamesApiService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(GamesApiService);
  });

  it('serializes canonical criteria without openingNameExact or arbitrary fields', () => {
    service.searchGames({
      providers: ['LICHESS'],
      variant: ['standard', 'chess960'],
      openingEco: ['B20'],
      classification: ['BLUNDER'],
      minUserRating: 1400,
      sort: 'endedAtDesc',
      limit: 50,
    }).subscribe();

    const url = api.get.calls.mostRecent().args[0];
    expect(url).toBe(
      '/imported-games?providers=LICHESS&variant=chess960%2Cstandard&openingEco=B20&minUserRating=1400&classification=BLUNDER&sort=endedAtDesc&limit=50',
    );
    expect(url).not.toContain('openingNameExact');
  });

  it('adds a cursor only when loading a later page', () => {
    const criteria = { sort: 'endedAtDesc' as const, limit: 50 };

    service.searchGames(criteria).subscribe();
    expect(api.get.calls.mostRecent().args[0]).not.toContain('cursor=');

    service.searchGames(criteria, 'opaque-next-page').subscribe();
    expect(api.get.calls.mostRecent().args[0]).toContain('cursor=opaque-next-page');
  });
});
