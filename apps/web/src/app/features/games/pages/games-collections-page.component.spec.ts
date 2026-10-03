import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import { GamesApiService } from '../data-access/games-api.service';
import { GamesExplorerStore } from '../state/games-explorer.store';
import { GamesExplorerPageComponent } from './games-explorer-page.component';

describe('Games collection routes', () => {
  let api: jasmine.SpyObj<GamesApiService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('GamesApiService', ['getLibraries', 'getFacets', 'searchGames', 'createLibrary']);
    api.getLibraries.and.returnValue(of({ items: [{ id: 7, name: 'Endgames', gameCount: 0 }] }));
    api.getFacets.and.returnValue(of(emptyImportedGameFacets()));
    api.searchGames.and.returnValue(of({ items: [], pageInfo: { hasMore: false, nextCursor: null }, appliedFilters: { sort: 'endedAtDesc', limit: 50 } }));
    api.createLibrary.and.returnValue(of({ id: 8, name: 'Study', gameCount: 0 }));
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: 'games/liked', component: GamesExplorerPageComponent, data: { gameCollection: 'liked' } },
        { path: 'games/libraries', component: GamesExplorerPageComponent, data: { gameCollection: 'libraries' } },
      ]),
      { provide: GamesApiService, useValue: api },
      { provide: ImportedGameJobStore, useValue: { terminalBatch: signal(null), settledGameBatch: signal(null), isGameActive: () => false } },
    ] });
  });

  it('shows all liked games without implicit date or speed filters, including after reset', async () => {
    const harness = await RouterTestingHarness.create('/games/liked?liked=false');
    const store = harness.routeDebugElement!.injector.get(GamesExplorerStore);
    expect(store.appliedQuery()).toEqual({ liked: true, sort: 'endedAtDesc', limit: 50 });
    const page = harness.routeDebugElement!.componentInstance as GamesExplorerPageComponent;
    (page as unknown as { resetFilters(): void }).resetFilters();
    await harness.fixture.whenStable();
    expect(store.appliedQuery().liked).toBeTrue();
    expect(store.appliedQuery().from).toBeUndefined();
  });

  it('loads only library metadata on the manager and supports creating a library', async () => {
    const harness = await RouterTestingHarness.create('/games/libraries');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(api.searchGames).not.toHaveBeenCalled();
    const input = harness.routeNativeElement!.querySelector('input[name="name"]') as HTMLInputElement;
    input.value = 'Study';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    const form = harness.routeNativeElement!.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(api.createLibrary).toHaveBeenCalledWith('Study');
    expect(harness.routeNativeElement!.textContent).toContain('Study');
    expect(input.value).toBe('');
  });

  it('restores library selection from the URL without default filters', async () => {
    const harness = await RouterTestingHarness.create('/games/libraries?libraryId=7');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(api.searchGames).toHaveBeenCalledWith({ libraryId: 7, sort: 'endedAtDesc', limit: 50 }, undefined);
    expect(harness.routeNativeElement!.querySelector('a[aria-current="page"]')?.textContent).toContain('Endgames');
  });
});
