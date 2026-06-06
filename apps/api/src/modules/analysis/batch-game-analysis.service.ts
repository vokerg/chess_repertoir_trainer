import { Chess } from 'chess.js';
import { classifyPly, moveClassificationLabel } from 'chess-domain';
import { CurrentUserService } from '../../services/currentUserService';
import { ImportedGamePlyIndexService } from '../imported-games/ply-index.service';
import { buildGameAccuracySummary, sideForPly } from './accuracy';
import {
  completeGameAnalysisRun,
  createRunningGameAnalysisRun,
  failGameAnalysisRun,
  getImportedGameForAnalysis,
  getImportedGamePliesForAnalysisSummary,
  getImportedGamePliesForBatchAnalysis,
  updateGameAnalysisRunProgress,
  updateImportedGamePlyAnalysis,
} from './analysis.repository.prisma';
import { getLocalBatchStockfishAnalysisConfig, isLocalBatchStockfishAnalysisEnabled } from './batch-analysis.config';
import { LocalStockfishEngineService } from './local-stockfish-engine.service';
import { StoredEngineLine, StoredPositionAnalysis } from './analysis.types';
import { PositionAnalysisService } from './position-analysis.service';

interface BatchQueueItem {
  gameIds: number[];
}

const queue: BatchQueueItem[] = [];
let queueRunning = false;

function isPlyAnalysed(ply: { scoreLossCp: number | null; classificationCode: number | null }): boolean {
  return ply.scoreLossCp !== null && ply.scoreLossCp !== undefined && ply.classificationCode !== null && ply.classificationCode !== undefined;
}

function toEngineFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.length >= 6 ? fen : `${parts.slice(0, 4).join(' ')} 0 1`;
}

function sideToMove(fen: string): 'WHITE' | 'BLACK' {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'BLACK' : 'WHITE';
}

function effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null): number | null {
  if (typeof scoreCpWhite === 'number' && Number.isFinite(scoreCpWhite)) return scoreCpWhite;
  if (typeof mateWhite !== 'number' || !Number.isFinite(mateWhite)) return null;
  return mateWhite >= 0 ? 1000 : -1000;
}

function lineMove(line: StoredEngineLine): string | null {
  return line.moveUci ?? line.pvUci?.[0] ?? null;
}

function bestMoveFor(analysis: StoredPositionAnalysis): string | null {
  return analysis.bestMoveUci ?? (analysis.lines[0] ? lineMove(analysis.lines[0]) : null);
}

function bestEvalCpWhite(analysis: StoredPositionAnalysis): number | null {
  return effectiveScoreCpWhite(analysis.bestScoreCpWhite, analysis.bestMateWhite);
}

function playedEvalFromMatchingLine(analysis: StoredPositionAnalysis, moveUci: string): number | null {
  const line = analysis.lines.find((candidate) => lineMove(candidate) === moveUci);
  return line ? effectiveScoreCpWhite(line.scoreCpWhite, line.mateWhite) : null;
}

function scoreLossForSide(bestCpWhite: number | null, playedCpWhite: number | null, side: 'WHITE' | 'BLACK'): number | null {
  if (bestCpWhite === null || playedCpWhite === null) return null;
  const rawLoss = side === 'WHITE' ? bestCpWhite - playedCpWhite : playedCpWhite - bestCpWhite;
  return Math.max(0, Math.min(32_000, Math.round(rawLoss)));
}

function fenAfterMove(fen: string, moveUci: string): string {
  const chess = new Chess(toEngineFen(fen));
  const move = chess.move({
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.length > 4 ? moveUci[4] : undefined,
  });
  if (!move) throw new Error(`Could not apply move ${moveUci}`);
  return chess.fen();
}

