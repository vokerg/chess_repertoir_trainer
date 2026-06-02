import { normalizeFenForPosition } from 'chess-domain';
import { StorePositionAnalysisInput, StoredPositionAnalysis } from './analysis.types';
import {
  findOrCreatePositionByFen,
  getPositionAnalysisByFen,
  upsertPositionAnalysis,
} from './analysis.repository.prisma';

function withRequestedFen<T extends StoredPositionAnalysis | null>(analysis: T, fen: string): T {
  if (!analysis) return analysis;
  return { ...analysis, fen } as T;
}

export const PositionAnalysisService = {
  getPositionAnalysis: async (fen: string): Promise<StoredPositionAnalysis | null> => {
    normalizeFenForPosition(fen);
    return withRequestedFen(await getPositionAnalysisByFen(fen), fen);
  },

  getStoredPositionSearch: async (input: { fen: string }): Promise<StoredPositionAnalysis | null> => {
    normalizeFenForPosition(input.fen);
    return withRequestedFen(await getPositionAnalysisByFen(input.fen), input.fen);
  },

  storePositionSearch: async (input: StorePositionAnalysisInput): Promise<StoredPositionAnalysis> => {
    normalizeFenForPosition(input.fen);
    const position = await findOrCreatePositionByFen(input.fen);
    return withRequestedFen(await upsertPositionAnalysis(position.id, input), input.fen);
  },
};
