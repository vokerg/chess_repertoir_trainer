import { MoveClassificationCode } from 'chess-domain';
import type { StoredEngineLine } from './analysis.types';

export type AnalysisSide = 'WHITE' | 'BLACK';

export const ANALYSIS_ACCURACY_VERSION = 'client-side-v3';

export interface SideAccuracySummary {
  moves: number;
  averageCentipawnLoss: number | null;
  accuracy: number | null;
}

export interface GameAccuracySummary {
  version: string;
  white: SideAccuracySummary;
  black: SideAccuracySummary;
  user?: SideAccuracySummary & { color: AnalysisSide };
  opponent?: SideAccuracySummary & { color: AnalysisSide };
}

export interface PositionAnalysisSummaryInput {
  bestMoveUci?: string | null;
  bestScoreCpWhite?: number | null;
  bestMateWhite?: number | null;
  lines?: StoredEngineLine[] | null;
}

export interface GameAccuracyPlyInput {
  plyNumber: number;
  moveUci: string;
  scoreLossCp: number | null;
  classificationCode?: number | null;
  positionAnalysis?: PositionAnalysisSummaryInput | null;
  resultingPositionAnalysis?: PositionAnalysisSummaryInput | null;
}

interface SideTotals {
  centipawnMoves: number;
  totalCentipawnLoss: number;
  accuracyMoves: number;
  totalAccuracy: number;
}

function emptySide(): SideAccuracySummary {
  return { moves: 0, averageCentipawnLoss: null, accuracy: null };
}

function emptyTotals(): SideTotals {
  return {
    centipawnMoves: 0,
    totalCentipawnLoss: 0,
    accuracyMoves: 0,
    totalAccuracy: 0,
  };
}