function compactPositionAnalysis(row: any): StoredPositionAnalysis | null {
  if (!row) return null;
  return {
    id: row.id,
    positionId: row.positionId,
    normalizedFen: row.position?.normalizedFen ?? '',
    bestMoveUci: row.bestMoveUci ?? undefined,
    bestScoreCpWhite: row.bestScoreCpWhite ?? undefined,
    bestMateWhite: row.bestMateWhite ?? undefined,
    lines: Array.isArray(row.lines) ? row.lines : [],
    fromCache: true,
  };
}

function summaryKey(classificationCode: number | null | undefined): string | null {
  if (!classificationCode) return null;
  const label = moveClassificationLabel(classificationCode);
  if (label === 'Not analysed') return null;
  return label.toUpperCase().replace(/\s+/g, '_');
}

function emptySideSummary() {
  return {
    BOOK: 0,
    BEST: 0,
    GOOD: 0,
    INACCURACY: 0,
    MISTAKE: 0,
    BLUNDER: 0,
    MISSED_OPPORTUNITY: 0,
    BRILLIANT: 0,
    FORCED: 0,
  };
}

function buildSummary(plies: any[]) {
  const summary = {
    totalMoves: plies.length,
    white: emptySideSummary(),
    black: emptySideSummary(),
    criticalPlyNumbers: [] as number[],
  };

  for (const ply of plies) {
    const key = summaryKey(ply.classificationCode);
    if (!key) continue;
    const bucket = sideForPly(ply.plyNumber) === 'WHITE' ? summary.white : summary.black;
    if (key in bucket) bucket[key as keyof typeof bucket] += 1;
    if (ply.classificationCode === 5 || ply.classificationCode === 6) {
      summary.criticalPlyNumbers.push(ply.plyNumber);
    }
  }

  return summary;
}

function buildAccuracySummary(plies: any[], userColor?: string | null) {
  return buildGameAccuracySummary(
    plies.map((ply: any, index: number) => ({
      plyNumber: ply.plyNumber,
      moveUci: ply.moveUci,
      scoreLossCp: ply.scoreLossCp ?? null,
      classificationCode: ply.classificationCode ?? null,
      positionAnalysis: ply.position?.analysis ?? null,
      resultingPositionAnalysis: plies[index + 1]?.position?.analysis ?? null,
    })),
    userColor,
  );
}

async function getOrCreatePositionAnalysis(
  engine: LocalStockfishEngineService,
  fen: string,
  options: { depth: number; multipv: number },
): Promise<StoredPositionAnalysis> {
  const cached = await PositionAnalysisService.getStoredPositionSearch(fen ? { fen, depth: options.depth, multipv: options.multipv } : { fen });
  if (cached) return cached;
  const engineResult = await engine.analyzePosition(toEngineFen(fen), options);
  return PositionAnalysisService.storePositionSearch(engineResult);
}

async function analysePly(
  engine: LocalStockfishEngineService,
  gameId: number,
  ply: any,
  options: { depth: number; multipv: number },
) {
  const beforeFen = ply.position.normalizedFen;
  const beforeAnalysis =
    compactPositionAnalysis(ply.position.analysis) ??
    (await getOrCreatePositionAnalysis(engine, beforeFen, options));

  const playedMoveUci = ply.moveUci;
  const bestMoveUci = bestMoveFor(beforeAnalysis);
  const side = sideToMove(beforeFen);
  const matchingLineEval = playedEvalFromMatchingLine(beforeAnalysis, playedMoveUci);

  let playedEvalCpWhite = matchingLineEval;
  if (playedEvalCpWhite === null && bestMoveUci === playedMoveUci) {
    playedEvalCpWhite = bestEvalCpWhite(beforeAnalysis);
  }

  if (playedEvalCpWhite === null) {
    const afterFen = fenAfterMove(beforeFen, playedMoveUci);
    const afterAnalysis = await getOrCreatePositionAnalysis(engine, afterFen, options);
    playedEvalCpWhite = bestEvalCpWhite(afterAnalysis);
  }

  const scoreLossCp = scoreLossForSide(bestEvalCpWhite(beforeAnalysis), playedEvalCpWhite, side);
  const classificationCode = classifyPly({
    moveUci: playedMoveUci,
    bestMoveUci,
    scoreLossCp,
  });

  await updateImportedGamePlyAnalysis(gameId, [
    {
      plyNumber: ply.plyNumber,
      scoreLossCp,
      classificationCode,
    },
  ]);
}

