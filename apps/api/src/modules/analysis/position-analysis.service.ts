import { normalizeFenForPosition } from 'chess-domain';
import { StorePositionAnalysisInput, StoredPositionAnalysis } from './analysis.types';
import { normalizeStoredEngineLines } from './position-analysis-normalization';
import {
  findOrCreatePositionByFen,
  getPositionAnalysesByFens,
  getPositionAnalysisByFen,
  upsertPositionAnalysis,
  upsertPositionAnalysesBulk,
} from './analysis.repository.prisma';

function withNormalizedLines<T extends StoredPositionAnalysis>(analysis: T): T {
  return {
    ...analysis,
    lines: normalizeStoredEngineLines(analysis.lines),
  } as T;
}

function withRequestedFen<T extends StoredPositionAnalysis | null>(analysis: T, fen: string): T {
  if (!analysis) return analysis;
  return {
    ...withNormalizedLines(analysis),
    fen,
  } as T;
}

export const PositionAnalysisService = {
  getPositionAnalysis: async (fen: string): Promise<StoredPositionAnalysis | null> => {
    normalizeFenForPosition(fen);
    return withRequestedFen(await getPositionAnalysisByFen(fen), fen);
  },

  getPositionAnalyses: async (fens: string[]): Promise<StoredPositionAnalysis[]> => {
    return (await getPositionAnalysesByFens(fens)).map(withNormalizedLines);
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

  storePositionSearches: async (inputs: StorePositionAnalysisInput[]): Promise<StoredPositionAnalysis[]> => {
    const requestedFenByNormalizedFen = new Map<string, string>();
    for (const input of inputs) {
      requestedFenByNormalizedFen.set(normalizeFenForPosition(input.fen), input.fen);
    }

    const rows = await upsertPositionAnalysesBulk(inputs);
    return rows.map((row) => {
      const normalizedRow = withNormalizedLines(row);
      const requestedFen = requestedFenByNormalizedFen.get(row.normalizedFen);
      return requestedFen ? withRequestedFen(normalizedRow, requestedFen) : normalizedRow;
    });
  },
};
