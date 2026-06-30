import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  COMPACT_GAME_ANALYSIS_DEPTH,
  COMPACT_GAME_MULTIPV,
  DEFAULT_INTERACTIVE_MULTIPV,
  firstUciMove,
  PositionAnalysisCacheService,
  RICH_INTERACTIVE_CACHE_MIN_DEPTH,
  RICH_INTERACTIVE_ANALYSIS_DEPTH,
} from './position-analysis-cache.service';
import { EngineAnalysis } from './stockfish-analysis.service';

describe('PositionAnalysisCacheService', () => {
  let service: PositionAnalysisCacheService;
  let api: { get: jasmine.Spy; post: jasmine.Spy };
  let stockfish: {
    state$: BehaviorSubject<EngineAnalysis>;
    analyze: jasmine.Spy;
    analyzeOnce: jasmine.Spy;
    stop: jasmine.Spy;
    shutdownWorker: jasmine.Spy;
  };

  beforeEach(() => {
    api = {
      get: jasmine.createSpy('get').and.returnValue(of({ positionAnalysis: null })),
      post: jasmine.createSpy('post').and.returnValue(of({ positionAnalyses: [], positionAnalysis: null })),
    };
    stockfish = {
      state$: new BehaviorSubject<EngineAnalysis>({ fen: '', running: false, ready: false, error: null, bestMove: null, lines: [] }),
      analyze: jasmine.createSpy('analyze'),
      analyzeOnce: jasmine.createSpy('analyzeOnce'),
      stop: jasmine.createSpy('stop'),
      shutdownWorker: jasmine.createSpy('shutdownWorker'),
    };
    service = new PositionAnalysisCacheService(api as any, stockfish as any);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('extracts one legal UCI move from polluted move strings', () => {
    expect(firstUciMove('e2e4 e7e5 g1f3')).toBe('e2e4');
    expect(firstUciMove('E7E8Q')).toBe('e7e8q');
    expect(firstUciMove('not-a-move')).toBeNull();
  });

  it('omits lines for compact store requests and includes them for rich requests', () => {
    const position = {
      fen: '8/8/8/8/8/8/4K3/6k1 w - - 0 1',
      bestMoveUci: 'e2e3 e7e5',
      bestScoreCpWhite: 25,
      bestMateWhite: null,
      lines: [{ multipv: 1, depth: 12, moveUci: 'e2e3', scoreCpWhite: 25, pvUci: ['e2e3'] }],
    };

    const compact = (service as any).toStoreRequest(position.fen, position, 'compact');
    const rich = (service as any).toStoreRequest(position.fen, position, 'rich');

    expect(compact).toEqual(jasmine.objectContaining({
      fen: position.fen,
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 25,
      bestMateWhite: null,
      persistenceMode: 'compact',
    }));
    expect(compact.lines).toBeUndefined();
    expect(rich.lines).toEqual(position.lines);
    expect(rich.persistenceMode).toBe('rich');
  });

  it('uses compact remote rows for best-eval but not for line-required analysis', () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const compactPosition = {
      normalizedFen: '8/8/8/8/8/8/4K3/6k1 w - -',
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 25,
      bestMateWhite: null,
      lines: [],
    };

    expect((service as any).usablePosition(compactPosition, fen, 1, 12, 'best-eval')).toBe(compactPosition);
    expect((service as any).usablePosition(compactPosition, fen, 1, RICH_INTERACTIVE_CACHE_MIN_DEPTH, 'lines')).toBeNull();
  });

  it('does not let a compact pending save replace a rich pending save', () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const compact = { fen, bestMoveUci: 'e2e3', bestScoreCpWhite: 10, bestMateWhite: null, lines: [] };
    const rich = {
      fen,
      bestMoveUci: 'e2e4',
      bestScoreCpWhite: 20,
      bestMateWhite: null,
      lines: [{ multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 20, pvUci: ['e2e4'] }],
    };

    (service as any).enqueueBackgroundSave(fen, rich, 'rich');
    (service as any).enqueueBackgroundSave(fen, compact, 'compact');

    const pending = Array.from((service as any).pendingBulkSaves.values())[0] as any;
    expect(pending.persistenceMode).toBe('rich');
    expect(pending.positionAnalysis.bestMoveUci).toBe('e2e4');
  });

  it('analyzeInteractiveRichPosition uses rich profile and calls Stockfish with depth 18 / multipv 3', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();

    expect(stockfish.analyze).toHaveBeenCalledWith(fen, jasmine.objectContaining({
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    }));
  });

  it('completed rich interactive analysis POSTs rich storage with 3 lines', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    api.post.and.returnValue(of({
      positionAnalysis: richPosition(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH),
    }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();
    stockfish.state$.next(engineAnalysis(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH));
    await flushAsync();

    expect(api.post).toHaveBeenCalledWith('/position-analysis/store', jasmine.objectContaining({
      fen,
      persistenceMode: 'rich',
      lines: jasmine.arrayWithExactContents([
        jasmine.objectContaining({ multipv: 1, depth: RICH_INTERACTIVE_ANALYSIS_DEPTH }),
        jasmine.objectContaining({ multipv: 2, depth: RICH_INTERACTIVE_ANALYSIS_DEPTH }),
        jasmine.objectContaining({ multipv: 3, depth: RICH_INTERACTIVE_ANALYSIS_DEPTH }),
      ]),
    }));
  });

  it('completed rich interactive analysis persists when secondary MultiPV lines lag the best-line depth', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    api.post.and.returnValue(of({
      positionAnalysis: variedDepthRichPosition(fen, [RICH_INTERACTIVE_ANALYSIS_DEPTH, 15, 14]),
    }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();
    stockfish.state$.next(engineAnalysisWithDepths(fen, [RICH_INTERACTIVE_ANALYSIS_DEPTH, 15, 14]));
    await flushAsync();

    expect(api.post).toHaveBeenCalledWith('/position-analysis/store', jasmine.objectContaining({
      fen,
      persistenceMode: 'rich',
      lines: jasmine.arrayWithExactContents([
        jasmine.objectContaining({ multipv: 1, depth: RICH_INTERACTIVE_ANALYSIS_DEPTH }),
        jasmine.objectContaining({ multipv: 2, depth: 15 }),
        jasmine.objectContaining({ multipv: 3, depth: 14 }),
      ]),
    }));
  });

  it('shallow running partial analysis does not POST rich storage', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();
    stockfish.state$.next({
      ...engineAnalysis(fen, 12),
      running: true,
      ready: false,
    });
    await flushAsync();

    expect(api.post).not.toHaveBeenCalledWith('/position-analysis/store', jasmine.anything());
  });

  it('stop does not persist shallow rich partials as completed results', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();
    stockfish.state$.next({
      ...engineAnalysis(fen, 14),
      running: false,
      ready: true,
    });
    service.stop();
    await flushAsync();

    expect(api.post).not.toHaveBeenCalledWith('/position-analysis/store', jasmine.anything());
  });

  it('failed interactive POST logs console.warn and keeps the pending save', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const error = new Error('store failed');
    const warnSpy = spyOn(console, 'warn');
    api.post.and.returnValue(throwError(() => error));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();
    stockfish.state$.next(engineAnalysis(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH));
    await flushAsync();

    expect(warnSpy).toHaveBeenCalledWith('Interactive position-analysis save failed.', jasmine.objectContaining({
      fen,
      persistenceMode: 'rich',
      error,
    }));
    expect((service as any).pendingInteractiveSave).toEqual(jasmine.objectContaining({ fen }));
    (service as any).pendingInteractiveSave = null;
  });

  it('getOrAnalyzeCompactGamePosition uses compact profile, omits lines, and uses background persistence', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    stockfish.analyzeOnce.and.resolveTo(engineAnalysis(fen, COMPACT_GAME_ANALYSIS_DEPTH));
    api.post.and.returnValue(of({
      positionAnalyses: [richPosition(fen, COMPACT_GAME_ANALYSIS_DEPTH)],
      positionAnalysis: richPosition(fen, COMPACT_GAME_ANALYSIS_DEPTH),
    }));

    await service.getOrAnalyzeCompactGamePosition(fen, { keepAlive: true });

    expect(stockfish.analyzeOnce).toHaveBeenCalledWith(fen, jasmine.objectContaining({
      depth: COMPACT_GAME_ANALYSIS_DEPTH,
      multipv: COMPACT_GAME_MULTIPV,
      pvMoveLimit: 1,
      keepAlive: true,
    }));
    expect(api.post).not.toHaveBeenCalled();

    await service.flushPendingPositionAnalysisSaves();

    expect(api.post).toHaveBeenCalledWith('/position-analysis/bulk-store', {
      positions: [
        jasmine.objectContaining({
          fen,
          persistenceMode: 'compact',
        }),
      ],
    });
    expect(api.post.calls.mostRecent().args[1].positions[0].lines).toBeUndefined();
  });

  it('reruns Stockfish when cached rich lines are shallower than requested depth', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    api.get.and.returnValue(of({
      positionAnalysis: richPosition(fen, 12),
    }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();

    expect(stockfish.analyze).toHaveBeenCalledWith(fen, jasmine.objectContaining({
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    }));
  });

  it('reuses cached rich lines at the interactive cache threshold', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const cached = richPosition(fen, RICH_INTERACTIVE_CACHE_MIN_DEPTH);
    api.get.and.returnValue(of({ positionAnalysis: cached }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();

    expect(stockfish.analyze).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reuses cached rich lines at full interactive depth', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const cached = richPosition(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH);
    api.get.and.returnValue(of({ positionAnalysis: cached }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();

    expect(stockfish.analyze).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reuses cached rich lines when the best line satisfies the interactive cache threshold', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const cached = variedDepthRichPosition(fen, [RICH_INTERACTIVE_CACHE_MIN_DEPTH, 15, 14]);
    api.get.and.returnValue(of({ positionAnalysis: cached }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();

    expect(stockfish.analyze).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reruns Stockfish for rich requests when the cached row is compact only', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    api.get.and.returnValue(of({
      positionAnalysis: {
        fen,
        normalizedFen: '8/8/8/8/8/8/4K3/6k1 w - -',
        bestMoveUci: 'e2e3',
        bestScoreCpWhite: 25,
        bestMateWhite: null,
        lines: [],
      },
    }));

    service.analyzeInteractiveRichPosition(fen);
    await flushAsync();

    expect(stockfish.analyze).toHaveBeenCalled();
  });
});

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function richPosition(fen: string, depth: number) {
  return variedDepthRichPosition(fen, [depth, depth, depth]);
}

function variedDepthRichPosition(fen: string, depths: [number, number, number]) {
  return {
    fen,
    normalizedFen: '8/8/8/8/8/8/4K3/6k1 w - -',
    bestMoveUci: 'e2e3',
    bestScoreCpWhite: 25,
    bestMateWhite: null,
    lines: [
      { multipv: 1, depth: depths[0], moveUci: 'e2e3', scoreCpWhite: 25, pvUci: ['e2e3'] },
      { multipv: 2, depth: depths[1], moveUci: 'e2f3', scoreCpWhite: 20, pvUci: ['e2f3'] },
      { multipv: 3, depth: depths[2], moveUci: 'e2d3', scoreCpWhite: 15, pvUci: ['e2d3'] },
    ],
  };
}

function engineAnalysis(fen: string, depth: number): EngineAnalysis {
  return engineAnalysisWithDepths(fen, [depth, depth, depth]);
}

function engineAnalysisWithDepths(fen: string, depths: [number, number, number]): EngineAnalysis {
  return {
    fen,
    running: false,
    ready: true,
    error: null,
    bestMove: 'e2e3',
    lines: [
      { multipv: 1, depth: depths[0], scoreCp: 25, pv: ['e2e3'] },
      { multipv: 2, depth: depths[1], scoreCp: 20, pv: ['e2f3'] },
      { multipv: 3, depth: depths[2], scoreCp: 15, pv: ['e2d3'] },
    ],
  };
}
