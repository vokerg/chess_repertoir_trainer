import { moveClassificationLabel } from 'chess-domain';
import { CurrentUserService } from '../../services/currentUserService';
import {
  createClientGameAnalysisRun,
  getImportedGameForAnalysis,
  getImportedGamePliesForAnalysisSummary,
  getLatestGameAnalysisForImportedGame,
} from './analysis.repository.prisma';
import { ANALYSIS_ACCURACY_VERSION, GameAccuracyTracker } from './accuracy';

function sideForPly(plyNumber: number): 'WHITE' | 'BLACK' {
  return plyNumber % 2 === 1 ? 'WHITE' : 'BLACK';
}

function moveNumberFromPly(plyNumber: number): number {
  return Math.ceil(plyNumber / 2);
}

function summaryKey(classificationCode: number | null | undefined): string | null {
  if (!classificationCode) return null;
  const label = moveClassificationLabel(classificationCode);
  if (label === 'Not analysed') return null;
  return label.toUpperCase().replace(/\s+/g, '_');
}

function compactMove(ply: any) {
  const analysis = ply.position?.analysis;
  return {
    plyNumber: ply.plyNumber,
    moveNumber: moveNumberFromPly(ply.plyNumber),
    side: sideForPly(ply.plyNumber),
    playedMoveUci: ply.moveUci,
    playedMoveSan: null,
    classificationCode: ply.classificationCode ?? null,
    classification: moveClassificationLabel(ply.classificationCode),
    scoreLossCp: ply.scoreLossCp ?? null,
    bestMoveUci: analysis?.bestMoveUci ?? null,
    bestScoreCpWhite: analysis?.bestScoreCpWhite ?? null,
    bestMateWhite: analysis?.bestMateWhite ?? null,
    positionAnalysisId: analysis?.id ?? null,
  };
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
  const tracker = new GameAccuracyTracker();
  for (const ply of plies) {
    tracker.record(sideForPly(ply.plyNumber), ply.scoreLossCp);
  }
  return tracker.summarize(userColor);
}

function compactRun(run: any) {
  const plies = run.importedGame?.plies ?? [];
  const moves = plies.map(compactMove);
  const criticalMoves = moves.filter((move: any) => move.classificationCode === 5 || move.classificationCode === 6);

  return {
    id: run.id,
    importedGameId: run.importedGameId,
    status: run.status,
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

export const GameAnalysisService = {
  getImportedGameAnalysis: async (importedGameId: number) => {
    await CurrentUserService.getOrCreate();

    const game = await getImportedGameForAnalysis(importedGameId);
    if (!game) throw new Error('Imported game not found');

    const run = await getLatestGameAnalysisForImportedGame(importedGameId);
    if (!run) throw new Error('Imported game analysis not found');

    return { run: compactRun(run) };
  },

  createClientAnalysisSummary: async (
    importedGameId: number,
    input: { positionsDone?: number; summary?: unknown } = {},
  ) => {
    await CurrentUserService.getOrCreate();

    const game = await getImportedGameForAnalysis(importedGameId);
    if (!game) throw new Error('Imported game not found');

    const plies = await getImportedGamePliesForAnalysisSummary(importedGameId);
    const accuracy = buildAccuracySummary(plies, game.userColor);
    const run = await createClientGameAnalysisRun({
      importedGameId,
      positionsDone: input.positionsDone ?? plies.length,
      summary: input.summary ?? buildSummary(plies),
      accuracyVersion: accuracy.version,
      whiteAccuracy: accuracy.white.accuracy,
      blackAccuracy: accuracy.black.accuracy,
      whiteAverageCentipawnLoss: accuracy.white.averageCentipawnLoss,
      blackAverageCentipawnLoss: accuracy.black.averageCentipawnLoss,
      whiteMovesAnalyzed: accuracy.white.moves,
      blackMovesAnalyzed: accuracy.black.moves,
    });

    return { reusedExisting: false, run: compactRun(run) };
  },
};
