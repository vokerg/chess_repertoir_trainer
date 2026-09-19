import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { PositionAnalysisCacheService } from '../../../shared/chess/engine/position-analysis-cache.service';
import { GamesApiService } from '../data-access/games-api.service';
import { GameDetailStore } from './game-detail.store';

describe('GameDetailStore', () => {
  let store: GameDetailStore;
  let submit: jasmine.Spy;

  beforeEach(() => {
    const api = jasmine.createSpyObj<GamesApiService>('GamesApiService', [
      'getGame',
      'getAnalysis',
    ]);
    api.getGame.and.returnValue(NEVER);

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

  it('submits full refresh as a forced processing job', async () => {
    store.initialize(77);

    await store.fullRefreshGame();

    expect(submit).toHaveBeenCalledOnceWith('PROCESS_GAMES', [77], true);
  });
});
