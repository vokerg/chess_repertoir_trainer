import crypto from 'crypto';
import { Chess } from 'chess.js';
import { StockfishEngine, StockfishSession } from './engine/stockfish-engine';
import {
  ANALYSIS_CLASSIFICATION_VERSION,
  EngineLine,
  MoveClassification,
  PositionAnalysisResult,
  StoredPositionAnalysis,
} from './analysis.types';
import { createPositionAnalysis, findPositionAnalysis } from './analysis.repository.prisma';

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

async function runSearch(session: StockfishSession | undefined, input: { fen: string; depth: number; multipv: number; searchMoves?: string[] }) {
  const search = session ? session.search.bind(session) : StockfishEngine.search.bind(StockfishEngine);
  return search(input);
}

export const PositionAnalysisService = {
  analyzePosition: async (
    input: { fen: string; playedMoveUci?: string; depth: number; multipv: number },
    session?: StockfishSession,
  ): Promise<StoredPositionAnalysis> => {
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

    const cached = await findPositionAnalysis(cacheKey);
    if (cached) return storedFromRow(cached);

    const mainSearch = await runSearch(session, {
      fen: input.fen,
      depth: input.depth,
      multipv: input.multipv,
    });

    const bestLine = mainSearch.lines[0];
    const bestMoveUci = mainSearch.bestMoveUci ?? bestLine?.moveUci;

    let playedLine: EngineLine | undefined;
    if (input.playedMoveUci) {
      if (input.playedMoveUci === bestMoveUci) {
        playedLine = bestLine;
      } else {
        const forced = await runSearch(session, {
          fen: input.fen,
          depth: input.depth,
          multipv: 1,
          searchMoves: [input.playedMoveUci],
        });
        playedLine = forced.lines[0];
      }
    }

    const scoreLossCp = computeScoreLossCp(input.fen, bestLine, playedLine);
    const classification = classifyMove(scoreLossCp, input.playedMoveUci, bestMoveUci);

    const result: PositionAnalysisResult = {
      fen: input.fen,
      normalizedFen,
      playedMoveUci: input.playedMoveUci,
      depth: input.depth,
      multipv: input.multipv,
      engineName,
      engineVersion,
      classificationVersion,
      bestMoveUci,
      bestScoreCpWhite: bestLine?.scoreCpWhite,
      playedScoreCpWhite: playedLine?.scoreCpWhite,
      scoreLossCp,
      classification,
      lines: mainSearch.lines,
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
  },
};
