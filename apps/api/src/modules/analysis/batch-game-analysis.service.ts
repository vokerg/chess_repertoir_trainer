import { Chess } from 'chess.js';
import {
  bestMateWhiteFrom,
  bestMoveUciFrom,
  bestScoreCpWhiteFrom,
  classifyPly,
  effectiveScoreCpWhite,
  firstUciMove,
  lineMoveUci,
  moveClassificationLabel,
  normalizeFenForPosition,
  normalizeStoredEngineLines,
  shapePositionAnalysisForStorage,
} from 'chess-domain';
import { ImportedGamesService } from '../imported-games/imported-games.service';
import { GameOpeningAssignmentService } from '../imported-games/game-opening-assignment.service';
import { isStandardImportedGameSpeed } from '../imported-games/imported-game-workflow-eligibility';
import { ImportedGamePlyIndexService } from '../imported-games/ply-index.service';
import prisma from '../../prisma';
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
import { PlyAnalysisUpdate, StorePositionAnalysisInput, StoredEngineLine, StoredPositionAnalysis } from './analysis.types';
import { PositionAnalysisService } from './position-analysis.service';
import { createStockfishEngine } from './stockfish-engine.factory';
import type { StockfishEngine } from './stockfish-engine';

interface BatchQueueItem {
  userId: number;
  gameIds: number[];
  force: boolean;
  refreshTagsAfterAnalysis: boolean;
}

interface EngineAvailability {
  unavailable: boolean;
}

const queue: BatchQueueItem[] = [];
let queueRunning = false;
const BATCH_ANALYSIS_WRITE_CHUNK_SIZE = 25;

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

function lineMove(line: StoredEngineLine): string | null {
  return lineMoveUci(line);
}

function bestMoveFor(analysis: StoredPositionAnalysis): string | null {
  return firstUciMove(analysis.bestMoveUci) ?? (analysis.lines[0] ? lineMove(analysis.lines[0]) : null);
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
    bestMoveUci: firstUciMove(row.bestMoveUci) ?? undefined,
    bestScoreCpWhite: row.bestScoreCpWhite ?? undefined,
    bestMateWhite: row.bestMateWhite ?? undefined,
    lines: Array.isArray(row.lines) ? row.lines : [],
    fromCache: true,
  };
}

