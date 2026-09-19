import type {
  OpeningAnalysisBookMatch as OpeningBookMatchDto,
  OpeningAnalysisCoreResponse as OpeningAnalysisResponseDto,
  OpeningAnalysisGame as OpeningAnalysisGameDto,
  OpeningAnalysisNextMove as OpeningNextMoveDto,
  OpeningAnalysisPerformance as OpeningPositionPerformanceDto,
  OpeningAnalysisPerformanceBucket as OpeningPositionPerformanceBucketDto,
  OpeningAnalysisPerformanceResponse as OpeningAnalysisPerformanceResponseDto,
  OpeningAnalysisPerformanceTagStat as OpeningPositionPerformanceTagStatDto,
  OpeningAnalysisTopGamesResponse as OpeningAnalysisTopGamesResponseDto,
  OpeningAnalysisWdl as OpeningWdlDto,
} from '@chess-trainer/contracts/imported-games';

export type { Provider, ResultForUser, UserColor } from '../game.models';

export type OpeningWdl = OpeningWdlDto;
export type OpeningPositionPerformanceTagStat = OpeningPositionPerformanceTagStatDto;
export type OpeningPositionPerformanceBucket = OpeningPositionPerformanceBucketDto;
export type OpeningPositionPerformance = OpeningPositionPerformanceDto;
export type OpeningBookMatch = OpeningBookMatchDto;
export type OpeningNextMove = OpeningNextMoveDto;
export type OpeningAnalysisGame = OpeningAnalysisGameDto;
export type OpeningAnalysisResponse = OpeningAnalysisResponseDto;
export type OpeningAnalysisPerformanceResponse = OpeningAnalysisPerformanceResponseDto;
export type OpeningAnalysisTopGamesResponse = OpeningAnalysisTopGamesResponseDto;

export interface OpeningAnalysisOpeningBreakdown {
  name: string;
  games: number;
  wdl: {
    wins: number;
    draws: number;
    losses: number;
  };
}

export interface OpeningAnalysisBreakdownsResponse {
  fen: string;
  normalizedFen: string;
  openings: OpeningAnalysisOpeningBreakdown[];
  appliedFilters: Record<string, unknown>;
}

export interface PlayedMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  fenAfter: string;
}
