import crypto from 'crypto';
import { Chess } from 'chess.js';
import { StockfishEngine, StockfishSession } from './engine/stockfish-engine';
import {
  ANALYSIS_CLASSIFICATION_VERSION,
  EngineLine,
  MoveClassification,
  PositionAnalysisResult,
  StorePositionAnalysisInput,
  StoredPositionAnalysis,
} from './analysis.types';
import { createPositionAnalysis, findCompatiblePositionAnalysis, findCompatiblePositionAnalysisAnyEngine, findPositionAnalysis } from './analysis.repository.prisma';

export interface PositionAnalysisStats {
  positionCacheHits: number;
  positionCacheMisses: number;
  engineSearches: number;
  forcedMoveSearches: number;
}

function normalizeFenForCache(fen: string): string {
  const chess = new Chess(fen);
  const parts = chess.fen().split(/\s+/);
  return parts.slice(0, 5).join(' ');
}

function makeCacheKey(input: {
  normalizedFen: string;
  playedMoveUci?: string;
  depth: number;
  multipv: number;
  engineName: string;
  engineVersion?: string;
  classificationVersion: string;
}) {
  const stable = JSON.stringify({
    normalizedFen: input.normalizedFen,
    playedMoveUci: input.playedMoveUci ?? null,
    depth: input.depth,
    multipv: input.multipv,
    engineName: input.engineName,
    engineVersion: input.engineVersion ?? 'unknown',
    classificationVersion: input.classificationVersion,
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function cacheContext(input: { fen: string; playedMoveUci?: string; depth: number; multipv: number }) {
  const normalizedFen = normalizeFenForCache(input.fen);
  const engineName = StockfishEngine.engineName;
  const engineVersion = StockfishEngine.engineVersion();
  const classificationVersion = ANALYSIS_CLASSIFICATION_VERSION;
  const cacheKey = makeCacheKey({
    normalizedFen,
    playedMoveUci: input.playedMoveUci,
    depth: input.depth,
    multipv: input.multipv,
    engineName,
    engineVersion,
    classificationVersion,
  });

  return { normalizedFen, engineName, engineVersion, classificationVersion, cacheKey };
}

async function getCachedPositionAnalysis(input: { fen: string; playedMoveUci?: string; depth: number; multipv: number }) {
  const { cacheKey } = cacheContext(input);
  const cached = await findPositionAnalysis(cacheKey);
  return cached ? storedFromRow(cached) : null;
}

async function getCompatiblePositionAnalysis(input: { fen: string; depth: number; multipv: number }) {
  const { normalizedFen, engineName, engineVersion, classificationVersion } = cacheContext(input);
  const cached = await findCompatiblePositionAnalysis({
    normalizedFen,
    depth: input.depth,
    multipv: input.multipv,
    engineName,
    engineVersion,
    classificationVersion,
  });
  return cached ? storedFromRow(cached) : null;
}

async function getCompatiblePositionAnalysisFromAnyEngine(input: { fen: string; depth: number; multipv: number }) {
  const normalizedFen = normalizeFenForCache(input.fen);
  const cached = await findCompatiblePositionAnalysisAnyEngine({
    normalizedFen,
    depth: input.depth,
    multipv: input.multipv,
  });
  return cached ? storedFromRow(cached) : null;
}

function sideToMove(fen: string): 'WHITE' | 'BLACK' {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'BLACK' : 'WHITE';
}

function lineScoreForComparison(line?: EngineLine): number | undefined {
  if (!line) return undefined;
  if (line.scoreCpWhite !== undefined) return line.scoreCpWhite;
  if (line.mateWhite !== undefined) {
    const absMate = Math.min(Math.abs(line.mateWhite), 1000);
    return line.mateWhite > 0 ? 100000 - absMate : -100000 + absMate;
  }
  return undefined;
}

function computeScoreLossCp(fen: string, bestLine?: EngineLine, playedLine?: EngineLine): number | undefined {
  const bestScore = lineScoreForComparison(bestLine);
  const playedScore = lineScoreForComparison(playedLine);
  if (bestScore === undefined || playedScore === undefined) return undefined;

  const rawLoss = sideToMove(fen) === 'WHITE'
    ? bestScore - playedScore
    : playedScore - bestScore;

  return Math.max(0, Math.round(rawLoss));
}

function classifyMove(scoreLossCp: number | undefined, playedMoveUci: string | undefined, bestMoveUci: string | undefined): MoveClassification | undefined {
  if (!playedMoveUci) return undefined;
  if (bestMoveUci && playedMoveUci === bestMoveUci) return 'BEST';
  if (scoreLossCp === undefined) return undefined;
  if (scoreLossCp < 30) return 'GOOD';
  if (scoreLossCp < 80) return 'INACCURACY';
  if (scoreLossCp < 180) return 'MISTAKE';
  return 'BLUNDER';
}

function storedFromRow(row: any): StoredPositionAnalysis {
  return {
    id: row.id,
    cacheKey: row.cacheKey,
    fromCache: true,
    fen: row.fen,
    normalizedFen: row.normalizedFen,
    playedMoveUci: row.playedMoveUci ?? undefined,
    depth: row.depth,
    multipv: row.multipv,
    engineName: row.engineName,
    engineVersion: row.engineVersion ?? undefined,
    classificationVersion: row.classificationVersion,
    bestMoveUci: row.bestMoveUci ?? undefined,
    bestScoreCpWhite: row.bestScoreCpWhite ?? undefined,
    playedScoreCpWhite: row.playedScoreCpWhite ?? undefined,
    scoreLossCp: row.scoreLossCp ?? undefined,
    classification: row.classification ?? undefined,
    lines: Array.isArray(row.lines) ? row.lines : [],
    playedLine: row.playedLine ?? undefined,
  };
}

async function runSearch(
  session: StockfishSession | undefined,
  input: { fen: string; depth: number; multipv: number; searchMoves?: string[] },
  stats?: PositionAnalysisStats,
) {
  // BACKEND_STOCKFISH_CLEANUP_CANDIDATE: shared backend Stockfish dispatch for cached and uncached position analysis.
  stats && (stats.engineSearches += 1);
  const search = session ? session.search.bind(session) : StockfishEngine.search.bind(StockfishEngine);
  return search(input);
}

export const PositionAnalysisService = {
  analyzePositionSearch: async (
    input: { fen: string; depth: number; multipv: number },
    session?: StockfishSession,
    stats?: PositionAnalysisStats,
  ): Promise<StoredPositionAnalysis> => {
    const exact = await getCachedPositionAnalysis(input);
    if (exact) {
      stats && (stats.positionCacheHits += 1);
      return exact;
    }

    const compatible = await getCompatiblePositionAnalysis(input);
    if (compatible) {
      stats && (stats.positionCacheHits += 1);
      return compatible;
    }

    return analyzeAndStorePosition({
      fen: input.fen,
      depth: input.depth,
      multipv: input.multipv,
    }, session, stats);
  },

  getStoredPositionSearch: async (
    input: { fen: string; depth: number; multipv: number },
  ): Promise<StoredPositionAnalysis | null> => {
    const exact = await getCachedPositionAnalysis(input);
    if (exact) return exact;
    return getCompatiblePositionAnalysisFromAnyEngine(input);
  },

  storePositionSearch: async (input: StorePositionAnalysisInput): Promise<StoredPositionAnalysis> => {
    const { normalizedFen, classificationVersion, cacheKey } = cacheContext({
      fen: input.fen,
      depth: input.depth,
      multipv: input.multipv,
    });

    const existing = await findPositionAnalysis(cacheKey);
    if (existing) return storedFromRow(existing);

    const result: PositionAnalysisResult = {
      fen: input.fen,
      normalizedFen,
      depth: input.depth,
      multipv: input.multipv,
      engineName: input.engineName,
      engineVersion: input.engineVersion,
      classificationVersion,
      bestMoveUci: input.bestMoveUci ?? input.lines[0]?.moveUci ?? input.lines[0]?.pvUci[0],
      lines: input.lines.slice(0, input.multipv),
    };

    try {
      const created = await createPositionAnalysis(cacheKey, result);
      return { ...storedFromRow(created), fromCache: false };
    } catch {
      const row = await findPositionAnalysis(cacheKey);
      if (row) return storedFromRow(row);
      throw new Error('Could not store position analysis');
    }
  },

  analyzePosition: async (
    input: { fen: string; playedMoveUci?: string; depth: number; multipv: number },
    session?: StockfishSession,
    stats?: PositionAnalysisStats,
  ): Promise<StoredPositionAnalysis> => {
    if (!input.playedMoveUci) {
      return PositionAnalysisService.analyzePositionSearch(input, session, stats);
    }

    const cached = await getCachedPositionAnalysis(input);
    if (cached) {
      stats && (stats.positionCacheHits += 1);
      return cached;
    }

    const positionSearch = await PositionAnalysisService.analyzePositionSearch({
      fen: input.fen,
      depth: input.depth,
      multipv: input.multipv,
    }, session, stats);

    return analyzeAndStorePosition(input, session, stats, positionSearch);
  },
};

async function analyzeAndStorePosition(
  input: { fen: string; playedMoveUci?: string; depth: number; multipv: number },
  session?: StockfishSession,
  stats?: PositionAnalysisStats,
  positionSearch?: StoredPositionAnalysis,
): Promise<StoredPositionAnalysis> {
    // BACKEND_STOCKFISH_CLEANUP_CANDIDATE: backend Stockfish position analysis orchestration and persistence boundary.
    const { normalizedFen, engineName, engineVersion, classificationVersion, cacheKey } = cacheContext(input);

    const cached = await findPositionAnalysis(cacheKey);
    if (cached) {
      stats && (stats.positionCacheHits += 1);
      return storedFromRow(cached);
    }

    stats && (stats.positionCacheMisses += 1);

    const mainLines = positionSearch?.lines;
    const bestLine = mainLines?.[0];
    const bestMoveUci = positionSearch?.bestMoveUci ?? bestLine?.moveUci;

    const mainSearch = positionSearch
      ? {
        fen: positionSearch.fen,
        depth: positionSearch.depth,
        multipv: positionSearch.multipv,
        bestMoveUci,
        lines: positionSearch.lines,
      }
      : await runSearch(session, {
        fen: input.fen,
        depth: input.depth,
        multipv: input.multipv,
      }, stats);

    const resolvedBestLine = mainSearch.lines[0];
    const resolvedBestMoveUci = mainSearch.bestMoveUci ?? resolvedBestLine?.moveUci;
    const resultLines = mainSearch.lines.slice(0, input.multipv);

    let playedLine: EngineLine | undefined;
    if (input.playedMoveUci) {
      if (input.playedMoveUci === resolvedBestMoveUci) {
        playedLine = resolvedBestLine;
      } else {
        // BACKEND_STOCKFISH_CLEANUP_CANDIDATE: forced-move backend Stockfish search for played-move scoring.
        stats && (stats.forcedMoveSearches += 1);
        const forced = await runSearch(session, {
          fen: input.fen,
          depth: input.depth,
          multipv: 1,
          searchMoves: [input.playedMoveUci],
        }, stats);
        playedLine = forced.lines[0];
      }
    }

    const scoreLossCp = computeScoreLossCp(input.fen, resolvedBestLine, playedLine);
    const classification = classifyMove(scoreLossCp, input.playedMoveUci, resolvedBestMoveUci);

    const result: PositionAnalysisResult = {
      fen: input.fen,
      normalizedFen,
      playedMoveUci: input.playedMoveUci,
      depth: input.depth,
      multipv: input.multipv,
      engineName,
      engineVersion,
      classificationVersion,
      bestMoveUci: resolvedBestMoveUci,
      bestScoreCpWhite: resolvedBestLine?.scoreCpWhite,
      playedScoreCpWhite: playedLine?.scoreCpWhite,
      scoreLossCp,
      classification,
      lines: resultLines,
      playedLine,
    };

    try {
      const created = await createPositionAnalysis(cacheKey, result);
      return { ...storedFromRow(created), fromCache: false };
    } catch {
      const row = await findPositionAnalysis(cacheKey);
      if (row) return storedFromRow(row);
      throw new Error('Could not store position analysis');
    }
}
