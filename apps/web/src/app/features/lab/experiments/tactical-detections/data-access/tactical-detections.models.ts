import type { TacticalDetectionKind } from '@chess-trainer/contracts/lab';

export type {
  TacticalDetectionItem,
  TacticalDetectionKind,
  TacticalDetectionListResponse,
  TacticalDetectionRunResponse,
} from '@chess-trainer/contracts/lab';

export type TacticalDetectionKindFilter = 'ALL' | TacticalDetectionKind;

export interface TacticalDetectionRunRequest {
  from?: string;
  to?: string;
  force: boolean;
}
