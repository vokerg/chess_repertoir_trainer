export const ANALYSIS_CLASSIFICATION_VERSION = 'v1';

export type AnalysisSide = 'WHITE' | 'BLACK';

export type MoveClassification = 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER';

export interface EngineLine {
  multipv: number;
  depth: number;
  moveUci?: string;
  scoreCpWhite?: number;
  mateWhite?: number;
  pvUci: string[];
}

export interface EngineSearchResult {
  fen: string;
  depth: number;
  multipv: number;
  bestMoveUci?: string;
  lines: EngineLine[];
}

export interface AnalyzePositionInput {
  fen: string;
  playedMoveUci?: string;
  depth: number;
  multipv: number;
}

export interface PositionAnalysisResult {
  fen: string;
  normalizedFen: string;
  playedMoveUci?: string;
  depth: number;
  multipv: number;
  engineName: string;
  engineVersion?: string;
  classificationVersion: string;
  bestMoveUci?: string;
  bestScoreCpWhite?: number;
  playedScoreCpWhite?: number;
  scoreLossCp?: number;
  classification?: MoveClassification;
  lines: EngineLine[];
  playedLine?: EngineLine;
}

export interface StoredPositionAnalysis extends PositionAnalysisResult {
  id: number;
  cacheKey: string;
  fromCache: boolean;
}

export interface ParsedGameMove {
  plyNumber: number;
  moveNumber: number;
  side: AnalysisSide;
  fenBefore: string;
  fenAfter: string;
  playedMoveUci: string;
  playedMoveSan?: string;
}
