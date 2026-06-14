export interface MonthlyGamesRow {
  year: number;
  month: number;
  monthStart: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
  avgOpponentRatingLichess: number | null;
  avgOpponentRatingChessCom: number | null;
  highestRatedLichess: number | null;
  highestRatedChessCom: number | null;
}

export interface MonthlyGamesResponse {
  excludeBullet: boolean;
  items: MonthlyGamesRow[];
}
