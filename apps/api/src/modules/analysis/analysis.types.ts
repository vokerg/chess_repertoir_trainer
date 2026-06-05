export interface StoredEngineLine {
  multipv?: number;
  depth?: number;
  moveUci?: string;
  scoreCpWhite?: number;
  mateWhite?: number;
  pvUci: string[];
}

export interface StorePositionAnalysisInput {
  fen: string;
  bestMoveUci?: string;
  bestScoreCpWhite?: number;
  bestMateWhite?: number;
  lines?: StoredEngineLine[];
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
