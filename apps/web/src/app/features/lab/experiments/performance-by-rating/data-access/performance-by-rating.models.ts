export type PerformanceProvider = 'LICHESS' | 'CHESS_COM';
export type PerformanceSpeed = 'blitz' | 'rapid';
export type PerformanceReportType =
  | 'LICHESS_BLITZ'
  | 'LICHESS_RAPID'
  | 'CHESS_COM_BLITZ'
  | 'CHESS_COM_RAPID';

export interface PerformanceWdl {
  wins: number;
  draws: number;
  losses: number;
}

export interface PerformanceByRatingRow {
  provider: PerformanceProvider;
  speed: PerformanceSpeed;
  type: PerformanceReportType;
  ratingFrom: number;
  ratingTo: number;
  games: number;
  analysedGames: number;
  accuracyGames: number;
  wdl: PerformanceWdl;
  whiteWdl: PerformanceWdl;
  blackWdl: PerformanceWdl;
  scorePercent: number | null;
  openingSuccess: number;
  openingTrouble: number;
  wasWinningAndLost: number;
  wasLosingAndWon: number;
  flaggedInWinningPosition: number;
  opponentFlaggedInWinningPosition: number;
  slowBleedLosses: number;
  slowBleedWins: number;
  averageAccuracy: number | null;
}

export interface PerformanceByRatingResponse {
  range: {
    from: string;
    to: string;
  };
  items: PerformanceByRatingRow[];
}

export interface PerformanceByRatingQuery {
  from: string;
  to: string;
}
