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
import { isStandardImportedGameSpeed } from '../imported-games/imported-game-workflow-eligibility';
import { buildGameAccuracySummary, sideForPly } from './accuracy';
import {
  completeGameAnalysisRun,
  createRunningGameAnalysisRun,
  failGameAnalysisRun,
  getImportedGameForAnalysis,
  getImportedGamePliesForAnalysisSummary,
  getImportedGamePliesForBatchAnalysis,
  getLatestGameAnalysisForImportedGame,
  updateGameAnalysisRunProgress,
  updateImportedGamePlyAnalysis,
} from './analysis.repository.prisma';
import type {
  PlyAnalysisUpdate,
  StorePositionAnalysisInput,
  StoredEngineLine,
  StoredPositionAnalysis,
} from './analysis.types';
import { PositionAnalysisService } from './position-analysis.service';
import type { StockfishEngine } from './stockfish-engine';

export type ImportedGameAnalysisExecutionStatus = 'COMPLETED' | 'SKIPPED';

export interface ImportedGameAnalysisOptions {
  depth: number;
  multipv: number;
  force: boolean;
  refreshTagsAfterAnalysis: boolean;
  signal?: AbortSignal;
}

interface EngineAvailability {
  unavailable: boolean;
}

const ANALYSIS_WRITE_CHUNK_SIZE = 25;

function isPlyAnalysed(ply: {
  scoreLossCp: number | null;
  classificationCode: number | null;
}): boolean {
  return ply.scoreLossCp !== null
    && ply.scoreLossCp !== undefined
    && ply.classificationCode !== null
    && ply.classificationCode !== undefined;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Imported-game analysis was aborted.');
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
  return firstUciMove(analysis.bestMoveUci)
    ?? (analysis.lines[0] ? lineMove(analysis.lines[0]) : null);
}

function bestEvalCpWhite(analysis: StoredPositionAnalysis): number | null {
  return effectiveScoreCpWhite(analysis.bestScoreCpWhite, analysis.bestMateWhite);
}

function playedEvalFromMatchingLine(
  analysis: StoredPositionAnalysis,
  moveUci: string,
): number | null {
  const line = analysis.lines.find((candidate) => lineMove(candidate) === moveUci);
  return line ? effectiveScoreCpWhite(line.scoreCpWhite, line.mateWhite) : null;
}

function scoreLossForSide(
  bestCpWhite: number | null,
  playedCpWhite: number | null,
  side: 'WHITE' | 'BLACK',
): number | null {
  if (bestCpWhite === null || playedCpWhite === null) return null;
  const rawLoss = side === 'WHITE'
    ? bestCpWhite - playedCpWhite
    : playedCpWhite - bestCpWhite;
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

class AnalysisWriteBuffer {
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

    const inputs = Array.from(this.pendingPositionInputs.entries())
      .slice(0, ANALYSIS_WRITE_CHUNK_SIZE);
    for (const [normalizedFen] of inputs) {
      this.pendingPositionInputs.delete(normalizedFen);
    }

    const stored = await PositionAnalysisService.storePositionSearches(
      inputs.map(([, input]) => input),
    );
    for (const position of stored) {
      if (position.normalizedFen) {
        this.transientPositionCache.set(position.normalizedFen, position);
      }
    }
  }

  enqueuePlyUpdate(update: PlyAnalysisUpdate): void {
    this.pendingPlyUpdates.push(update);
  }

  async flushPendingPlyUpdates(userId: number, gameId: number): Promise<void> {
    if (!this.pendingPlyUpdates.length) return;
    const updates = this.pendingPlyUpdates.splice(0, ANALYSIS_WRITE_CHUNK_SIZE);
    await updateImportedGamePlyAnalysis(userId, gameId, updates);
  }
}

async function getOrCreatePositionAnalysis(
  engine: StockfishEngine,
  fen: string,
  options: {
    depth: number;
    multipv: number;
    continueWithoutEngine: boolean;
    signal?: AbortSignal;
  },
  engineAvailability: EngineAvailability,
  buffer: AnalysisWriteBuffer,
): Promise<StoredPositionAnalysis | null> {
  throwIfAborted(options.signal);
  const cached = await PositionAnalysisService.getStoredPositionSearch({ fen });
  if (cached) return cached;
  const transient = buffer.transientPosition(fen);
  if (transient) return transient;
  if (engineAvailability.unavailable) return null;

  try {
    throwIfAborted(options.signal);
    const engineResult = await engine.analyzePosition(toEngineFen(fen), {
      depth: options.depth,
      multipv: options.multipv,
    });
    throwIfAborted(options.signal);
    return buffer.enqueuePosition(engineResult);
  } catch (error) {
    if (!options.continueWithoutEngine || !isEngineUnavailableError(error)) throw error;
    engineAvailability.unavailable = true;
    console.warn(
      'Local Stockfish is unavailable; continuing full refresh with cached position analysis only',
    );
    return null;
  }
}

