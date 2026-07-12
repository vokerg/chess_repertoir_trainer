import { Chess } from 'chess.js';
import { PositionAnalysisService } from '../analysis/position-analysis.service';
import { OpeningLookupService, OpeningMatch } from '../../services/opening-book/openingLookupService';
import { OpeningAnalysisQuery } from './imported-games.schemas';
import {
  findOpeningCoreSummary,
  findOpeningNextMoves,
  findOpeningPerformanceGames,
  findOpeningPositionByNormalizedFen,
  findOpeningTopGames,
  OpeningAnalysisGameRow,
  OpeningTopGameRow,
} from './opening-analysis.repository.prisma';
import { summarizeGamePerformance } from './performance-insights.service';
import { GamePerformanceSummary } from './performance-insights.types';

export interface OpeningAnalysisWdl {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
}

export interface OpeningAnalysisNextMove {
  moveUci: string;
  moveSan: string | null;
  fenAfter: string;
  side: string;
  moveNumber: number;
  occurrences: number;
  games: OpeningAnalysisWdl;
}

export interface OpeningAnalysisGame {
  id: number;
  provider: string;
  endedAt: string | null;
  speedCategory: string | null;
  white: {
    username: string | null;
    rating: number | null;
  };
  black: {
    username: string | null;
    rating: number | null;
  };
  resultForUser: string | null;
  opening: {
    eco: string | null;
    name: string | null;
  };
  moveNumber: number;
  nextMoveUci: string;
  nextMoveSan: string | null;
}

export interface OpeningAnalysisCoreResponse {
  fen: string;
  normalizedFen: string;
  bookOpening: OpeningMatch | null;
  sideToMove: 'WHITE' | 'BLACK';
  fullMoveNumber: number;
  ratedOnly: boolean;
  occurrences: number;
  games: OpeningAnalysisWdl;
  nextMoves: OpeningAnalysisNextMove[];
  appliedFilters: ReturnType<typeof toAppliedFilters>;
}

export interface OpeningAnalysisPerformanceResponse {
  fen: string;
  normalizedFen: string;
  performance: GamePerformanceSummary;
  appliedFilters: ReturnType<typeof toAppliedFilters>;
}

export interface OpeningAnalysisTopGamesResponse {
  fen: string;
  normalizedFen: string;
  topGames: OpeningAnalysisGame[];
  appliedFilters: ReturnType<typeof toAppliedFilters>;
}

export interface OpeningAnalysisLegacyResponse extends OpeningAnalysisCoreResponse {
  performance: GamePerformanceSummary;
  topGames: OpeningAnalysisGame[];
  positionAnalysis: unknown;
}

interface TimingLogger {
  debug: (obj: Record<string, unknown>, message: string) => void;
}

interface TimingProbe {
  mark: (name: string) => void;
  finish: (extra?: Record<string, unknown>) => void;
}

function timingProbe(logger: TimingLogger | undefined, flow: string, enabled = Boolean(logger)): TimingProbe {
  const start = performance.now();
  let previous = start;
  const marks: Record<string, number> = {};
  return {
    mark(name: string) {
      if (!enabled) return;
      const now = performance.now();
      marks[name] = Math.round((now - previous) * 10) / 10;
      previous = now;
    },
    finish(extra: Record<string, unknown> = {}) {
      if (!enabled || !logger) return;
      logger.debug({ flow, totalMs: Math.round((performance.now() - start) * 10) / 10, marks, ...extra }, 'Opening analysis timing');
    },
  };
}

function normalizeFenForExplorer(fen: string): string {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  const parts = chess.fen().split(/\s+/);
  return parts.slice(0, 4).join(' ');
}

function boardFen(fen: string): string {
  return fen === 'startpos' ? new Chess().fen() : new Chess(fen).fen();
}

function moveNumberFromPly(plyNumber: number) {
  return Math.ceil(plyNumber / 2);
}

function sideToMove(fen: string): 'WHITE' | 'BLACK' {
  return fen.split(/\s+/)[1] === 'b' ? 'BLACK' : 'WHITE';
}

function playUci(fen: string, uci: string) {
  const chess = new Chess(fen);
  const move = chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.slice(4, 5) || undefined,
  });
  return {
    fenAfter: chess.fen(),
    moveSan: move.san ?? uci,
  };
}

function emptyWdl(): OpeningAnalysisWdl {
  return { total: 0, wins: 0, draws: 0, losses: 0, scorePct: null };
}

