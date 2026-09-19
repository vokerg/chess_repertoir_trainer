import { createHash } from 'node:crypto';
import type {
  LichessGamesRatingGroup,
  LichessGamesSpeedPreset,
  OpeningExplorerCounts,
} from '@chess-trainer/contracts/opening-explorer';
import type { StoredEngineLine } from 'chess-domain';

export type TrapEngineTargetRole =
  | 'TRIGGER'
  | 'AFTER_TEMPTING_RESPONSE'
  | 'AFTER_FIRST_PUNISHMENT'
  | 'AFTER_SAFE_DEFENSE';

export interface TrapEngineAnalysisTarget {
  role: TrapEngineTargetRole;
  referenceId: string;
  fen: string;
}

export interface TrapEngineAnalysisResult extends TrapEngineAnalysisTarget {
  bestMoveUci?: string | null;
  bestScoreCpWhite?: number | null;
  bestMateWhite?: number | null;
  lines: readonly StoredEngineLine[];
}

export interface TrapEngineEvidenceSnapshot {
  recordId: string;
  occurrenceIdentity: string;
  profile: {
    id: 'trap-pilot-stockfish';
    version: string;
    engine: 'local' | 'wasm';
    engineVersion: string;
    depth: number;
    multipv: number;
  };
  capturedAt: string;
  targets: readonly TrapEngineAnalysisResult[];
  payloadHash: string;
}

export interface TrapPopulationMoveSnapshot {
  uci: string;
  san: string;
  averageRating: number;
  games: OpeningExplorerCounts;
}

export interface TrapPopulationEvidenceSnapshot {
  recordId: string;
  occurrenceIdentity: string;
  profile: {
    id: 'lichess-games-explorer';
    version: string;
    speedPreset: LichessGamesSpeedPreset;
    ratingTarget: 'ALL';
    effectiveSpeeds: readonly string[];
    effectiveRatingGroups: readonly LichessGamesRatingGroup[];
  };
  capturedAt: string;
  triggerFen: string;
  games: OpeningExplorerCounts;
  moves: readonly TrapPopulationMoveSnapshot[];
  payloadHash: string;
}

export interface TrapPilotEvidenceBundle {
  schemaVersion: 1;
  datasetVersion: string;
  engineSnapshots: readonly TrapEngineEvidenceSnapshot[];
  populationSnapshots: readonly TrapPopulationEvidenceSnapshot[];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function hashTrapPilotEvidence(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

export function withEngineEvidenceHash(
  snapshot: Omit<TrapEngineEvidenceSnapshot, 'payloadHash'>,
): TrapEngineEvidenceSnapshot {
  return { ...snapshot, payloadHash: hashTrapPilotEvidence(snapshot) };
}

export function withPopulationEvidenceHash(
  snapshot: Omit<TrapPopulationEvidenceSnapshot, 'payloadHash'>,
): TrapPopulationEvidenceSnapshot {
  return { ...snapshot, payloadHash: hashTrapPilotEvidence(snapshot) };
}
