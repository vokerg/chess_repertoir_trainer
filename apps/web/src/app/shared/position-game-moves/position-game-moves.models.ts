import type { PositionAnalysisCache } from '../../services/position-analysis-cache.service';

export type Provider = 'LICHESS' | 'CHESS_COM';
export type UserColor = 'WHITE' | 'BLACK';
export type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';

export interface OpeningWdl {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
}

export interface OpeningNextMove {
  moveUci: string;
  moveSan?: string | null;
  fenAfter: string;
  side: UserColor;
  moveNumber: number;
  occurrences: number;
  games: OpeningWdl;
}

export interface OpeningAnalysisGame {
  id: number;
  provider: Provider;
  providerGameId: string;
  providerUrl?: string | null;
  endedAt?: string | null;
  speedCategory?: string | null;
  timeControl: { raw?: string | null; initial?: number | null; increment?: number | null };
  white?: { username?: string | null; rating?: number | null } | null;
  black?: { username?: string | null; rating?: number | null } | null;
  userColor?: UserColor | null;
  resultForUser?: ResultForUser | null;
  opening?: { eco?: string | null; name?: string | null } | null;
  plyNumber: number;
  moveNumber: number;
  nextMoveUci: string;
  nextMoveSan?: string | null;
}

export interface OpeningAnalysisResponse {
  fen: string;
  normalizedFen: string;
  sideToMove: UserColor;
  fullMoveNumber: number;
  ratedOnly: boolean;
  occurrences: number;
  games: OpeningWdl;
  nextMoves: OpeningNextMove[];
  topGames: OpeningAnalysisGame[];
  positionAnalysis: PositionAnalysisCache | null;
  appliedFilters: Record<string, unknown>;
}

export interface PlayedMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  fenAfter: string;
}
