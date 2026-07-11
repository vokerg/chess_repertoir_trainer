import { Injectable, inject } from '@angular/core';
import { Chess } from 'chess.js';
import {
  EngineAnalysis,
  StockfishAnalysisService,
} from '../../../shared/chess/engine/stockfish-analysis.service';

const ENGINE_NAME = 'Stockfish 18 (browser)';

function isUciMove(value: unknown): value is string {
  return typeof value === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value);
}

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
  private readonly pvMoveLimit = 10;

  async analyze(fen: string): Promise<TrainerEngineResult> {
    const terminalResult = this.terminalResult(fen);
    if (terminalResult) return terminalResult;

    const analysis = await this.stockfish.analyzeOnce(fen, {
      depth: this.depth,
      multipv: this.multipv,
      pvMoveLimit: this.pvMoveLimit,
      timeoutMs: 6000,
      keepAlive: true,
    });
    const bestLine = analysis.lines[0];
    const bestMove = [analysis.bestMove, bestLine?.pv?.[0]].find(isUciMove) ?? null;
    const raw = analysis.bestMove === bestMove ? analysis : { ...analysis, bestMove };
    return {
      engineName: ENGINE_NAME,
      depth: bestLine?.depth || this.depth,
      multipv: this.multipv,
      bestMove,
      scoreCpWhite: this.fromSideToMove(bestLine?.scoreCp, fen),
      mateWhite: this.fromSideToMove(bestLine?.mate, fen),
      raw,
    };
  }

  private terminalResult(fen: string): TrainerEngineResult | null {
    const chess = new Chess(fen);
    if (!chess.isGameOver()) return null;

    const mateWhite = chess.isCheckmate() ? (chess.turn() === 'b' ? 1 : -1) : null;
    const raw: EngineAnalysis = {
      fen,
      running: false,
      ready: true,
      error: null,
      bestMove: null,
      lines: [],
    };
    return {
      engineName: ENGINE_NAME,
      depth: this.depth,
      multipv: this.multipv,
      bestMove: null,
      scoreCpWhite: mateWhite === null ? 0 : null,
      mateWhite,
      raw,
    };
  }

  private fromSideToMove(value: number | undefined, fen: string): number | null {
    if (value === undefined) return null;
    return fen.split(/\s+/)[1] === 'b' ? -value : value;
  }
}
