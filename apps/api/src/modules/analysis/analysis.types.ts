export interface StoredEngineLine {
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
