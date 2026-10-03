import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { PositionAnalysisCacheService } from '../../../shared/chess/engine/position-analysis-cache.service';
import { GamesApiService } from '../data-access/games-api.service';
import type { ImportedGameDetail } from '../data-access/games.models';
import { GameDetailStore } from './game-detail.store';

describe('GameDetailStore', () => {
  let store: GameDetailStore;
  let submit: jasmine.Spy;
  let api: jasmine.SpyObj<GamesApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', [
      'getGame',
      'getAnalysis', 'getLibraries', 'setLiked', 'setMembership',
    ]);
    api.getGame.and.returnValue(NEVER);
    api.getLibraries.and.returnValue(of({ items: [] }));

    submit = jasmine.createSpy('submit').and.resolveTo({});
    const jobs = {
      terminalBatch: signal(null),
      pollVersion: signal(0),
      activeRunForGame: jasmine.createSpy('activeRunForGame').and.returnValue(null),
      submit,
    };
    const positionAnalysis = {
      state$: of({
        fen: '',
        running: false,
        ready: false,
        error: null,
        bestMove: null,
        lines: [],
      }),
      analyzeInteractiveRichPosition: jasmine.createSpy('analyzeInteractiveRichPosition'),
      seedForFen: jasmine.createSpy('seedForFen').and.returnValue(null),
      stop: jasmine.createSpy('stop'),
    };

    TestBed.configureTestingModule({
      providers: [
        GameDetailStore,
        { provide: GamesApiService, useValue: api },
        { provide: ImportedGameJobStore, useValue: jobs },
        { provide: PositionAnalysisCacheService, useValue: positionAnalysis },
      ],
    });
    store = TestBed.inject(GameDetailStore);
  });

  afterEach(() => store.ngOnDestroy());

  it('likes the viewed game without reloading or moving the replay', async () => {
    store.game.set(detail());
    store.selectedNodeId.set(12);
    const tree = store.tree();
    api.setLiked.and.returnValue(of({ success: true }));
    await store.toggleLike();
    expect(api.setLiked).toHaveBeenCalledOnceWith(77, true);
    expect(store.game()?.liked).toBeTrue();
    expect(store.selectedNodeId()).toBe(12);
    expect(store.tree()).toBe(tree);
    expect(api.getGame).not.toHaveBeenCalled();
  });

  it('adds and removes membership independently of likes and other libraries', async () => {
    store.game.set({ ...detail(), liked: true, libraryIds: [1, 2] });
    api.setMembership.and.returnValue(of({ success: true }));
    await store.toggleMembership(1);
    expect(store.game()?.libraryIds).toEqual([2]);
    expect(store.game()?.liked).toBeTrue();
    await store.toggleMembership(3);
    expect(store.game()?.libraryIds).toEqual([2, 3]);
  });

  it('keeps saved state on failure and allows retry', async () => {
    store.game.set(detail());
    api.setLiked.and.returnValue(throwError(() => new Error('Offline')));
    await store.toggleLike();
    expect(store.game()?.liked).toBeFalse();
    expect(store.collectionError()).toBe('Offline');
    expect(store.collectionSaving()).toBeFalse();
    api.setLiked.and.returnValue(of({ success: true }));
    await store.toggleLike();
    expect(store.game()?.liked).toBeTrue();
  });

  it('prevents duplicate writes and leaves a newly viewed game untouched', async () => {
    store.game.set(detail());
    const pending = new Subject<{ success: true }>();
    api.setLiked.and.returnValue(pending);
    const saving = store.toggleLike();
    await store.toggleLike();
    expect(api.setLiked).toHaveBeenCalledTimes(1);
    store.game.set({ ...detail(), id: 88 });
    pending.next({ success: true });
    pending.complete();
    await saving;
    expect(store.game()?.id).toBe(88);
    expect(store.game()?.liked).toBeFalse();
  });

  it('submits full refresh as a forced processing job', async () => {
    store.initialize(77);

    await store.fullRefreshGame();

    expect(submit).toHaveBeenCalledOnceWith('PROCESS_GAMES', [77], true);
  });
});

function detail(): ImportedGameDetail {
  // Only collection metadata is consumed by these mutation tests.
  return { id: 77, liked: false, libraryIds: [] } as unknown as ImportedGameDetail;
}
