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

export type RepertoireBuilderStartingScope =
  | 'FULL'
  | 'E4'
  | 'D4'
  | 'C4'
  | 'NF3'
  | 'CUSTOM';

export interface RepertoireBuilderSetupValues {
  side: 'WHITE' | 'BLACK';
  startingScope: RepertoireBuilderStartingScope;
  customStartingPosition: string;
  speedPreset: LichessGamesSpeedPreset;
  ratingTarget: LichessGamesRatingTarget;
  ratingGroup: LichessGamesRatingGroup | null;
  persona: Exclude<RepertoireTargetPersona, 'CUSTOM'>;
  /** V1 target-contract compatibility only. Not a V2 setup decision. */
  maximumTheoryBurden: RepertoireTargetTheoryBurden;
  /** V1 target-contract compatibility only. Not a V2 setup decision. */
  coveragePercent: number;
}

export interface RepertoireBuilderProfileDefaults {
  source: Extract<RepertoireTargetDefaultSource, { kind: 'PLAYER_PROFILE' }>;
  setup: RepertoireBuilderSetupValues;
}

export interface RepertoireBuilderSetup extends RepertoireBuilderSetupValues {
  profileDefaults?: RepertoireBuilderProfileDefaults;
}

export interface RepertoireBuilderPersonaPreset {
  id: RepertoireBuilderSetup['persona'];
  label: string;
  description: string;
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

export type RepertoireBuilderEngineImpactStatus = 'QUEUED' | 'ANALYZING' | 'AVAILABLE' | 'FAILED';

export interface RepertoireBuilderEngineImpact {
  moveUci: string;
  status: RepertoireBuilderEngineImpactStatus;
  source: 'STORED' | 'BROWSER' | null;
  persistence: 'STORED' | 'PENDING' | 'SAVED' | 'FAILED' | null;
  depth: number | null;
  scoreCpForTarget: number | null;
  mateForTarget: number | null;
  scoreCpWhite: number | null;
  mateWhite: number | null;
  objectiveDeltaCp: number | null;
  error: string | null;
}

export interface RepertoireBuilderPositionEvaluation {
  source: 'STORED' | 'BROWSER';
  persistence: 'STORED' | 'PENDING' | 'SAVED' | 'FAILED';
  depth: number | null;
  scoreCpForTarget: number | null;
  mateForTarget: number | null;
  scoreCpWhite: number | null;
  mateWhite: number | null;
}
