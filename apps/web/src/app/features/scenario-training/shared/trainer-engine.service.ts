import { Injectable, inject } from '@angular/core';
import { EngineAnalysis, StockfishAnalysisService } from '../../../shared/chess/engine/stockfish-analysis.service';

export interface TrainerEngineResult {
  engineName: string;
  depth: number;
  multipv: number;
  bestMove: string | null;
  scoreCpWhite: number | null;
  mateWhite: number | null;
  raw: EngineAnalysis;
}

@Injectable()
export class TrainerEngineService {
  private readonly stockfish = inject(StockfishAnalysisService);
  private readonly depth = 8;
  private readonly multipv = 1;

  async analyze(fen: string): Promise<TrainerEngineResult> {
    const analysis = await this.stockfish.analyzeOnce(fen, {
      depth: this.depth,
      multipv: this.multipv,
      pvMoveLimit: 1,
      timeoutMs: 6000,
      keepAlive: true,
    });
    const bestLine = analysis.lines[0];
    return {
      engineName: 'Stockfish 18 (browser)',
      depth: bestLine?.depth || this.depth,
      multipv: this.multipv,
      bestMove: analysis.bestMove ?? bestLine?.pv?.[0] ?? null,
      scoreCpWhite: this.fromSideToMove(bestLine?.scoreCp, fen),
      mateWhite: this.fromSideToMove(bestLine?.mate, fen),
      raw: analysis,
    };
  }

  private fromSideToMove(value: number | undefined, fen: string): number | null {
    if (value === undefined) return null;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }
}
