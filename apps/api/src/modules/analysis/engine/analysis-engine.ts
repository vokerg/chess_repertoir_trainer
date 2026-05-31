import { EngineSearchResult } from '../analysis.types';

export interface AnalysisEngineSearchOptions {
  fen: string;
  depth: number;
  multipv: number;
  searchMoves?: string[];
  timeoutMs?: number;
}

export interface AnalysisEngineSession {
  search(options: AnalysisEngineSearchOptions): Promise<EngineSearchResult>;
  close?(): void;
}

export interface AnalysisEngineIdentity {
  engineName: string;
  engineVersion?: string;
}

export function configuredAnalysisEngineIdentity(): AnalysisEngineIdentity {
  return {
    engineName: process.env['ANALYSIS_ENGINE_NAME'] || 'stockfish',
    engineVersion: process.env['ANALYSIS_ENGINE_VERSION'] || process.env['STOCKFISH_VERSION'],
  };
}
