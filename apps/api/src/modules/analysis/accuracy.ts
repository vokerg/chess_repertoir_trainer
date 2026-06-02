export type AnalysisSide = 'WHITE' | 'BLACK';

export const ANALYSIS_ACCURACY_VERSION = 'client-side-v1';

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

export class GameAccuracyTracker {
  summarize(userColor?: string | null): GameAccuracySummary {
    const white = emptySide();
    const black = emptySide();
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
