import type {
  PlayerChessProfileDimension,
  PlayerChessProfileQuery,
} from '@chess-trainer/contracts/player-chess-profile';
import type { LichessGamesSpeedPreset } from '@chess-trainer/contracts/opening-explorer';

export type PlayerChessProfileColor = PlayerChessProfileQuery['colors'][number];
export type PlayerChessProfilePeriod = '1M' | '3M' | '1Y' | 'ALL' | 'CUSTOM';
export type PlayerChessProfileView = 'PREFERENCE' | 'PERFORMANCE';

export interface PlayerChessProfileAccountOption {
  id: number;
  provider: 'LICHESS' | 'CHESS_COM';
  username: string;
  displayName?: string | null;
  isActive: boolean;
  isDefaultProgressAccount?: boolean;
}

export interface PlayerChessProfileFilters {
  period: PlayerChessProfilePeriod;
  from: string;
  to: string;
  accountIds: readonly number[];
  speedPreset: LichessGamesSpeedPreset;
  colors: readonly PlayerChessProfileColor[];
  rated: boolean;
  minUserRating: number | null;
  maxUserRating: number | null;
  minOpponentRating: number | null;
  maxOpponentRating: number | null;
}

export interface PlayerChessProfileBreakdownSelection {
  kind: 'PREFERENCE' | 'PERFORMANCE';
  dimension: PlayerChessProfileDimension;
  value: string;
}

export type PlayerChessProfileEvidenceSelection =
  | { kind: 'CONCLUSION'; index: number }
  | PlayerChessProfileBreakdownSelection;
