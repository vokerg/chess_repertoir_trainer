import type {
  LichessGamesRatingGroup,
  LichessGamesRatingTarget,
  LichessGamesSpeedPreset,
} from '@chess-trainer/contracts/opening-explorer';
import type {
  RepertoireTargetDefaultSource,
  RepertoireTargetPersona,
  RepertoireTargetTheoryBurden,
} from '@chess-trainer/contracts/repertoire-target';

export const REPERTOIRE_BUILDER_CANDIDATE_LIMIT = 6;
export const REPERTOIRE_BUILDER_DECISION_LIMIT = 24;
export const REPERTOIRE_BUILDER_PREVIEW_LIMIT = 128;

export interface RepertoireBuilderSetup {
  side: 'WHITE' | 'BLACK';
  speedPreset: LichessGamesSpeedPreset;
  ratingTarget: LichessGamesRatingTarget;
  ratingGroup: LichessGamesRatingGroup | null;
  persona: Exclude<RepertoireTargetPersona, 'CUSTOM'>;
  maximumTheoryBurden: RepertoireTargetTheoryBurden;
  coveragePercent: number;
}

export interface RepertoireBuilderPersonaPreset {
  id: RepertoireBuilderSetup['persona'];
  label: string;
  description: string;
  intentSummary: string;
  defaultTheoryBurden: RepertoireTargetTheoryBurden;
  defaultCoveragePercent: number;
}

export interface RepertoireBuilderProfileDefaults {
  source: Extract<RepertoireTargetDefaultSource, { kind: 'PLAYER_PROFILE' }>;
  setup: RepertoireBuilderSetup;
}

export interface RepertoireBuilderPreviewRow {
  branchId: string;
  depth: number;
  moveLabel: string;
  roleLabel: string;
  status: string;
  transpositionOfBranchId: string | null;
}

export interface RepertoireBuilderSourceItem {
  id: string;
  label: string;
  status: string;
  detail: string | null;
}
