import type {
  PositionAnalysisPersistenceMode,
  StorePositionAnalysisInput,
  StoredEngineLine,
} from 'chess-domain';

export type { PositionAnalysisPersistenceMode, StorePositionAnalysisInput, StoredEngineLine };

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
