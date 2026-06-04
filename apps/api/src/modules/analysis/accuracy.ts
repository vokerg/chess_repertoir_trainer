export type AnalysisSide = 'WHITE' | 'BLACK';

export const ANALYSIS_ACCURACY_VERSION = 'client-side-v2';

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

function emptySide(): SideAccuracySummary {
  return { moves: 0, averageCentipawnLoss: null, accuracy: null };
}

function clampAccuracy(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function accuracyFromAverageCentipawnLoss(averageCentipawnLoss: number): number {
  const estimated = 103.1668 * Math.exp(-0.04354 * averageCentipawnLoss) - 3.1669;
  return Number(clampAccuracy(estimated).toFixed(1));
}

export class GameAccuracyTracker {
  private readonly totals: Record<AnalysisSide, { moves: number; totalCentipawnLoss: number }> = {
    WHITE: { moves: 0, totalCentipawnLoss: 0 },
    BLACK: { moves: 0, totalCentipawnLoss: 0 },
  };

  record(side: AnalysisSide, scoreLossCp: number | null | undefined) {
    if (typeof scoreLossCp !== 'number' || !Number.isFinite(scoreLossCp) || scoreLossCp < 0) return;
    this.totals[side].moves += 1;
    this.totals[side].totalCentipawnLoss += scoreLossCp;
  }

  private summarizeSide(side: AnalysisSide): SideAccuracySummary {
    const total = this.totals[side];
    if (!total.moves) return emptySide();

    const averageCentipawnLoss = Number((total.totalCentipawnLoss / total.moves).toFixed(1));
    return {
      moves: total.moves,
      averageCentipawnLoss,
      accuracy: accuracyFromAverageCentipawnLoss(averageCentipawnLoss),
    };
  }

  summarize(userColor?: string | null): GameAccuracySummary {
    const white = this.summarizeSide('WHITE');
    const black = this.summarizeSide('BLACK');
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
}
