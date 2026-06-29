import { BehaviorSubject, of } from 'rxjs';
import {
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

  it('reruns Stockfish when cached rich lines are shallower than requested depth', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    api.get.and.returnValue(of({
      positionAnalysis: richPosition(fen, 12),
    }));
    stockfish.analyzeOnce.and.resolveTo(engineAnalysis(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH));
    api.post.and.returnValue(of({
      positionAnalysis: richPosition(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH),
    }));

    const result = await service.getOrAnalyzePosition(fen, {
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    });

    expect(stockfish.analyzeOnce).toHaveBeenCalledWith(fen, jasmine.objectContaining({
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    }));
    expect(api.post).toHaveBeenCalled();
    expect(result.lines[0].depth).toBe(RICH_INTERACTIVE_ANALYSIS_DEPTH);
  });

  it('reuses cached rich lines at the interactive cache threshold', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const cached = richPosition(fen, RICH_INTERACTIVE_CACHE_MIN_DEPTH);
    api.get.and.returnValue(of({ positionAnalysis: cached }));

    const result = await service.getOrAnalyzePosition(fen, {
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    });

    expect(stockfish.analyzeOnce).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(result).toBe(cached);
  });

  it('reuses cached rich lines at full interactive depth', async () => {
    const fen = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
    const cached = richPosition(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH);
    api.get.and.returnValue(of({ positionAnalysis: cached }));

    const result = await service.getOrAnalyzePosition(fen, {
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    });

    expect(stockfish.analyzeOnce).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(result).toBe(cached);
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
    stockfish.analyzeOnce.and.resolveTo(engineAnalysis(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH));
    api.post.and.returnValue(of({
      positionAnalysis: richPosition(fen, RICH_INTERACTIVE_ANALYSIS_DEPTH),
    }));

    await service.getOrAnalyzePosition(fen, {
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
    });

    expect(stockfish.analyzeOnce).toHaveBeenCalled();
  });
});

function richPosition(fen: string, depth: number) {
  return {
    fen,
    normalizedFen: '8/8/8/8/8/8/4K3/6k1 w - -',
    bestMoveUci: 'e2e3',
    bestScoreCpWhite: 25,
    bestMateWhite: null,
    lines: [
      { multipv: 1, depth, moveUci: 'e2e3', scoreCpWhite: 25, pvUci: ['e2e3'] },
      { multipv: 2, depth, moveUci: 'e2f3', scoreCpWhite: 20, pvUci: ['e2f3'] },
      { multipv: 3, depth, moveUci: 'e2d3', scoreCpWhite: 15, pvUci: ['e2d3'] },
    ],
  };
}

function engineAnalysis(fen: string, depth: number): EngineAnalysis {
  return {
    fen,
    running: false,
    ready: true,
    error: null,
    bestMove: 'e2e3',
    lines: [
      { multipv: 1, depth, scoreCp: 25, pv: ['e2e3'] },
      { multipv: 2, depth, scoreCp: 20, pv: ['e2f3'] },
      { multipv: 3, depth, scoreCp: 15, pv: ['e2d3'] },
    ],
  };
}
