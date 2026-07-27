export type TrapSide = 'WHITE' | 'BLACK';

export type TrapLifecycleStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'DEPRECATED'
  | 'REFUTED'
  | 'REJECTED';

export type TrapSetupSoundness =
  | 'UNASSESSED'
  | 'SOUND'
  | 'PLAYABLE_RISK'
  | 'DUBIOUS'
  | 'REFUTED';

export type TrapOutcome = 'MATE' | 'MATERIAL' | 'DECISIVE_EVAL' | 'POSITIONAL_BIND';

export type TrapOfferRole = 'BAIT' | 'SACRIFICE' | 'WAITING_MOVE' | 'TACTICAL_PERMISSION';

export type TrapEvidenceStatus = 'MISSING' | 'INSUFFICIENT' | 'AVAILABLE';

export type TrapSourceType =
  | 'PROJECT_RESEARCH'
  | 'LICHESS_GAME'
  | 'LICHESS_PUZZLE'
  | 'LICHESS_EVALUATION'
  | 'LICHESS_OPENINGS';

export type TrapSourceLicense = 'PROJECT_ORIGINAL' | 'CC0-1.0';

export interface TrapEvidenceProfile {
  id: string;
  version: string;
}

export interface TrapEvidenceMarker {
  status: TrapEvidenceStatus;
  profile: TrapEvidenceProfile;
  capturedAt?: string;
  payloadHash?: string;
  reason?: string;
}

export interface TrapSetupRoute {
  id: string;
  movesUci: readonly string[];
  sourceRef?: string;
}

export interface TrapTemptingResponse {
  id: string;
  movesUci: readonly string[];
  explanation: string;
}

export interface TrapPunishment {
  againstResponseId: string;
  lineUci: readonly string[];
  outcome: TrapOutcome;
  explanation: string;
}

export interface TrapSafeDefense {
  moveUci: string;
  explanation: string;
}

export interface TrapProvenance {
  sourceType: TrapSourceType;
  sourceId: string;
  sourceRef: string;
  sourceVersion: string;
  license: TrapSourceLicense;
  retrievedAt: string;
  checksum?: string;
}

export interface TrapPilotRecord {
  id: string;
  revision: number;
  lifecycle: TrapLifecycleStatus;
  title: string;
  aliases: readonly string[];
  trapFamilyId?: string;
  sideSettingTrap: TrapSide;
  setupSoundness: TrapSetupSoundness;
  opening?: {
    eco?: string;
    name?: string;
  };
  trigger: {
    normalizedFen: string;
    setupRoutes: readonly TrapSetupRoute[];
  };
  offer?: {
    moveUci: string;
    role: TrapOfferRole;
    explanation: string;
  };
  temptingResponses: readonly TrapTemptingResponse[];
  punishments: readonly TrapPunishment[];
  safeDefenses: readonly TrapSafeDefense[];
  editorial: {
    summary: string;
    warnings: readonly string[];
    reviewState: 'NEEDS_EVIDENCE' | 'READY_FOR_REVIEW' | 'APPROVED' | 'DOWNGRADED' | 'REJECTED';
    reviewRationale: string;
  };
  provenance: readonly TrapProvenance[];
  evidence: {
    engine: TrapEvidenceMarker;
    population: TrapEvidenceMarker;
  };
}

export interface TrapPilotDataset {
  schemaVersion: 1;
  datasetVersion: string;
  stage: 'SEED' | 'PILOT';
  records: readonly TrapPilotRecord[];
}
