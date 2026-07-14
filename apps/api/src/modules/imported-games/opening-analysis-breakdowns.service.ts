import { Chess } from 'chess.js';
import { OpeningAnalysisQuery } from './imported-games.schemas';
import { findOpeningPositionByNormalizedFen } from './opening-analysis.repository.prisma';
import { findOpeningAnalysisOpeningBreakdown } from './opening-analysis-breakdowns.repository.prisma';

interface TimingLogger {
  debug: (obj: Record<string, unknown>, message: string) => void;
}

interface OpeningBreakdownAccumulator {
  name: string;
  games: number;
  wdl: {
    wins: number;
    draws: number;
    losses: number;
  };
}

const OPENING_BREAKDOWN_LIMIT = 50;

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

    const openingsByName = new Map<string, OpeningBreakdownAccumulator>();
    for (const row of rows) {
      if (!row.openingName) continue;
      const current = openingsByName.get(row.openingName) ?? {
        name: row.openingName,
        games: 0,
        wdl: { wins: 0, draws: 0, losses: 0 },
      };
      const count = row._count._all;
      current.games += count;
      if (row.resultForUser === 'WIN') current.wdl.wins += count;
      else if (row.resultForUser === 'DRAW') current.wdl.draws += count;
      else if (row.resultForUser === 'LOSS') current.wdl.losses += count;
      openingsByName.set(row.openingName, current);
    }

    const openings = Array.from(openingsByName.values())
      .sort((left, right) => right.games - left.games || left.name.localeCompare(right.name))
      .slice(0, OPENING_BREAKDOWN_LIMIT);

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
        openingBreakdownExcludes: ['openingEco', 'openingName', 'openingNameExact'],
      },
    };
  },
};