async function analysePly(
  engine: StockfishEngine,
  ply: any,
  options: {
    depth: number;
    multipv: number;
    continueWithoutEngine: boolean;
    signal?: AbortSignal;
  },
  engineAvailability: EngineAvailability,
  buffer: AnalysisWriteBuffer,
): Promise<PlyAnalysisUpdate | null> {
  throwIfAborted(options.signal);
  const beforeFen = ply.position.normalizedFen;
  const beforeAnalysis = compactPositionAnalysis(ply.position.analysis)
    ?? (await getOrCreatePositionAnalysis(
      engine,
      beforeFen,
      options,
      engineAvailability,
      buffer,
    ));
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

  const scoreLossCp = scoreLossForSide(
    bestEvalCpWhite(beforeAnalysis),
    playedEvalCpWhite,
    side,
  );
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
): Promise<void> {
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

async function analysisIsCurrent(
  userId: number,
  importedGameId: number,
  positionsTotal: number,
): Promise<boolean> {
  const latest = await getLatestGameAnalysisForImportedGame(userId, importedGameId);
  return latest?.status === 'COMPLETED'
    && latest.positionsDone >= positionsTotal
    && latest.positionsTotal >= positionsTotal;
}

export const ImportedGameAnalysisService = {
  async analyseOne(
    engine: StockfishEngine,
    userId: number,
    importedGameId: number,
    options: ImportedGameAnalysisOptions,
  ): Promise<ImportedGameAnalysisExecutionStatus> {
    throwIfAborted(options.signal);
    const game = await getImportedGameForAnalysis(userId, importedGameId);
    if (!game) throw new Error('Imported game not found');
    if (!isStandardImportedGameSpeed(game.speedCategory)) return 'SKIPPED';
    if (!game.plyIndexedAt) {
      throw new Error('Imported game must be indexed before analysis');
    }

    const plies = await getImportedGamePliesForBatchAnalysis(userId, importedGameId);
    const alreadyDone = options.force ? 0 : plies.filter(isPlyAnalysed).length;

    if (
      !options.force
      && alreadyDone === plies.length
      && await analysisIsCurrent(userId, importedGameId, plies.length)
    ) {
      if (options.refreshTagsAfterAnalysis) {
        throwIfAborted(options.signal);
        await ImportedGamesService.refreshTags(userId, importedGameId);
      }
      return 'SKIPPED';
    }

    throwIfAborted(options.signal);
    const run = await createRunningGameAnalysisRun({
      importedGameId,
      positionsTotal: plies.length,
      positionsDone: alreadyDone,
    });

    let done = alreadyDone;
    const engineAvailability: EngineAvailability = { unavailable: false };
    const buffer = new AnalysisWriteBuffer();

    const flushPositionChunks = async () => {
      let flushed = false;
      while (buffer.pendingPositionInputs.size >= ANALYSIS_WRITE_CHUNK_SIZE) {
        throwIfAborted(options.signal);
        await buffer.flushPendingPositionAnalyses();
        flushed = true;
      }
      return flushed;
    };

    const flushPlyChunks = async () => {
      let flushed = false;
      while (buffer.pendingPlyUpdates.length >= ANALYSIS_WRITE_CHUNK_SIZE) {
        throwIfAborted(options.signal);
        await buffer.flushPendingPlyUpdates(userId, importedGameId);
        flushed = true;
      }
      return flushed;
    };

    try {
      for (const ply of plies) {
        throwIfAborted(options.signal);
        if (!options.force && isPlyAnalysed(ply)) continue;
        const update = await analysePly(
          engine,
          ply,
          {
            depth: options.depth,
            multipv: options.multipv,
            continueWithoutEngine: options.force && options.refreshTagsAfterAnalysis,
            signal: options.signal,
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
          throwIfAborted(options.signal);
          await updateGameAnalysisRunProgress(run.id, {
            positionsDone: done,
            positionsTotal: plies.length,
          });
        }
      }

      while (buffer.pendingPositionInputs.size > 0) {
        throwIfAborted(options.signal);
        await buffer.flushPendingPositionAnalyses();
      }
      while (buffer.pendingPlyUpdates.length > 0) {
        throwIfAborted(options.signal);
        await buffer.flushPendingPlyUpdates(userId, importedGameId);
      }
      throwIfAborted(options.signal);
      await updateGameAnalysisRunProgress(run.id, {
        positionsDone: done,
        positionsTotal: plies.length,
      });
      await completeRun(
        userId,
        run.id,
        importedGameId,
        plies.length,
        done,
        game.userColor,
      );
    } catch (error) {
      try {
        await failGameAnalysisRun(
          run.id,
          error instanceof Error ? error.message : String(error),
        );
      } catch (failureError) {
        console.error('Could not persist imported-game analysis failure', failureError);
      }
      throw error;
    }

    if (options.refreshTagsAfterAnalysis) {
      throwIfAborted(options.signal);
      await ImportedGamesService.refreshTags(userId, importedGameId);
    }

    return 'COMPLETED';
  },
};

function isEngineUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as NodeJS.ErrnoException;
  return candidate.code === 'ENOENT'
    || candidate.code === 'EACCES'
    || candidate.code === 'EPERM';
}
