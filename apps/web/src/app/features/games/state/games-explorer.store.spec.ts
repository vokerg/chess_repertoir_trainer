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
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', ['indexPlies', 'refreshGameTags', 'searchGames']);
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

  it('refreshes tags for visible rows without reloading the list', async () => {
    const untouchedPlyIndex = store.games()[1].plyIndex;
    api.refreshGameTags.and.callFake((gameId: number) => of({
      importedGameId: gameId,
      tagCodes: [gameId],
      tags: [{ code: gameId, name: `Tag ${gameId}` }],
    }));

    await store.refreshTagsForVisibleGames();

    expect(store.games()[0].tagCodes).toEqual([1]);
    expect(store.games()[0].tags).toEqual([{ code: 1, name: 'Tag 1' }]);
    expect(store.games()[1].tagCodes).toEqual([2]);
    expect(store.games()[1].tags).toEqual([{ code: 2, name: 'Tag 2' }]);
    expect(store.games()[1].plyIndex).toBe(untouchedPlyIndex);
    expect(store.bulkRefreshingTags()).toBeFalse();
    expect(store.bulkRefreshTagsCompleted()).toBe(2);
    expect(api.searchGames).not.toHaveBeenCalled();
  });

  it('skips bulk tag refresh for rows that already have at least three tags', async () => {
    store.games.set([
      game(1),
      game(2, [
        { code: 20, name: 'Tag 20' },
        { code: 21, name: 'Tag 21' },
        { code: 22, name: 'Tag 22' },
      ]),
    ]);
    api.refreshGameTags.and.returnValue(of({
      importedGameId: 1,
      tagCodes: [10],
      tags: [{ code: 10, name: 'Needs review' }],
    }));

    await store.refreshTagsForVisibleGames();

    expect(api.refreshGameTags).toHaveBeenCalledOnceWith(1);
    expect(store.games()[0].tagCodes).toEqual([10]);
    expect(store.games()[1].tagCodes).toEqual([20, 21, 22]);
    expect(store.games()[1].tags).toEqual([
      { code: 20, name: 'Tag 20' },
      { code: 21, name: 'Tag 21' },
      { code: 22, name: 'Tag 22' },
    ]);
    expect(store.bulkRefreshTagsTotal()).toBe(2);
    expect(store.bulkRefreshTagsCompleted()).toBe(2);
  });

  it('keeps successful tag patches and records the first bulk refresh failure', async () => {
    api.refreshGameTags.and.callFake((gameId: number) => {
      if (gameId === 2) return throwError(() => new Error('Tag refresh failed'));
      return of({
        importedGameId: gameId,
        tagCodes: [10],
        tags: [{ code: 10, name: 'Needs review' }],
      });
    });

    await store.refreshTagsForVisibleGames();

    expect(store.games()[0].tagCodes).toEqual([10]);
    expect(store.games()[1].tagCodes).toEqual([]);
    expect(store.error()).toBe('Tag refresh failed');
    expect(store.bulkRefreshingTags()).toBeFalse();
    expect(store.bulkRefreshTagsCompleted()).toBe(2);
  });
});

function game(id: number, tags: ImportedGameListItem['tags'] = []): ImportedGameListItem {
  return {
    id,
    accountId: 10,
    provider: 'LICHESS',
    providerGameId: `game-${id}`,
    timeControl: {},
    tagCodes: tags.map((tag) => tag.code),
    tags,
    plyIndex: { status: 'NOT_INDEXED', error: null },
    analysis: { status: 'NOT_ANALYZED' },
  };
}
