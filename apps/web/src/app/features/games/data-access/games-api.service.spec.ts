import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { GamesApiService } from './games-api.service';

describe('GamesApiService', () => {
  let service: GamesApiService;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put', 'patch', 'delete']);
    api.get.and.returnValue(of({}));
    TestBed.configureTestingModule({
      providers: [GamesApiService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(GamesApiService);
  });

  it('serializes liked and library filters and uses idempotent writes', () => {
    service.searchGames({ liked: true, libraryId: 7, sort: 'endedAtDesc', limit: 50 });
    expect(api.get.calls.mostRecent().args[0]).toContain('liked=true&libraryId=7');
    service.setLiked(9, true);
    expect(api.put).toHaveBeenCalledWith('/imported-games/9/like', { liked: true });
    service.setMembership(7, 9, true);
    expect(api.put).toHaveBeenCalledWith('/game-libraries/7/games/9', {});
    service.setMembership(7, 9, false);
    expect(api.delete).toHaveBeenCalledWith('/game-libraries/7/games/9');
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