export function sideForPly(plyNumber: number): AnalysisSide {
  return plyNumber % 2 === 1 ? 'WHITE' : 'BLACK';
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

export function winPercentFromCp(cpWhite: number, side: AnalysisSide): number {
  const cpForSide = side === 'WHITE' ? cpWhite : -cpWhite;
  const cp = Math.max(-1000, Math.min(1000, cpForSide));
  return 100 / (1 + Math.exp(-0.00368208 * cp));
}

export function accuracyFromWinDiff(winDiff: number): number {
  const raw =
    103.1668100711649 * Math.exp(-0.04354415386753951 * winDiff) -
    3.166924740191411 +
    1;

  return Math.max(0, Math.min(100, raw));
}

function effectiveScoreCpWhite(scoreCpWhite?: number | null, mateWhite?: number | null): number | null {
  if (typeof scoreCpWhite === 'number' && Number.isFinite(scoreCpWhite)) return scoreCpWhite;
  if (typeof mateWhite !== 'number' || !Number.isFinite(mateWhite)) return null;
  return mateWhite >= 0 ? 1000 : -1000;
}

function linesFor(analysis?: PositionAnalysisSummaryInput | null): StoredEngineLine[] {
  return Array.isArray(analysis?.lines) ? analysis!.lines : [];
}

function bestMoveFor(analysis?: PositionAnalysisSummaryInput | null): string | null {
  return analysis?.bestMoveUci ?? linesFor(analysis)[0]?.moveUci ?? linesFor(analysis)[0]?.pvUci?.[0] ?? null;
}

function bestEvalCpWhite(analysis?: PositionAnalysisSummaryInput | null): number | null {
  return effectiveScoreCpWhite(analysis?.bestScoreCpWhite, analysis?.bestMateWhite);
}

function playedEvalFromMatchingLineCpWhite(
  analysis: PositionAnalysisSummaryInput | null | undefined,
  moveUci: string,
): number | null {
  const line = linesFor(analysis).find((candidate) => (candidate.moveUci ?? candidate.pvUci?.[0]) === moveUci);
  return line ? effectiveScoreCpWhite(line.scoreCpWhite, line.mateWhite) : null;
}

function playedEvalCpWhite(ply: GameAccuracyPlyInput, side: AnalysisSide): number | null {
  const matchingLineEval = playedEvalFromMatchingLineCpWhite(ply.positionAnalysis, ply.moveUci);
  if (matchingLineEval !== null) return matchingLineEval;

  const bestEval = bestEvalCpWhite(ply.positionAnalysis);
  const bestMoveUci = bestMoveFor(ply.positionAnalysis);
  if (bestEval !== null && bestMoveUci === ply.moveUci) return bestEval;

  const resultingEval = bestEvalCpWhite(ply.resultingPositionAnalysis);
  if (resultingEval !== null) return resultingEval;

  if (bestEval === null || typeof ply.scoreLossCp !== 'number' || !Number.isFinite(ply.scoreLossCp)) return null;

  const bestCpForSide = side === 'WHITE' ? bestEval : -bestEval;
  const playedCpForSide = bestCpForSide - ply.scoreLossCp;
  return side === 'WHITE' ? playedCpForSide : -playedCpForSide;
}

export function moveAccuracyForPly(ply: GameAccuracyPlyInput): number | null {
  if (ply.classificationCode === MoveClassificationCode.Forced) return 100;
  if (ply.scoreLossCp === 0) return 100;

  const side = sideForPly(ply.plyNumber);
  const bestEval = bestEvalCpWhite(ply.positionAnalysis);
  const playedEval = playedEvalCpWhite(ply, side);
  if (bestEval === null || playedEval === null) return null;

  const bestWinPercent = winPercentFromCp(bestEval, side);
  const playedWinPercent = winPercentFromCp(playedEval, side);
  const winDiff = Math.max(0, bestWinPercent - playedWinPercent);
  return accuracyFromWinDiff(winDiff);
}

export function buildGameAccuracySummary(plies: GameAccuracyPlyInput[], userColor?: string | null): GameAccuracySummary {
  const totals: Record<AnalysisSide, SideTotals> = {
    WHITE: emptyTotals(),
    BLACK: emptyTotals(),
  };

  for (const ply of plies) {
    const side = sideForPly(ply.plyNumber);
    const sideTotals = totals[side];

    if (typeof ply.scoreLossCp === 'number' && Number.isFinite(ply.scoreLossCp) && ply.scoreLossCp >= 0) {
      sideTotals.centipawnMoves += 1;
      sideTotals.totalCentipawnLoss += ply.scoreLossCp;
    }

    const moveAccuracy = moveAccuracyForPly(ply);
    if (moveAccuracy === null) continue;

    sideTotals.accuracyMoves += 1;
    sideTotals.totalAccuracy += moveAccuracy;
  }

  const white = summarizeSide(totals.WHITE);
  const black = summarizeSide(totals.BLACK);
  const normalizedUserColor = userColor === 'WHITE' || userColor === 'BLACK' ? userColor : undefined;
  const opponentColor = normalizedUserColor === 'WHITE' ? 'BLACK' : normalizedUserColor === 'BLACK' ? 'WHITE' : undefined;

  return {
    version: ANALYSIS_ACCURACY_VERSION,
    white,
    black,
    user: normalizedUserColor ? { color: normalizedUserColor, ...(normalizedUserColor === 'WHITE' ? white : black) } : undefined,
    opponent: opponentColor ? { color: opponentColor, ...(opponentColor === 'WHITE' ? white : black) } : undefined,
  };
}

function summarizeSide(total: SideTotals): SideAccuracySummary {
  if (!total.centipawnMoves && !total.accuracyMoves) return emptySide();

  return {
    moves: total.accuracyMoves,
    averageCentipawnLoss: total.centipawnMoves ? round1(total.totalCentipawnLoss / total.centipawnMoves) : null,
    accuracy: total.accuracyMoves ? round1(total.totalAccuracy / total.accuracyMoves) : null,
  };
}
