import type { Provider, ResultForUser, UserColor } from '../game.models';

export type { Provider, ResultForUser, UserColor } from '../game.models';

export interface OpeningWdl {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
}

export interface OpeningPositionPerformanceTagStat {
  code: number;
  name: string;
  games: number;
  ratePct: number;
  wdl: OpeningWdl;
}

export interface OpeningPositionPerformanceBucket {
  key: string;
  label: string;
  games: number;
  ratePct: number;
  tags: OpeningPositionPerformanceTagStat[];
}

export interface OpeningPositionPerformance {
  sample: {
    games: number;
    taggedGames: number;
  };
  wdl: OpeningWdl;
  tags: OpeningPositionPerformanceTagStat[];
  buckets: OpeningPositionPerformanceBucket[];
}

export interface OpeningBookMatch {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
  epd: string;
  ply: number;
  source: 'ECO' | 'FEN' | 'MOVES';
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
  bookOpening: OpeningBookMatch | null;
  sideToMove: UserColor;
  fullMoveNumber: number;
  ratedOnly: boolean;
  occurrences: number;
  games: OpeningWdl;
  nextMoves: OpeningNextMove[];
  appliedFilters: Record<string, unknown>;
}

export interface OpeningAnalysisPerformanceResponse {
  fen: string;
  normalizedFen: string;
  performance: OpeningPositionPerformance;
  appliedFilters: Record<string, unknown>;
}

export interface OpeningAnalysisTopGamesResponse {
  fen: string;
  normalizedFen: string;
  topGames: OpeningAnalysisGame[];
  appliedFilters: Record<string, unknown>;
}

export interface PlayedMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  fenAfter: string;
}
