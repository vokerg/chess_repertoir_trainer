import { TestBed } from '@angular/core/testing';
import {
  EngineAnalysis,
  StockfishAnalysisService,
} from '../../../shared/chess/engine/stockfish-analysis.service';
import { TrainerEngineService } from './trainer-engine.service';

describe('TrainerEngineService', () => {
  let service: TrainerEngineService;
  let stockfish: jasmine.SpyObj<StockfishAnalysisService>;

  beforeEach(() => {
    stockfish = jasmine.createSpyObj<StockfishAnalysisService>('StockfishAnalysisService', [
      'analyzeOnce',
    ]);
    TestBed.configureTestingModule({
      providers: [TrainerEngineService, { provide: StockfishAnalysisService, useValue: stockfish }],
    });
    service = TestBed.inject(TrainerEngineService);
  });

  it('evaluates a position where White has delivered checkmate without starting Stockfish', async () => {
    const fen = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1';

    const result = await service.analyze(fen);

    expect(stockfish.analyzeOnce).not.toHaveBeenCalled();
    expect(result.scoreCpWhite).toBeNull();
    expect(result.mateWhite).toBe(1);
    expect(result.bestMove).toBeNull();
    expect(result.raw).toEqual({
      fen,
      running: false,
      ready: true,
      error: null,
      bestMove: null,
      lines: [],
    });
  });

  it('preserves the winner orientation when Black has delivered checkmate', async () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';

    const result = await service.analyze(fen);

    expect(stockfish.analyzeOnce).not.toHaveBeenCalled();
    expect(result.mateWhite).toBe(-1);
  });

  it('does not expose Stockfish terminal tokens as analysis moves', async () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const analysis: EngineAnalysis = {
      fen,
      running: false,
      ready: true,
      error: null,
      bestMove: '(none)',
      lines: [
        {
          multipv: 1,
          depth: 8,
          scoreCp: 20,
          pv: ['e2e4'],
        },
      ],
    };
    stockfish.analyzeOnce.and.returnValue(Promise.resolve(analysis));

    const result = await service.analyze(fen);

    expect(stockfish.analyzeOnce).toHaveBeenCalledOnceWith(fen, {
      depth: 8,
      multipv: 1,
      pvMoveLimit: 10,
      timeoutMs: 6000,
      keepAlive: true,
    });
    expect(result.bestMove).toBe('e2e4');
    expect(result.raw.bestMove).toBe('e2e4');
  });
});
