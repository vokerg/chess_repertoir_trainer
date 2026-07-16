import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { PositionAnalysisCacheService } from '../../../shared/chess/engine/position-analysis-cache.service';
import type { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { PositionGameMovesApiService } from '../../../shared/games/position-moves/position-game-moves-api.service';
import { FreeAnalysisApiService } from '../data-access/free-analysis-api.service';
import { FreeAnalysisStore } from './free-analysis.store';

describe('FreeAnalysisStore', () => {
  it('defaults Masters to closed and toggles its visibility locally', () => {
    const engine = new BehaviorSubject<EngineAnalysis>({
      fen: '',
      running: false,
      ready: false,
      error: null,
      bestMove: null,
      lines: [],
    });
    const positionAnalysis = jasmine.createSpyObj<PositionAnalysisCacheService>(
      'PositionAnalysisCacheService',
      ['analyzeInteractiveRichPosition', 'stop'],
      { state$: engine.asObservable() },
    );

    TestBed.configureTestingModule({
      providers: [
        FreeAnalysisStore,
        { provide: PositionAnalysisCacheService, useValue: positionAnalysis },
        {
          provide: FreeAnalysisApiService,
          useValue: jasmine.createSpyObj<FreeAnalysisApiService>('FreeAnalysisApiService', [
            'getImportedGame',
          ]),
        },
        {
          provide: PositionGameMovesApiService,
          useValue: jasmine.createSpyObj<PositionGameMovesApiService>(
            'PositionGameMovesApiService',
            ['getFacets', 'getAnalysis', 'getTopGames'],
          ),
        },
      ],
    });

    const store = TestBed.inject(FreeAnalysisStore);

    expect(store.mastersOpen()).toBeFalse();
    store.toggleMasters();
    expect(store.mastersOpen()).toBeTrue();
  });
});
