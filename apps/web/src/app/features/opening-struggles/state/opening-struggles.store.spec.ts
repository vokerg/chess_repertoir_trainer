import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import { OpeningStrugglesApiService } from '../data-access/opening-struggles-api.service';
import { OpeningStrugglesStore } from './opening-struggles.store';

describe('OpeningStrugglesStore', () => {
  it('clears loaded rows when the analysis mode changes', async () => {
    const api = {
      getFacets: () => of(emptyImportedGameFacets()),
      getOpeningStruggles: () => of({
        totalFilteredGames: 5,
        indexedFilteredGames: 5,
        maxPly: 20,
        limit: 100,
        mode: 'results',
        items: [{ key: 'WHITE:e2e4' }],
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        OpeningStrugglesStore,
        { provide: OpeningStrugglesApiService, useValue: api },
      ],
    });
    const store = TestBed.inject(OpeningStrugglesStore);

    await store.load();
    expect(store.loaded()).toBeTrue();
    expect(store.items().length).toBe(1);

    store.updateCriteria('mode', 'repeatedMistakes');

    expect(store.loaded()).toBeFalse();
    expect(store.items()).toEqual([]);
    expect(store.totalFilteredGames()).toBe(0);
    expect(store.indexedFilteredGames()).toBe(0);
  });
});
