import type { OpeningBookEntry } from './openingBook.types';

export const OPENING_CLASSIFICATION_VERSION = '2026-07-rules-v1' as const;

export type OpeningSide = 'WHITE' | 'BLACK';

export type OpeningSoundness =
  | 'SOUND'
  | 'PLAYABLE'
  | 'RISKY'
  | 'DUBIOUS'
  | 'UNKNOWN';

export type OpeningCharacter =
  | 'SOLID'
  | 'BALANCED'
  | 'POSITIONAL'
  | 'DYNAMIC'
  | 'SHARP'
  | 'TACTICAL'
  | 'SURPRISE';

export type OpeningTheoreticalStatus =
  | 'PRINCIPAL'
  | 'MAINLINE'
  | 'SIDELINE'
  | 'SURPRISE'
  | 'UNKNOWN';

export type OpeningTheoryBurden = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export type OpeningRole =
  | 'INITIATOR'
  | 'RESPONDER'
  | 'GAMBIT_OFFERER'
  | 'GAMBIT_ACCEPTOR'
  | 'GAMBIT_DECLINER';

export type OpeningClassificationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OpeningSideClassification {
  soundness: OpeningSoundness;
  character: readonly OpeningCharacter[];
  theoreticalStatus: OpeningTheoreticalStatus;
  theoryBurden: OpeningTheoryBurden;
  roles: readonly OpeningRole[];
  confidence: OpeningClassificationConfidence;
}

export interface OpeningSideClassificationPatch {
  soundness?: OpeningSoundness;
  character?: readonly OpeningCharacter[];
  theoreticalStatus?: OpeningTheoreticalStatus;
  theoryBurden?: OpeningTheoryBurden;
  roles?: readonly OpeningRole[];
  confidence?: OpeningClassificationConfidence;
}

export interface OpeningClassificationRule {
  id: string;
  namePattern: RegExp;
  ecoPattern?: RegExp;
  uciPrefix?: string;
  white?: OpeningSideClassificationPatch;
  black?: OpeningSideClassificationPatch;
  rationale: string;
}

export interface OpeningClassificationResult {
  version: typeof OPENING_CLASSIFICATION_VERSION;
  entry: OpeningBookEntry;
  white: OpeningSideClassification;
  black: OpeningSideClassification;
  matchedRuleIds: readonly string[];
}
