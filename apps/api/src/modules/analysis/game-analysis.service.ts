import { Chess } from 'chess.js';
import { CurrentUserService } from '../../services/currentUserService';
import { ANALYSIS_ACCURACY_VERSION, GameAccuracyTracker } from './accuracy';
import { StockfishEngine, StockfishSession } from './engine/stockfish-engine';
import { PositionAnalysisService, PositionAnalysisStats } from './position-analysis.service';
import {
  claimNextQueuedGameAnalysisRun,
  completeGameAnalysisRun,
  createGameAnalysisRun,
  createGameMoveAnalysis,
  failGameAnalysisRun,
  getExistingGameAnalysis,
  getGameAnalysisRunForExecution,
  getImportedGameForAnalysis,
  getLatestGameAnalysisForImportedGame,
  interruptRunningAnalysisRuns,
  markGameAnalysisRunRunning,
  updateGameAnalysisRunProgress,
} from './analysis.repository.prisma';
import { MoveClassification, ParsedGameMove } from './analysis.types';

interface CompactAnalysisMove {
  id: number;
  plyNumber: number;
  moveNumber: number;
  side: string;
  playedMoveUci: string;
  playedMoveSan: string | null;
  classification: string | null;
  scoreLossCp: number | null;
  bestMoveUci: string | null;
  bestScoreCpWhite: number | null;
  playedScoreCpWhite: number | null;
  positionAnalysisId: number;
}

interface AnalyzeImportedGameOptions {
  depth: number;
  multipv: number;
  force: boolean;
  async?: boolean;
}

function toUci(move: any): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function parsePgnMoves(pgn: string): ParsedGameMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    throw new Error('Could not parse imported game PGN');
  }

  const history = chess.history({ verbose: true }) as any[];
  return history.map((move, index) => {
    const plyNumber = index + 1;
    if (!move.before || !move.after) {
      throw new Error('Could not reconstruct move positions from imported game PGN');
    }
    return {
      plyNumber,
      moveNumber: Math.ceil(plyNumber / 2),
      side: move.color === 'b' ? 'BLACK' : 'WHITE',
      fenBefore: move.before,
      fenAfter: move.after,
      playedMoveUci: toUci(move),
      playedMoveSan: move.san,
    };
  });
}

function emptySummary() {
  return {
    totalMoves: 0,
    white: { BEST: 0, GOOD: 0, INACCURACY: 0, MISTAKE: 0, BLUNDER: 0 },
    black: { BEST: 0, GOOD: 0, INACCURACY: 0, MISTAKE: 0, BLUNDER: 0 },
    criticalPlyNumbers: [] as number[],
    accuracy: {
      version: ANALYSIS_ACCURACY_VERSION,
      white: { moves: 0, averageCentipawnLoss: null as number | null, accuracy: null as number | null },
      black: { moves: 0, averageCentipawnLoss: null as number | null, accuracy: null as number | null },
    },
    performance: {
      durationMs: 0,
      positionCacheHits: 0,
      positionCacheMisses: 0,
      engineSearches: 0,
      forcedMoveSearches: 0,
    },
  };
}

function addToSummary(summary: ReturnType<typeof emptySummary>, move: ParsedGameMove, classification?: string) {
  summary.totalMoves += 1;
  const bucket = move.side === 'WHITE' ? summary.white : summary.black;
  if (classification && classification in bucket) {
    bucket[classification as MoveClassification] += 1;
  }
  if (classification === 'MISTAKE' || classification === 'BLUNDER') {
    summary.criticalPlyNumbers.push(move.plyNumber);
  }
}

function compactMove(move: any): CompactAnalysisMove {
  return {
    id: move.id,
    plyNumber: move.plyNumber,
    moveNumber: move.moveNumber,
    side: move.side,
    playedMoveUci: move.playedMoveUci,
    playedMoveSan: move.playedMoveSan ?? null,
    classification: move.classification ?? null,
    scoreLossCp: move.scoreLossCp ?? null,
    bestMoveUci: move.positionAnalysis?.bestMoveUci ?? null,
    bestScoreCpWhite: move.positionAnalysis?.bestScoreCpWhite ?? null,
    playedScoreCpWhite: move.positionAnalysis?.playedScoreCpWhite ?? null,
    positionAnalysisId: move.positionAnalysisId,
  };
}

function compactRun(run: any) {
  const moves: CompactAnalysisMove[] = Array.isArray(run.moves) ? run.moves.map(compactMove) : [];
  const criticalMoves = moves.filter((move: CompactAnalysisMove) => move.classification === 'MISTAKE' || move.classification === 'BLUNDER');

  return {
    id: run.id,
    importedGameId: run.importedGameId,
    status: run.status,
    depth: run.depth,
    multipv: run.multipv,
    engineName: run.engineName,
    engineVersion: run.engineVersion,
    positionsTotal: run.positionsTotal,
    positionsDone: run.positionsDone,
    accuracyVersion: run.accuracyVersion,
    whiteAccuracy: run.whiteAccuracy,
    blackAccuracy: run.blackAccuracy,
    whiteAverageCentipawnLoss: run.whiteAverageCentipawnLoss,
    blackAverageCentipawnLoss: run.blackAverageCentipawnLoss,
    whiteMovesAnalyzed: run.whiteMovesAnalyzed,
    blackMovesAnalyzed: run.blackMovesAnalyzed,
    summary: run.summary,
    error: run.error,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    moves,
    criticalMoves,
  };
}

