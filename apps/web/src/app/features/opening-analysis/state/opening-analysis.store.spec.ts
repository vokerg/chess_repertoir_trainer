import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { PositionAnalysisCacheService } from '../../../shared/chess/engine/position-analysis-cache.service';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import { PositionGameMovesApiService } from '../../../shared/games/position-moves/position-game-moves-api.service';
import {
  OpeningAnalysisPerformanceResponse,
  OpeningAnalysisResponse,
  OpeningAnalysisTopGamesResponse,
} from '../../../shared/games/position-moves/position-game-moves.models';
import { OpeningAnalysisStore } from './opening-analysis.store';

const EMPTY_ENGINE: EngineAnalysis = {
  fen: '',
  running: false,
  ready: false,
  error: null,
  bestMove: null,
  lines: [],
};

describe('OpeningAnalysisStore', () => {
  let store: OpeningAnalysisStore;
  let api: jasmine.SpyObj<PositionGameMovesApiService>;
  let positionAnalysis: jasmine.SpyObj<PositionAnalysisCacheService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<PositionGameMovesApiService>('PositionGameMovesApiService', [
      'getFacets',
      'getAnalysis',
      'getPerformance',
      'getTopGames',
    ]);
    positionAnalysis = jasmine.createSpyObj<PositionAnalysisCacheService>(
      'PositionAnalysisCacheService',
      ['analyzeInteractiveRichPosition', 'stop'],
      { state$: new BehaviorSubject<EngineAnalysis>(EMPTY_ENGINE).asObservable() },
    );

    api.getFacets.and.returnValue(of(emptyImportedGameFacets()));
    api.getAnalysis.and.returnValue(of(coreResponse('startpos', 1)));
    api.getPerformance.and.returnValue(of(performanceResponse('startpos', 1)));
    api.getTopGames.and.returnValue(of(topGamesResponse('startpos', 1)));

    TestBed.configureTestingModule({
      providers: [
        OpeningAnalysisStore,
        { provide: PositionGameMovesApiService, useValue: api },
        { provide: PositionAnalysisCacheService, useValue: positionAnalysis },
      ],
    });
    store = TestBed.inject(OpeningAnalysisStore);
  });

  it('loads core first and secondary panels independently', async () => {
    await store.refresh();

    expect(api.getAnalysis).toHaveBeenCalledTimes(1);
    expect(api.getPerformance).toHaveBeenCalledTimes(1);
    expect(api.getTopGames).toHaveBeenCalledTimes(1);
    expect(store.analysis()?.nextMoves[0].moveUci).toBe('e2e4');
    expect(store.performance()?.sample.games).toBe(1);
    expect(store.topGames()[0].id).toBe(1);
    expect(positionAnalysis.analyzeInteractiveRichPosition).toHaveBeenCalledWith(store.currentFen());
  });

  it('does not let stale core or panel responses overwrite newer state', async () => {
    const firstCore = deferred<OpeningAnalysisResponse>();
    const firstPerformance = deferred<OpeningAnalysisPerformanceResponse>();
    const firstTopGames = deferred<OpeningAnalysisTopGamesResponse>();
    const secondCore = deferred<OpeningAnalysisResponse>();
    const secondPerformance = deferred<OpeningAnalysisPerformanceResponse>();
    const secondTopGames = deferred<OpeningAnalysisTopGamesResponse>();

    api.getAnalysis.and.returnValues(firstCore.observable, secondCore.observable);
    api.getPerformance.and.returnValues(firstPerformance.observable, secondPerformance.observable);
    api.getTopGames.and.returnValues(firstTopGames.observable, secondTopGames.observable);

    const firstRefresh = store.refresh();
    const secondRefresh = store.refresh();

    firstCore.next(coreResponse('stale', 1));
    firstPerformance.next(performanceResponse('stale', 1));
    firstTopGames.next(topGamesResponse('stale', 1));
    await Promise.resolve();

    secondCore.next(coreResponse('fresh', 2));
    secondPerformance.next(performanceResponse('fresh', 2));
    secondTopGames.next(topGamesResponse('fresh', 2));
    await Promise.all([firstRefresh, secondRefresh]);

    expect(store.analysis()?.fen).toBe('fresh');
    expect(store.performance()?.sample.games).toBe(2);
    expect(store.topGames()[0].id).toBe(2);
  });
});

function coreResponse(fen: string, id: number): OpeningAnalysisResponse {
  return {
    fen,
    normalizedFen: fen,
    bookOpening: null,
    sideToMove: 'WHITE',
    fullMoveNumber: 1,
    ratedOnly: true,
    occurrences: id,
    games: { total: id, wins: id, draws: 0, losses: 0, scorePct: 100 },
    nextMoves: [{
      moveUci: 'e2e4',
      moveSan: 'e4',
      fenAfter: 'after',
      side: 'WHITE',
      moveNumber: 1,
      occurrences: id,
      games: { total: id, wins: id, draws: 0, losses: 0, scorePct: 100 },
    }],
    appliedFilters: {},
  };
}

function performanceResponse(fen: string, games: number): OpeningAnalysisPerformanceResponse {
  return {
    fen,
    normalizedFen: fen,
    performance: {
      sample: { games, taggedGames: 0 },
      wdl: { total: games, wins: games, draws: 0, losses: 0, scorePct: 100 },
      tags: [],
      buckets: [],
    },
    appliedFilters: {},
  };
}

function topGamesResponse(fen: string, id: number): OpeningAnalysisTopGamesResponse {
  return {
    fen,
    normalizedFen: fen,
    topGames: [{
      id,
      provider: 'LICHESS',
      providerGameId: `game-${id}`,
      timeControl: {},
      white: {},
      black: {},
      opening: {},
      plyNumber: 1,
      moveNumber: 1,
      nextMoveUci: 'e2e4',
    }],
    appliedFilters: {},
  };
}

function deferred<T>() {
  let observer: { next: (value: T) => void; complete: () => void } | null = null;
  const observable = new Observable<T>((subscriber) => {
    observer = {
      next: (value) => {
        subscriber.next(value);
        subscriber.complete();
      },
      complete: () => subscriber.complete(),
    };
  });
  return {
    observable,
    next(value: T) {
      observer?.next(value);
      observer?.complete();
    },
  };
}
