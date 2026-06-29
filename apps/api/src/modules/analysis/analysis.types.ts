export interface StoredEngineLine {
  multipv?: number;
  depth?: number;
  moveUci?: string;
  scoreCpWhite?: number;
  mateWhite?: number;
  pvUci: string[];
}

export type PositionAnalysisPersistenceMode = 'compact' | 'rich';

export interface StorePositionAnalysisInput {
  fen: string;
  bestMoveUci?: string | null;
  bestScoreCpWhite?: number | null;
  bestMateWhite?: number | null;
  lines?: StoredEngineLine[] | null;
  persistenceMode?: PositionAnalysisPersistenceMode;
}

export interface StoredPositionAnalysis {
  id: number;
  positionId: number;
  fen?: string;
  normalizedFen: string;
  bestMoveUci?: string;
  bestScoreCpWhite?: number;
  bestMateWhite?: number;
  lines: StoredEngineLine[];
  fromCache: boolean;
}

export interface PlyAnalysisUpdate {
  plyNumber: number;
  scoreLossCp: number | null;
  classificationCode: number | null;
}
