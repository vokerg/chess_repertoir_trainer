import { Chess } from 'chess.js';
import { CurrentUserService } from '../../services/currentUserService';
import { ImportedGameSearchQuery, OpeningAnalysisQuery } from './imported-games.schemas';
import { findOpeningAnalysisRows, OpeningAnalysisPlyRow } from './opening-analysis.repository.prisma';

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
  providerGameId: string;
  providerUrl: string | null;
  endedAt: Date | null;
  speedCategory: string | null;
  timeControl: {
    raw: string | null;
    initial: number | null;
    increment: number | null;
  };
  white: {
    username: string | null;
    rating: number | null;
  };
  black: {
    username: string | null;
    rating: number | null;
  };
  userColor: string | null;
  resultForUser: string | null;
  opening: {
    eco: string | null;
    name: string | null;
  };
  plyNumber: number;
  moveNumber: number;
  nextMoveUci: string;
  nextMoveSan: string | null;
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

function addResult(wdl: OpeningAnalysisWdl, result: string | null) {
  if (result === 'WIN') wdl.wins += 1;
  else if (result === 'DRAW') wdl.draws += 1;
  else if (result === 'LOSS') wdl.losses += 1;
  else return;

  wdl.total += 1;
  wdl.scorePct = Math.round(((wdl.wins + wdl.draws * 0.5) / wdl.total) * 1000) / 10;
}

function latestRun(row: OpeningAnalysisPlyRow) {
  return row.importedGame.analysisRuns[0] ?? null;
}

function deriveAnalysisStatus(row: OpeningAnalysisPlyRow) {
  const run = latestRun(row);
  if (!run) return 'NOT_ANALYZED';
  if (run.status === 'QUEUED') return 'QUEUED';
  if (run.status === 'RUNNING') return 'RUNNING';
  if (run.status === 'COMPLETED') return 'COMPLETED';
  if (run.status === 'INTERRUPTED') return 'INTERRUPTED';
  return 'FAILED';
}

function userAccuracy(row: OpeningAnalysisPlyRow) {
  const run = latestRun(row);
  if (!run) return null;
  if (row.importedGame.userColor === 'WHITE') return run.whiteAccuracy;
  if (row.importedGame.userColor === 'BLACK') return run.blackAccuracy;
  return null;
}

function classificationCount(summary: unknown, classification: string) {
  if (!summary || typeof summary !== 'object') return 0;
  const white = (summary as any).white;
  const black = (summary as any).black;
  const whiteCount = white && typeof white === 'object' && typeof white[classification] === 'number' ? white[classification] : 0;
  const blackCount = black && typeof black === 'object' && typeof black[classification] === 'number' ? black[classification] : 0;
  return whiteCount + blackCount;
}

function rowMatchesAnalysisFilters(row: OpeningAnalysisPlyRow, query: ImportedGameSearchQuery) {
  if (query.analysisStatus?.length && !query.analysisStatus.includes(deriveAnalysisStatus(row) as any)) {
    return false;
  }

  const accuracy = userAccuracy(row);
  if (query.minAccuracy !== undefined && (accuracy === null || accuracy < query.minAccuracy)) {
    return false;
  }
  if (query.maxAccuracy !== undefined && (accuracy === null || accuracy > query.maxAccuracy)) {
    return false;
  }

  if (query.classification?.length) {
    const run = latestRun(row);
    if (!run) return false;
    return query.classification.some((classification) => classificationCount(run.summary, classification) > 0);
  }

  return true;
}

function toAppliedFilters(query: OpeningAnalysisQuery, normalizedFen: string) {
  return {
    ...query,
    fen: query.fen,
    normalizedFen,
    rated: true,
  };
}

