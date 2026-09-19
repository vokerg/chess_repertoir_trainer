import { NgZone } from '@angular/core';
import { EngineAnalysis, StockfishAnalysisService } from './stockfish-analysis.service';

describe('StockfishAnalysisService', () => {
  const fen = '8/8/8/8/8/8/8/K6k w - - 0 1';

  it('waits for a fresh search when analyzing the same FEN twice', async () => {
    const service = new StockfishAnalysisService({ run: (callback: () => void) => callback() } as NgZone);
    const previousAnalysis: EngineAnalysis = {
      fen,
      running: false,
      ready: true,
      bestMove: 'a1a2',
      lines: [{ multipv: 1, depth: 8, scoreCp: 0, pv: ['a1a2'] }],
    };
    const freshAnalysis: EngineAnalysis = {
      ...previousAnalysis,
      bestMove: 'a1b1',
      lines: [{ multipv: 1, depth: 8, scoreCp: 1, pv: ['a1b1'] }],
    };

    (service as any).emit(previousAnalysis);
    spyOn(service, 'analyze').and.callFake(() => {
      (service as any).emit({ ...previousAnalysis, running: true, bestMove: null, lines: [] });
      (service as any).emit(freshAnalysis);
    });

    const result = await service.analyzeOnce(fen, { timeoutMs: 100 });

    expect(result).toEqual(freshAnalysis);
    expect(service.analyze).toHaveBeenCalledOnceWith(fen, jasmine.any(Object));
  });

  it('ignores a late bestmove after the active run was stopped', () => {
    const service = new StockfishAnalysisService({ run: (callback: () => void) => callback() } as NgZone);
    const worker = { postMessage: () => undefined } as unknown as Worker;
    const states: EngineAnalysis[] = [];
    (service as any).worker = worker;
    (service as any).currentRun = pendingRun(fen);
    (service as any).emit(runningAnalysis(fen));
    service.state$.subscribe((state) => states.push(state));

    service.stop();
    const emissionCountAfterStop = states.length;
    (service as any).handleMessage('bestmove a1a2', worker);

    expect(states.length).toBe(emissionCountAfterStop);
    expect(states.at(-1)?.bestMove).toBeNull();
  });

  it('ignores messages from a worker that has been replaced', () => {
    const service = new StockfishAnalysisService({ run: (callback: () => void) => callback() } as NgZone);
    const staleWorker = {} as Worker;
    const activeWorker = {} as Worker;
    (service as any).worker = activeWorker;
    (service as any).currentRun = pendingRun(fen);
    (service as any).emit(runningAnalysis(fen));

    (service as any).handleMessage('bestmove a1a2', staleWorker);

    expect((service as any).currentRun).not.toBeNull();
    expect((service as any).stateSubject.value).toEqual(runningAnalysis(fen));
  });
});

function pendingRun(fen: string) {
  return {
    id: 1,
    fen,
    depth: 18,
    multipv: 3,
    keepAlive: false,
    started: true,
    lines: new Map(),
  };
}

function runningAnalysis(fen: string): EngineAnalysis {
  return {
    fen,
    running: true,
    ready: true,
    error: null,
    bestMove: null,
    lines: [],
  };
}