function transientPositionAnalysis(input: StorePositionAnalysisInput): StoredPositionAnalysis {
  const lines = normalizeStoredEngineLines(input.lines);
  return {
    id: 0,
    positionId: 0,
    fen: input.fen,
    normalizedFen: normalizeFenForPosition(input.fen),
    bestMoveUci: bestMoveUciFrom(input, lines) ?? undefined,
    bestScoreCpWhite: bestScoreCpWhiteFrom(input, lines) ?? undefined,
    bestMateWhite: bestMateWhiteFrom(input, lines) ?? undefined,
    lines,
    fromCache: false,
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

class BatchAnalysisWriteBuffer {
  readonly pendingPositionInputs = new Map<string, StorePositionAnalysisInput>();
  readonly transientPositionCache = new Map<string, StoredPositionAnalysis>();
  readonly pendingPlyUpdates: PlyAnalysisUpdate[] = [];

  enqueuePosition(input: StorePositionAnalysisInput): StoredPositionAnalysis {
    const normalizedFen = normalizeFenForPosition(input.fen);
    const transient = transientPositionAnalysis(input);
    this.pendingPositionInputs.set(normalizedFen, shapePositionAnalysisForStorage({
      ...input,
      bestMoveUci: transient.bestMoveUci ?? null,
      bestScoreCpWhite: transient.bestScoreCpWhite ?? null,
      bestMateWhite: transient.bestMateWhite ?? null,
    }, 'compact'));
    this.transientPositionCache.set(normalizedFen, transient);
    return transient;
  }

  transientPosition(fen: string): StoredPositionAnalysis | null {
    return this.transientPositionCache.get(normalizeFenForPosition(fen)) ?? null;
  }

  async flushPendingPositionAnalyses(): Promise<void> {
    if (!this.pendingPositionInputs.size) return;

    const inputs = Array.from(this.pendingPositionInputs.entries()).slice(0, BATCH_ANALYSIS_WRITE_CHUNK_SIZE);
    for (const [normalizedFen] of inputs) {
      this.pendingPositionInputs.delete(normalizedFen);
    }

    const stored = await PositionAnalysisService.storePositionSearches(inputs.map(([, input]) => input));
    for (const position of stored) {
      if (position.normalizedFen) this.transientPositionCache.set(position.normalizedFen, position);
    }
  }

  enqueuePlyUpdate(update: PlyAnalysisUpdate): void {
    this.pendingPlyUpdates.push(update);
  }

  async flushPendingPlyUpdates(userId: number, gameId: number): Promise<void> {
    if (!this.pendingPlyUpdates.length) return;
    const updates = this.pendingPlyUpdates.splice(0, BATCH_ANALYSIS_WRITE_CHUNK_SIZE);
    await updateImportedGamePlyAnalysis(userId, gameId, updates);
  }
}

async function getOrCreatePositionAnalysis(
  engine: StockfishEngine,
  fen: string,
  options: { depth: number; multipv: number; continueWithoutEngine: boolean },
  engineAvailability: EngineAvailability,
  buffer: BatchAnalysisWriteBuffer,
): Promise<StoredPositionAnalysis | null> {
  const cached = await PositionAnalysisService.getStoredPositionSearch({ fen });
  if (cached) return cached;
  const transient = buffer.transientPosition(fen);
  if (transient) return transient;
  if (engineAvailability.unavailable) return null;

  try {
    const engineResult = await engine.analyzePosition(toEngineFen(fen), options);
    return buffer.enqueuePosition(engineResult);
  } catch (error) {
    if (!options.continueWithoutEngine || !isEngineUnavailableError(error)) throw error;
    engineAvailability.unavailable = true;
    console.warn('Local Stockfish is unavailable; continuing full refresh with cached position analysis only');
    return null;
  }
}

async function analysePly(
  engine: StockfishEngine,
  ply: any,
  options: { depth: number; multipv: number; continueWithoutEngine: boolean },
  engineAvailability: EngineAvailability,
  buffer: BatchAnalysisWriteBuffer,
): Promise<PlyAnalysisUpdate | null> {
  const beforeFen = ply.position.normalizedFen;
  const beforeAnalysis =
    compactPositionAnalysis(ply.position.analysis) ??
    (await getOrCreatePositionAnalysis(engine, beforeFen, options, engineAvailability, buffer));
  if (!beforeAnalysis) return null;

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
    const afterAnalysis = await getOrCreatePositionAnalysis(
      engine,
      afterFen,
      options,
      engineAvailability,
      buffer,
    );
    if (!afterAnalysis) return null;
    playedEvalCpWhite = bestEvalCpWhite(afterAnalysis);
  }

  const scoreLossCp = scoreLossForSide(bestEvalCpWhite(beforeAnalysis), playedEvalCpWhite, side);
  const classificationCode = classifyPly({
    moveUci: playedMoveUci,
    bestMoveUci,
    scoreLossCp,
  });

  return {
    plyNumber: ply.plyNumber,
    scoreLossCp,
    classificationCode,
  };
}

async function completeRun(
  userId: number,
  runId: number,
  importedGameId: number,
  positionsTotal: number,
  positionsDone: number,
  userColor?: string | null,
) {
  const plies = await getImportedGamePliesForAnalysisSummary(userId, importedGameId);
  const accuracy = buildAccuracySummary(plies, userColor);

  await completeGameAnalysisRun(runId, {
    positionsTotal,
    positionsDone,
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

async function analyseGame(
  engine: StockfishEngine,
  userId: number,
  importedGameId: number,
  options: {
    depth: number;
    multipv: number;
    force: boolean;
    refreshTagsAfterAnalysis: boolean;
  },
) {
  const game = await getImportedGameForAnalysis(userId, importedGameId);
  if (!game) throw new Error('Imported game not found');
  if (!isStandardImportedGameSpeed(game.speedCategory)) {
    return;
  }

  const indexResult = await ImportedGamePlyIndexService.indexOne(userId, importedGameId, {
    force: options.force,
  });
  if (indexResult.status === 'FAILED') {
    throw new Error(indexResult.error || 'Could not index game plies');
  }
  await GameOpeningAssignmentService.assignMissingOpening(userId, importedGameId);

  const plies = await getImportedGamePliesForBatchAnalysis(userId, importedGameId);
  const alreadyDone = options.force ? 0 : plies.filter(isPlyAnalysed).length;
  const run = await createRunningGameAnalysisRun({
    importedGameId,
    positionsTotal: plies.length,
    positionsDone: alreadyDone,
  });

  let done = alreadyDone;
  const engineAvailability: EngineAvailability = { unavailable: false };
  const buffer = new BatchAnalysisWriteBuffer();

  const flushPositionChunks = async () => {
    let flushed = false;
    while (buffer.pendingPositionInputs.size >= BATCH_ANALYSIS_WRITE_CHUNK_SIZE) {
      await buffer.flushPendingPositionAnalyses();
      flushed = true;
    }
    return flushed;
  };

  const flushPlyChunks = async () => {
    let flushed = false;
    while (buffer.pendingPlyUpdates.length >= BATCH_ANALYSIS_WRITE_CHUNK_SIZE) {
      await buffer.flushPendingPlyUpdates(userId, importedGameId);
      flushed = true;
    }
    return flushed;
  };

  try {
    for (const ply of plies) {
      if (!options.force && isPlyAnalysed(ply)) continue;
      const update = await analysePly(
        engine,
        ply,
        {
          ...options,
          continueWithoutEngine: options.force && options.refreshTagsAfterAnalysis,
        },
        engineAvailability,
        buffer,
      );
      if (!update) continue;
      buffer.enqueuePlyUpdate(update);
      done += 1;

      const flushedPositions = await flushPositionChunks();
      const flushedPlies = await flushPlyChunks();
      if (flushedPositions || flushedPlies) {
        await updateGameAnalysisRunProgress(run.id, { positionsDone: done, positionsTotal: plies.length });
      }
    }

    while (buffer.pendingPositionInputs.size > 0) {
      await buffer.flushPendingPositionAnalyses();
    }
    while (buffer.pendingPlyUpdates.length > 0) {
      await buffer.flushPendingPlyUpdates(userId, importedGameId);
    }
    await updateGameAnalysisRunProgress(run.id, { positionsDone: done, positionsTotal: plies.length });
    await completeRun(userId, run.id, importedGameId, plies.length, done, game.userColor);
  } catch (err: any) {
    await failGameAnalysisRun(run.id, err?.message ?? String(err));
    throw err;
  }

  if (options.refreshTagsAfterAnalysis) {
    await ImportedGamesService.refreshTags(userId, importedGameId);
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
      const engine = createStockfishEngine(config);

      try {
        for (const gameId of item.gameIds) {
          try {
            await analyseGame(engine, item.userId, gameId, {
              depth: config.depth,
              multipv: config.multipv,
              force: item.force,
              refreshTagsAfterAnalysis: item.refreshTagsAfterAnalysis,
            });
          } catch (err) {
            console.error(`Failed to batch analyse imported game ${gameId}`, err);
          }
        }
      } catch (err) {
        console.error('Could not start Stockfish batch analysis', err);
      } finally {
        engine.dispose();
      }
    }
  } finally {
    queueRunning = false;
  }
}

async function eligibleStandardGameIds(userId: number, gameIds: number[]): Promise<number[]> {
  const games = await prisma.importedGame.findMany({
    where: {
      userId,
      id: { in: gameIds },
    },
    select: {
      id: true,
      speedCategory: true,
    },
  });
  const requestedOrder = new Map(gameIds.map((id, index) => [id, index]));
  return games
    .filter((game) => isStandardImportedGameSpeed(game.speedCategory))
    .sort((a, b) => (requestedOrder.get(a.id) ?? 0) - (requestedOrder.get(b.id) ?? 0))
    .map((game) => game.id);
}

export const ImportedGameBatchAnalysisService = {
  enqueue: async (userId: number, gameIds: number[]) => {
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      throw new Error('Local batch Stockfish analysis is disabled');
    }

    const uniqueGameIds = Array.from(new Set(gameIds)).filter((id) => Number.isInteger(id) && id > 0);
    const eligibleGameIds = await eligibleStandardGameIds(userId, uniqueGameIds);
    if (!eligibleGameIds.length) {
      throw new Error('No eligible blitz or rapid imported games selected for batch analysis');
    }

    queue.push({
      userId,
      gameIds: eligibleGameIds,
      force: false,
      refreshTagsAfterAnalysis: true,
    });
    void drainQueue().catch((err) => {
      console.error('Local Stockfish batch analysis queue failed', err);
    });
    return eligibleGameIds;
  },
  enqueueFullRefresh: async (userId: number, gameId: number) => {
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      throw new Error('Local batch Stockfish analysis is disabled');
    }
    if (!Number.isInteger(gameId) || gameId <= 0) {
      throw new Error('Invalid imported game id');
    }
    const eligibleGameIds = await eligibleStandardGameIds(userId, [gameId]);
    if (!eligibleGameIds.length) {
      throw new Error('No eligible blitz or rapid imported games selected for full refresh');
    }

    queue.push({
      userId,
      gameIds: eligibleGameIds,
      force: true,
      refreshTagsAfterAnalysis: true,
    });
    void drainQueue().catch((err) => {
      console.error('Local Stockfish full refresh queue failed', err);
    });
  },
};

function isEngineUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as NodeJS.ErrnoException;
  return candidate.code === 'ENOENT' || candidate.code === 'EACCES' || candidate.code === 'EPERM';
}