function toOpeningAnalysisGame(row: OpeningAnalysisPlyRow, moveSan: string | null): OpeningAnalysisGame {
  const game = row.importedGame;
  return {
    id: game.id,
    provider: game.provider,
    providerGameId: game.providerGameId,
    providerUrl: game.providerUrl,
    endedAt: game.endedAt,
    speedCategory: game.speedCategory,
    timeControl: {
      raw: game.timeControlRaw,
      initial: game.timeControlInitial,
      increment: game.timeControlIncrement,
    },
    white: {
      username: game.whiteUsername,
      rating: game.whiteRating,
    },
    black: {
      username: game.blackUsername,
      rating: game.blackRating,
    },
    userColor: game.userColor,
    resultForUser: game.resultForUser,
    opening: {
      eco: game.openingEco,
      name: game.openingName,
    },
    plyNumber: row.plyNumber,
    moveNumber: moveNumberFromPly(row.plyNumber),
    nextMoveUci: row.moveUci,
    nextMoveSan: moveSan,
  };
}

export const OpeningAnalysisService = {
  getPosition: async (query: OpeningAnalysisQuery) => {
    await CurrentUserService.getOrCreate();

    const fen = boardFen(query.fen);
    const normalizedFen = normalizeFenForExplorer(fen);
    const rows = (await findOpeningAnalysisRows(query, normalizedFen)).filter((row) => rowMatchesAnalysisFilters(row, query));

    const positionGames = new Set<number>();
    const positionWdl = emptyWdl();
    const moveBuckets = new Map<
      string,
      {
        moveUci: string;
        moveSan: string | null;
        fenAfter: string;
        side: string;
        moveNumber: number;
        occurrences: number;
        gameIds: Set<number>;
        games: OpeningAnalysisWdl;
      }
    >();
    const moveDetailsByUci = new Map<string, { fenAfter: string; moveSan: string | null }>();

    function detailsForMove(moveUci: string) {
      const existing = moveDetailsByUci.get(moveUci);
      if (existing) return existing;

      const details = playUci(fen, moveUci);
      moveDetailsByUci.set(moveUci, details);
      return details;
    }

    for (const row of rows) {
      if (!positionGames.has(row.importedGameId)) {
        positionGames.add(row.importedGameId);
        addResult(positionWdl, row.importedGame.resultForUser);
      }

      const existing = moveBuckets.get(row.moveUci);
      const moveDetails = detailsForMove(row.moveUci);
      const bucket = existing ?? {
        moveUci: row.moveUci,
        moveSan: moveDetails.moveSan,
        fenAfter: moveDetails.fenAfter,
        side: sideToMove(fen),
        moveNumber: moveNumberFromPly(row.plyNumber),
        occurrences: 0,
        gameIds: new Set<number>(),
        games: emptyWdl(),
      };

      bucket.occurrences += 1;
      if (!bucket.gameIds.has(row.importedGameId)) {
        bucket.gameIds.add(row.importedGameId);
        addResult(bucket.games, row.importedGame.resultForUser);
      }
      moveBuckets.set(row.moveUci, bucket);
    }

    const nextMoves: OpeningAnalysisNextMove[] = Array.from(moveBuckets.values())
      .map(({ gameIds: _gameIds, ...bucket }) => bucket)
      .sort((a, b) => b.games.total - a.games.total || b.occurrences - a.occurrences || (a.moveSan ?? '').localeCompare(b.moveSan ?? '') || a.moveUci.localeCompare(b.moveUci));

    const seenTopGameIds = new Set<number>();
    const topGames = rows
      .slice()
      .sort((a, b) => {
        const endedA = a.importedGame.endedAt?.getTime() ?? 0;
        const endedB = b.importedGame.endedAt?.getTime() ?? 0;
        return endedB - endedA || b.importedGameId - a.importedGameId || a.plyNumber - b.plyNumber;
      })
      .filter((row) => {
        if (seenTopGameIds.has(row.importedGameId)) return false;
        seenTopGameIds.add(row.importedGameId);
        return true;
      })
      .slice(0, 10)
      .map((row) => toOpeningAnalysisGame(row, detailsForMove(row.moveUci).moveSan));

    const chess = new Chess(fen);

    return {
      fen,
      normalizedFen,
      sideToMove: chess.turn() === 'w' ? 'WHITE' : 'BLACK',
      fullMoveNumber: Number(fen.split(/\s+/)[5]) || 1,
      ratedOnly: true,
      occurrences: rows.length,
      games: positionWdl,
      nextMoves,
      topGames,
      appliedFilters: toAppliedFilters(query, normalizedFen),
    };
  },
};