function addResult(wdl: OpeningAnalysisWdl, result: string | null, count = 1) {
  if (result === 'WIN') wdl.wins += count;
  else if (result === 'DRAW') wdl.draws += count;
  else if (result === 'LOSS') wdl.losses += count;
  else return;

  wdl.total += count;
  wdl.scorePct = Math.round(((wdl.wins + wdl.draws * 0.5) / wdl.total) * 1000) / 10;
}

function toAppliedFilters(query: OpeningAnalysisQuery, normalizedFen: string) {
  return {
    ...query,
    fen: query.fen,
    normalizedFen,
  };
}

function effectiveQuery(query: OpeningAnalysisQuery): OpeningAnalysisQuery {
  return { ...query, rated: query.rated ?? true };
}

async function resolvePosition(query: OpeningAnalysisQuery, logger?: TimingLogger) {
  const timing = timingProbe(logger, 'opening-analysis.resolve-position');
  const fen = boardFen(query.fen);
  const normalizedFen = normalizeFenForExplorer(fen);
  const bookOpening = OpeningLookupService.lookupByFen(normalizedFen);
  timing.mark('fen_normalization_book_lookup');
  const position = await findOpeningPositionByNormalizedFen(normalizedFen);
  timing.mark('matching_position_lookup');
  timing.finish({ hasPosition: Boolean(position) });
  return { fen, normalizedFen, bookOpening, position };
}

function emptyCore(query: OpeningAnalysisQuery, fen: string, normalizedFen: string, bookOpening: OpeningMatch | null): OpeningAnalysisCoreResponse {
  const chess = new Chess(fen);
  return {
    fen,
    normalizedFen,
    bookOpening,
    sideToMove: chess.turn() === 'w' ? 'WHITE' : 'BLACK',
    fullMoveNumber: Number(fen.split(/\s+/)[5]) || 1,
    ratedOnly: query.rated === true,
    occurrences: 0,
    games: emptyWdl(),
    nextMoves: [],
    appliedFilters: toAppliedFilters(query, normalizedFen),
  };
}

function toOpeningAnalysisGame(game: OpeningAnalysisGameRow, plyNumber: number, nextMoveUci: string, nextMoveSan: string | null): OpeningAnalysisGame {
  return {
    id: game.id,
    provider: game.provider,
    endedAt: game.endedAt?.toISOString() ?? null,
    speedCategory: game.speedCategory,
    white: {
      username: game.whiteUsername,
      rating: game.whiteRating,
    },
    black: {
      username: game.blackUsername,
      rating: game.blackRating,
    },
    resultForUser: game.resultForUser,
    opening: {
      eco: game.openingEco,
      name: game.openingName,
    },
    moveNumber: moveNumberFromPly(plyNumber),
    nextMoveUci,
    nextMoveSan,
  };
}

function toTopGame(fen: string, row: OpeningTopGameRow): OpeningAnalysisGame | null {
  const ply = row.plies[0];
  if (!ply) return null;
  return toOpeningAnalysisGame(row, ply.plyNumber, ply.moveUci, playUci(fen, ply.moveUci).moveSan);
}

function responseSize(response: unknown): number | undefined {
  try {
    return Buffer.byteLength(JSON.stringify(response));
  } catch {
    return undefined;
  }
}

