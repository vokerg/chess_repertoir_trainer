import { normalizeFenForPosition } from 'chess-domain';
import { StorePositionAnalysisInput, StoredPositionAnalysis } from './analysis.types';
import {
  findOrCreatePositionByFen,
  getPositionAnalysisByFen,
  upsertPositionAnalysis,
} from './analysis.repository.prisma';

export const PositionAnalysisService = {
  getPositionAnalysis: async (fen: string): Promise<StoredPositionAnalysis | null> => {
    normalizeFenForPosition(fen);
    return getPositionAnalysisByFen(fen);
  },

  getStoredPositionSearch: async (input: { fen: string }): Promise<StoredPositionAnalysis | null> => {
    normalizeFenForPosition(input.fen);
    return getPositionAnalysisByFen(input.fen);
  },

  storePositionSearch: async (input: StorePositionAnalysisInput): Promise<StoredPositionAnalysis> => {
    normalizeFenForPosition(input.fen);
    const position = await findOrCreatePositionByFen(input.fen);
    return upsertPositionAnalysis(position.id, input);
  },
};
