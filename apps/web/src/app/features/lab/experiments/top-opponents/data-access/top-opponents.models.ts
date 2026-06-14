export interface TopOpponent {
  opponentUsername: string;
  games: number;
}

export interface TopOpponentsResponse {
  items: TopOpponent[];
}