export const OpeningAnalysisService = {
  getPosition: async (userId: number, query: OpeningAnalysisQuery, logger?: TimingLogger): Promise<OpeningAnalysisCoreResponse> => {
    const total = timingProbe(logger, 'opening-analysis.core.total');
    const resolved = await resolvePosition(query, logger);
    const currentQuery = effectiveQuery(query);
    if (!resolved.position) {
      const response = emptyCore(currentQuery, resolved.fen, resolved.normalizedFen, resolved.bookOpening);
      total.finish({ responseBytes: responseSize(response) });
      return response;
    }

    const [summary, moves] = await Promise.all([
      findOpeningCoreSummary(userId, currentQuery, resolved.position.id),
      findOpeningNextMoves(userId, currentQuery, resolved.position.id),
    ]);
    total.mark('core_summary_next_moves_queries');

    const positionWdl = emptyWdl();
    for (const result of summary.gameResults) addResult(positionWdl, result.resultForUser, result._count._all);

    const occurrencesByMove = new Map<string, { occurrences: number; firstPlyNumber: number }>();
    for (const row of moves.occurrences) {
      const existing = occurrencesByMove.get(row.moveUci);
      occurrencesByMove.set(row.moveUci, {
        occurrences: (existing?.occurrences ?? 0) + row._count._all,
        firstPlyNumber: Math.min(existing?.firstPlyNumber ?? row.plyNumber, row.plyNumber),
      });
    }

    const gamesByMove = new Map<string, OpeningAnalysisWdl>();
    for (const row of moves.distinctGames) {
      const wdl = gamesByMove.get(row.moveUci) ?? emptyWdl();
      addResult(wdl, row.importedGame.resultForUser);
      gamesByMove.set(row.moveUci, wdl);
    }

    const nextMoves = Array.from(occurrencesByMove.entries())
      .map(([moveUci, count]) => {
        const details = playUci(resolved.fen, moveUci);
        return {
          moveUci,
          moveSan: details.moveSan,
          fenAfter: details.fenAfter,
          side: sideToMove(resolved.fen),
          moveNumber: moveNumberFromPly(count.firstPlyNumber),
          occurrences: count.occurrences,
          games: gamesByMove.get(moveUci) ?? emptyWdl(),
        };
      })
      .sort((a, b) => b.games.total - a.games.total || b.occurrences - a.occurrences || (a.moveSan ?? '').localeCompare(b.moveSan ?? '') || a.moveUci.localeCompare(b.moveUci));

    const chess = new Chess(resolved.fen);
    const response: OpeningAnalysisCoreResponse = {
      fen: resolved.fen,
      normalizedFen: resolved.normalizedFen,
      bookOpening: resolved.bookOpening,
      sideToMove: chess.turn() === 'w' ? 'WHITE' : 'BLACK',
      fullMoveNumber: Number(resolved.fen.split(/\s+/)[5]) || 1,
      ratedOnly: currentQuery.rated === true,
      occurrences: summary.occurrences,
      games: positionWdl,
      nextMoves,
      appliedFilters: toAppliedFilters(currentQuery, resolved.normalizedFen),
    };
    total.finish({ responseBytes: responseSize(response), nextMoveCount: nextMoves.length });
    return response;
  },

  getPerformance: async (userId: number, query: OpeningAnalysisQuery, logger?: TimingLogger): Promise<OpeningAnalysisPerformanceResponse> => {
    const total = timingProbe(logger, 'opening-analysis.performance.total');
    const resolved = await resolvePosition(query, logger);
    const currentQuery = effectiveQuery(query);
    const rows = resolved.position
      ? await findOpeningPerformanceGames(userId, currentQuery, resolved.position.id)
      : [];
    total.mark('performance_query');
    const response = {
      fen: resolved.fen,
      normalizedFen: resolved.normalizedFen,
      performance: summarizeGamePerformance(rows),
      appliedFilters: toAppliedFilters(currentQuery, resolved.normalizedFen),
    };
    total.finish({ responseBytes: responseSize(response), sampleGames: rows.length });
    return response;
  },

  getTopGames: async (userId: number, query: OpeningAnalysisQuery, limit: number, logger?: TimingLogger): Promise<OpeningAnalysisTopGamesResponse> => {
    const total = timingProbe(logger, 'opening-analysis.top-games.total');
    const resolved = await resolvePosition(query, logger);
    const currentQuery = effectiveQuery(query);
    const rows = resolved.position
      ? await findOpeningTopGames(userId, currentQuery, resolved.position.id, limit)
      : [];
    total.mark('top_games_query');
    const topGames = rows.map((row) => toTopGame(resolved.fen, row)).filter((game): game is OpeningAnalysisGame => Boolean(game));
    const response = {
      fen: resolved.fen,
      normalizedFen: resolved.normalizedFen,
      topGames,
      appliedFilters: toAppliedFilters(currentQuery, resolved.normalizedFen),
    };
    total.finish({ responseBytes: responseSize(response), topGameCount: topGames.length });
    return response;
  },

  getPositionLegacy: async (userId: number, query: OpeningAnalysisQuery, logger?: TimingLogger): Promise<OpeningAnalysisLegacyResponse> => {
    const currentQuery = effectiveQuery(query);
    const core = await OpeningAnalysisService.getPosition(userId, query, logger);
    const [performance, topGames, positionAnalysis] = await Promise.all([
      OpeningAnalysisService.getPerformance(userId, currentQuery, logger),
      OpeningAnalysisService.getTopGames(userId, currentQuery, 10, logger),
      PositionAnalysisService.getStoredPositionSearch({ fen: core.fen }),
    ]);
    return {
      ...core,
      performance: performance.performance,
      topGames: topGames.topGames,
      positionAnalysis,
    };
  },
};
