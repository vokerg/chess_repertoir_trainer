import { NgZone } from '@angular/core';
import { EngineAnalysis, StockfishAnalysisService } from './stockfish-analysis.service';

describe('StockfishAnalysisService', () => {
  it('waits for a fresh search when analyzing the same FEN twice', async () => {
    const service = new StockfishAnalysisService({ run: (callback: () => void) => callback() } as NgZone);
    const fen = '8/8/8/8/8/8/8/K6k w - - 0 1';
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
});