async function completeRun(runId: number, importedGameId: number, positionsTotal: number, userColor?: string | null) {
  const plies = await getImportedGamePliesForAnalysisSummary(importedGameId);
  const accuracy = buildAccuracySummary(plies, userColor);

  await completeGameAnalysisRun(runId, {
    positionsTotal,
    positionsDone: positionsTotal,
    summary: buildSummary(plies),
    accuracyVersion: accuracy.version,
    whiteAccuracy: accuracy.white.accuracy,
    blackAccuracy: accuracy.black.accuracy,
    whiteAverageCentipawnLoss: accuracy.white.averageCentipawnLoss,
    blackAverageCentipawnLoss: accuracy.black.averageCentipawnLoss,
    whiteMovesAnalyzed: accuracy.white.moves,
    blackMovesAnalyzed: accuracy.black.moves,
  });
}

async function analyseGame(engine: LocalStockfishEngineService, importedGameId: number, options: { depth: number; multipv: number }) {
  const game = await getImportedGameForAnalysis(importedGameId);
  if (!game) throw new Error('Imported game not found');

  const indexResult = await ImportedGamePlyIndexService.indexOne(importedGameId, { force: false });
  if (indexResult.status === 'FAILED') {
    throw new Error(indexResult.error || 'Could not index game plies');
  }

  const plies = await getImportedGamePliesForBatchAnalysis(importedGameId);
  const alreadyDone = plies.filter(isPlyAnalysed).length;
  const run = await createRunningGameAnalysisRun({
    importedGameId,
    positionsTotal: plies.length,
    positionsDone: alreadyDone,
  });

  let done = alreadyDone;
  try {
    for (const ply of plies) {
      if (isPlyAnalysed(ply)) continue;
      await analysePly(engine, importedGameId, ply, options);
      done += 1;
      await updateGameAnalysisRunProgress(run.id, { positionsDone: done, positionsTotal: plies.length });
    }

    await completeRun(run.id, importedGameId, plies.length, game.userColor);
  } catch (err: any) {
    await failGameAnalysisRun(run.id, err?.message ?? String(err));
    throw err;
  }
}

async function drainQueue() {
  if (queueRunning) return;
  queueRunning = true;

  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const config = getLocalBatchStockfishAnalysisConfig();
      const engine = new LocalStockfishEngineService({
        stockfishPath: config.stockfishPath,
        timeoutMs: config.timeoutMs,
      });

      try {
        await engine.init();
        for (const gameId of item.gameIds) {
          try {
            await analyseGame(engine, gameId, { depth: config.depth, multipv: config.multipv });
          } catch (err) {
            console.error(`Failed to batch analyse imported game ${gameId}`, err);
          }
        }
      } finally {
        engine.dispose();
      }
    }
  } finally {
    queueRunning = false;
  }
}

export const ImportedGameBatchAnalysisService = {
  enqueue: (gameIds: number[]) => {
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      throw new Error('Local batch Stockfish analysis is disabled');
    }

    const uniqueGameIds = Array.from(new Set(gameIds)).filter((id) => Number.isInteger(id) && id > 0);
    if (!uniqueGameIds.length) {
      throw new Error('No imported games selected for batch analysis');
    }

    void CurrentUserService.getOrCreate()
      .then(() => {
        queue.push({ gameIds: uniqueGameIds });
        void drainQueue();
      })
      .catch((err) => {
        console.error('Could not enqueue local batch Stockfish analysis', err);
      });
  },
};
