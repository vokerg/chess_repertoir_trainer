import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import { gamesExplorerLinkQueryParams } from '../../../shared/games/navigation/games-explorer-link.helper';
import { GamesApiService } from '../data-access/games-api.service';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { GamesExplorerStore } from '../state/games-explorer.store';
import { GamesExplorerPageComponent } from './games-explorer-page.component';

describe('GamesExplorerPageComponent', () => {
  let fixture: ComponentFixture<GamesExplorerPageComponent>;
  let store: GamesExplorerStore;
  let api: jasmine.SpyObj<GamesApiService>;
  let router: jasmine.SpyObj<Router>;
  let queryParamMap: BehaviorSubject<ParamMap>;
  let snapshotParamMap: ParamMap;

  beforeEach(async () => {
    queryParamMap = new BehaviorSubject(convertToParamMap({}));
    snapshotParamMap = queryParamMap.value;
    queryParamMap.subscribe((params) => snapshotParamMap = params);
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', [
      'getFacets',
      'searchGames',
    ]);
    api.getFacets.and.returnValue(of(emptyImportedGameFacets()));
    api.searchGames.and.returnValue(of({
      items: [],
      pageInfo: { nextCursor: null, hasMore: false },
      appliedFilters: { sort: 'endedAtDesc', limit: 50 },
    }));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [GamesExplorerPageComponent],
      providers: [
        { provide: GamesApiService, useValue: api },        {
          provide: ImportedGameJobStore,
          useValue: {
            terminalBatch: signal(null),
            settledGameBatch: signal(null),
            submit: jasmine.createSpy('submit'),
            isGameActive: jasmine.createSpy('isGameActive').and.returnValue(false),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap.asObservable(),
            snapshot: { get queryParamMap() { return snapshotParamMap; } },
          },
        },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GamesExplorerPageComponent);
    store = fixture.debugElement.injector.get(GamesExplorerStore);
    fixture.detectChanges();
  });

  it('loads facets once and refreshes once per distinct canonical route state', () => {
    expect(api.getFacets).toHaveBeenCalledTimes(1);
    expect(api.searchGames).toHaveBeenCalledTimes(1);

    queryParamMap.next(convertToParamMap({ arbitrary: 'ignored' }));
    expect(api.searchGames).toHaveBeenCalledTimes(1);

    queryParamMap.next(convertToParamMap({
      filterMode: 'explicit',
      providers: 'LICHESS',
    }));
    expect(api.searchGames).toHaveBeenCalledTimes(2);
    expect(store.appliedQuery().providers).toEqual(['LICHESS']);

    queryParamMap.next(convertToParamMap({}));
    expect(api.searchGames).toHaveBeenCalledTimes(3);
    expect(store.filters().speedCategory).toBe('blitz,rapid');
  });

  it('Apply updates the URL without loading until the route emits', () => {
    const filters = store.filters();
    store.setFilters({ ...filters, opponent: 'Carlsen' });
    api.searchGames.calls.reset();

    callApply(fixture.componentInstance);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/games'], {
      queryParams: gamesExplorerLinkQueryParams(store.draftQuery()),
    });
    expect(api.searchGames).not.toHaveBeenCalled();

    queryParamMap.next(convertToParamMap(gamesExplorerLinkQueryParams(store.draftQuery())));
    expect(api.searchGames).toHaveBeenCalledTimes(1);
  });

  it('Apply manually refreshes once when the URL already matches the draft', () => {
    const params = gamesExplorerLinkQueryParams(store.draftQuery());
    queryParamMap.next(convertToParamMap(params));
    api.searchGames.calls.reset();
    router.navigate.calls.reset();

    callApply(fixture.componentInstance);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(api.searchGames).toHaveBeenCalledTimes(1);
  });

  it('Reset navigates to plain /games', () => {
    queryParamMap.next(convertToParamMap({ filterMode: 'explicit', variant: 'standard' }));
    router.navigate.calls.reset();

    callReset(fixture.componentInstance);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/games']);
  });
});

function callApply(component: GamesExplorerPageComponent): void {
  (component as unknown as { applyFilters(): void }).applyFilters();
}

function callReset(component: GamesExplorerPageComponent): void {
  (component as unknown as { resetFilters(): void }).resetFilters();
}
