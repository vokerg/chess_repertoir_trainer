import type { StorePositionAnalysisInput } from './analysis.types';

export interface EngineAnalyzeOptions {
  depth: number;
  multipv: number;
}

export interface StockfishEngine {
  init(): Promise<void>;
  analyzePosition(fen: string, options: EngineAnalyzeOptions): Promise<StorePositionAnalysisInput>;
  dispose(): void;
}
