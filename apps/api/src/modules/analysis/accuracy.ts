import { AnalysisSide, StoredPositionAnalysis } from './analysis.types';

export const ANALYSIS_ACCURACY_VERSION = 'lichess-inspired-v1';

interface AccuracyAccumulator {
  moves: number;
  centipawnLossTotal: number;
  accuracyTotal: number;
}

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

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function winPercentFromWhiteCp(cpWhite: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cpWhite)) - 1);
}

function moveAccuracyFromWinPercentLoss(winPercentLoss: number): number {
  const accuracy = 103.1668 * Math.exp(-0.04354 * winPercentLoss) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

function sideWinPercent(side: AnalysisSide, cpWhite: number): number {
  const whiteWinPercent = winPercentFromWhiteCp(cpWhite);
  return side === 'WHITE' ? whiteWinPercent : 100 - whiteWinPercent;
}

function emptyAccumulator(): AccuracyAccumulator {
  return {
    moves: 0,
    centipawnLossTotal: 0,
    accuracyTotal: 0,
  };
}

function addMove(acc: AccuracyAccumulator, side: AnalysisSide, position: StoredPositionAnalysis) {
  const scoreLossCp = position.scoreLossCp;
  const bestScoreCpWhite = position.bestScoreCpWhite;
  const playedScoreCpWhite = position.playedScoreCpWhite;

  if (scoreLossCp === undefined || bestScoreCpWhite === undefined || playedScoreCpWhite === undefined) {
    return;
  }

  const bestWinPercent = sideWinPercent(side, bestScoreCpWhite);
  const playedWinPercent = sideWinPercent(side, playedScoreCpWhite);
  const winPercentLoss = Math.max(0, bestWinPercent - playedWinPercent);

  acc.moves += 1;
  acc.centipawnLossTotal += scoreLossCp;
  acc.accuracyTotal += moveAccuracyFromWinPercentLoss(winPercentLoss);
}

function summarize(acc: AccuracyAccumulator): SideAccuracySummary {
  if (acc.moves === 0) {
    return {
      moves: 0,
      averageCentipawnLoss: null,
      accuracy: null,
    };
  }

  return {
    moves: acc.moves,
    averageCentipawnLoss: round(acc.centipawnLossTotal / acc.moves),
    accuracy: round(acc.accuracyTotal / acc.moves),
  };
}

export class GameAccuracyTracker {
  private white = emptyAccumulator();
  private black = emptyAccumulator();

  add(side: AnalysisSide, position: StoredPositionAnalysis) {
    addMove(side === 'WHITE' ? this.white : this.black, side, position);
  }

  summarize(userColor?: string | null): GameAccuracySummary {
    const white = summarize(this.white);
    const black = summarize(this.black);
    const normalizedUserColor = userColor === 'WHITE' || userColor === 'BLACK' ? userColor : undefined;
    const opponentColor = normalizedUserColor === 'WHITE' ? 'BLACK' : normalizedUserColor === 'BLACK' ? 'WHITE' : undefined;

    return {
      version: ANALYSIS_ACCURACY_VERSION,
      white,
      black,
      user: normalizedUserColor
        ? { color: normalizedUserColor, ...(normalizedUserColor === 'WHITE' ? white : black) }
        : undefined,
      opponent: opponentColor
        ? { color: opponentColor, ...(opponentColor === 'WHITE' ? white : black) }
        : undefined,
    };
  }
}