async function createRunForGame(importedGameId: number, options: AnalyzeImportedGameOptions, status: 'QUEUED' | 'RUNNING') {
  const engineName = StockfishEngine.engineName;
  const engineVersion = StockfishEngine.engineVersion();

  if (!options.force) {
    const existing = await getExistingGameAnalysis(importedGameId, {
      depth: options.depth,
      multipv: options.multipv,
      engineName,
      engineVersion,
    });

    if (existing) return { reusedExisting: true, run: existing };
  }

  const game = await getImportedGameForAnalysis(importedGameId);
  if (!game) throw new Error('Imported game not found');
  if (!game.pgn) throw new Error('Imported game has no PGN to analyze');

  const moves = parsePgnMoves(game.pgn);
  if (moves.length === 0) throw new Error('Imported game PGN has no moves to analyze');

  const run = await createGameAnalysisRun({
    importedGameId,
    depth: options.depth,
    multipv: options.multipv,
    engineName,
    engineVersion,
    positionsTotal: moves.length,
    status,
  });

  return { reusedExisting: false, run };
}

export const GameAnalysisService = {
  getImportedGameAnalysis: async (importedGameId: number) => {
    await CurrentUserService.getOrCreate();

    const game = await getImportedGameForAnalysis(importedGameId);
    if (!game) throw new Error('Imported game not found');

    const run = await getLatestGameAnalysisForImportedGame(importedGameId);
    if (!run) throw new Error('Imported game analysis not found');

    return { run: compactRun(run) };
  },

  queueImportedGameAnalysis: async (importedGameId: number, options: AnalyzeImportedGameOptions) => {
    await CurrentUserService.getOrCreate();
    const result = await createRunForGame(importedGameId, options, 'QUEUED');
    return { queued: !result.reusedExisting, reusedExisting: result.reusedExisting, run: compactRun(result.run) };
  },

  analyzeImportedGame: async (importedGameId: number, options: AnalyzeImportedGameOptions) => {
    await CurrentUserService.getOrCreate();
    const result = await createRunForGame(importedGameId, options, 'RUNNING');
    if (result.reusedExisting) return { reusedExisting: true, run: compactRun(result.run) };

    const completed = await GameAnalysisService.executeAnalysisRun(result.run.id);
    return { reusedExisting: false, run: completed.run };
  },

  executeAnalysisRun: async (analysisRunId: number, session?: StockfishSession) => {
    await CurrentUserService.getOrCreate();

    const run = await getGameAnalysisRunForExecution(analysisRunId);
    if (!run) throw new Error('Game analysis run not found');
    if (run.status === 'QUEUED') await markGameAnalysisRunRunning(run.id);
    if (run.status !== 'QUEUED' && run.status !== 'RUNNING') return { run: compactRun(run) };

    const game = await getImportedGameForAnalysis(run.importedGameId);
    if (!game) throw new Error('Imported game not found');
    if (!game.pgn) throw new Error('Imported game has no PGN to analyze');

    const moves = parsePgnMoves(game.pgn);
    if (moves.length === 0) throw new Error('Imported game PGN has no moves to analyze');

    const summary = emptySummary();
    const stats: PositionAnalysisStats = summary.performance;
    const accuracyTracker = new GameAccuracyTracker();
    const startedAtMs = Date.now();
    let positionsDone = 0;
    let ownedSession: StockfishSession | undefined;

    try {
      const engineSession = session ?? (ownedSession = await StockfishSession.start());

      for (const move of moves) {
        const position = await PositionAnalysisService.analyzePosition({
          fen: move.fenBefore,
          playedMoveUci: move.playedMoveUci,
          depth: run.depth,
          multipv: run.multipv,
        }, engineSession, stats);

        accuracyTracker.add(move.side, position);

        await createGameMoveAnalysis({
          analysisRunId: run.id,
          importedGameId: run.importedGameId,
          positionAnalysisId: position.id,
          plyNumber: move.plyNumber,
          moveNumber: move.moveNumber,
          side: move.side,
          fenBefore: move.fenBefore,
          fenAfter: move.fenAfter,
          playedMoveUci: move.playedMoveUci,
          playedMoveSan: move.playedMoveSan,
          classification: position.classification,
          scoreLossCp: position.scoreLossCp,
        });

        positionsDone += 1;
        addToSummary(summary, move, position.classification);
        await updateGameAnalysisRunProgress(run.id, positionsDone);
      }

      const accuracy = accuracyTracker.summarize(game.userColor);
      summary.accuracy = accuracy;
      summary.performance.durationMs = Date.now() - startedAtMs;
      const completed = await completeGameAnalysisRun(run.id, summary, positionsDone, accuracy);
      return { run: compactRun(completed) };
    } catch (err: any) {
      summary.performance.durationMs = Date.now() - startedAtMs;
      await failGameAnalysisRun(run.id, err?.message ?? String(err), positionsDone);
      throw err;
    } finally {
      ownedSession?.close();
    }
  },

  claimAndExecuteNextQueuedRun: async (session?: StockfishSession) => {
    await CurrentUserService.getOrCreate();
    const run = await claimNextQueuedGameAnalysisRun();
    if (!run) return null;
    return GameAnalysisService.executeAnalysisRun(run.id, session);
  },

  markInterruptedRunsOnWorkerStartup: async () => {
    await CurrentUserService.getOrCreate();
    return interruptRunningAnalysisRuns('Analysis worker restarted before the run completed. Requeue the game to retry.');
  },
};
