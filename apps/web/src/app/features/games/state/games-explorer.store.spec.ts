import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GamesApiService } from '../data-access/games-api.service';
import { ImportedGameAnalysisService } from '../data-access/imported-game-analysis.service';
import { ImportedGameListItem } from '../data-access/games.models';
import { GamesExplorerStore } from './games-explorer.store';

describe('GamesExplorerStore', () => {
  let store: GamesExplorerStore;
  let api: jasmine.SpyObj<GamesApiService>;
  let analysis: jasmine.SpyObj<ImportedGameAnalysisService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', ['indexPlies', 'searchGames']);
    analysis = jasmine.createSpyObj<ImportedGameAnalysisService>('ImportedGameAnalysisService', ['analyzeGame']);

    TestBed.configureTestingModule({
      providers: [
        GamesExplorerStore,
        { provide: GamesApiService, useValue: api },
        { provide: ImportedGameAnalysisService, useValue: analysis },
      ],
    });
    store = TestBed.inject(GamesExplorerStore);
    store.games.set([game(1), game(2)]);
  });

  it('patches one indexed row without reloading or replacing the other row', () => {
    const untouched = store.games()[1];
    api.indexPlies.and.returnValue(of({
      importedGameId: 1,
      status: 'INDEXED',
      plyIndexedAt: '2026-06-07T12:00:00.000Z',
    }));

    store.indexPlies(store.games()[0]);

    expect(store.games()[0].plyIndex).toEqual(jasmine.objectContaining({
      status: 'INDEXED',
      indexedAt: '2026-06-07T12:00:00.000Z',
      error: null,
    }));
    expect(store.games()[1]).toBe(untouched);
    expect(api.searchGames).not.toHaveBeenCalled();
  });

  it('records an indexing failure with immutable nested state', () => {
    const original = store.games()[0];
    const originalPlyIndex = original.plyIndex;
    api.indexPlies.and.returnValue(throwError(() => new Error('Index failed')));

    store.indexPlies(original);

    expect(store.games()[0]).not.toBe(original);
    expect(store.games()[0].plyIndex).not.toBe(originalPlyIndex);
    expect(store.games()[0].plyIndex).toEqual(jasmine.objectContaining({
      status: 'FAILED',
      error: 'Index failed',
    }));
    expect(originalPlyIndex.status).toBe('NOT_INDEXED');
  });

  it('marks analysis complete without clearing or reloading the list', async () => {
    const untouched = store.games()[1];
    analysis.analyzeGame.and.resolveTo({});

    store.analyse(store.games()[0]);
    await Promise.resolve();

    expect(store.games().length).toBe(2);
    expect(store.games()[0].analysis.status).toBe('COMPLETED');
    expect(store.games()[1]).toBe(untouched);
    expect(api.searchGames).not.toHaveBeenCalled();
  });
});

function game(id: number): ImportedGameListItem {
  return {
    id,
    accountId: 10,
    provider: 'LICHESS',
    providerGameId: `game-${id}`,
    timeControl: {},
    tagCodes: [],
    tags: [],
    plyIndex: { status: 'NOT_INDEXED', error: null },
    analysis: { status: 'NOT_ANALYZED' },
  };
}
