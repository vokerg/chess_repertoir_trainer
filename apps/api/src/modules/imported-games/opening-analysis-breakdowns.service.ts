import { Chess } from 'chess.js';
import { OpeningAnalysisQuery } from './imported-games.schemas';
import { findOpeningPositionByNormalizedFen } from './opening-analysis.repository.prisma';
import { findOpeningAnalysisOpeningBreakdown } from './opening-analysis-breakdowns.repository.prisma';

interface TimingLogger {
  debug: (obj: Record<string, unknown>, message: string) => void;
}

function normalizeFenForExplorer(fen: string): string {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  return chess.fen().split(/\s+/).slice(0, 4).join(' ');
}

function boardFen(fen: string): string {
  return fen === 'startpos' ? new Chess().fen() : new Chess(fen).fen();
}

function effectiveQuery(query: OpeningAnalysisQuery): OpeningAnalysisQuery {
  return { ...query, rated: query.rated ?? true };
}

export const OpeningAnalysisBreakdownsService = {
  getBreakdowns: async (userId: number, query: OpeningAnalysisQuery, logger?: TimingLogger) => {
    const startedAt = performance.now();
    const fen = boardFen(query.fen);
    const normalizedFen = normalizeFenForExplorer(fen);
    const currentQuery = effectiveQuery(query);
    const position = await findOpeningPositionByNormalizedFen(normalizedFen);
    const rows = position
      ? await findOpeningAnalysisOpeningBreakdown(userId, currentQuery, position.id)
      : [];

    const openings = rows
      .filter((row): row is typeof row & { openingEco: string } => Boolean(row.openingEco))
      .map((row) => ({
        eco: row.openingEco,
        name: row.openingName,
        games: row._count._all,
      }));

    logger?.debug({
      flow: 'opening-analysis.breakdowns.total',
      totalMs: Math.round((performance.now() - startedAt) * 10) / 10,
      openingCount: openings.length,
    }, 'Opening analysis timing');

    return {
      fen,
      normalizedFen,
      openings,
      appliedFilters: {
        ...currentQuery,
        fen: query.fen,
        normalizedFen,
        openingBreakdownExcludes: ['openingEco', 'openingName'],
      },
    };
  },
};
