import type { OpeningBookEntry } from './openingBook.types';

export const OPENING_KNOWLEDGE_VERSION = '2026-08-knowledge-v1' as const;

export type OpeningKnowledgeStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
export type OpeningKnowledgeLifecycle = 'DRAFT' | 'REVIEWED' | 'DEPRECATED';
export type OpeningKnowledgeConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type OpeningKnowledgeLicense =
  | 'PROJECT_ORIGINAL'
  | 'CC0-1.0'
  | 'PUBLIC_DOMAIN'
  | 'CC-BY-SA-4.0'
  | 'REFERENCE_ONLY';
export type OpeningKnowledgeSourceType = 'DATASET' | 'REFERENCE' | 'PROJECT_RESEARCH';

export interface OpeningKnowledgeSource {
  id: string;
  title: string;
  sourceRef: string;
  sourceType: OpeningKnowledgeSourceType;
  license: OpeningKnowledgeLicense;
  retrievedAt: string;
}

export interface OpeningKnowledgeStatement {
  text: string;
  confidence: OpeningKnowledgeConfidence;
  sourceIds: readonly string[];
}

export interface OpeningStrategicPlan {
  id: string;
  title: string;
  summary: string;
  conditions?: readonly string[];
  caveats?: readonly string[];
  confidence: OpeningKnowledgeConfidence;
  sourceIds: readonly string[];
}

export interface OpeningKnowledgeSelector {
  allClassificationRuleIds?: readonly string[];
  anyClassificationRuleIds?: readonly string[];
  namePattern?: RegExp;
  ecoPattern?: RegExp;
  uciPrefix?: string;
}

export interface OpeningSideKnowledgePatch {
  strategicSummary?: OpeningKnowledgeStatement;
  planMode?: 'MERGE' | 'REPLACE';
  removePlanIds?: readonly string[];
  plans?: readonly OpeningStrategicPlan[];
}

export interface OpeningKnowledgeRule {
  id: string;
  revision: number;
  lifecycle: OpeningKnowledgeLifecycle;
  selector: OpeningKnowledgeSelector;
  shortDescription?: OpeningKnowledgeStatement;
  description?: OpeningKnowledgeStatement;
  white?: OpeningSideKnowledgePatch;
  black?: OpeningSideKnowledgePatch;
  rationale: string;
}

export interface OpeningSideKnowledge {
  strategicSummary: OpeningKnowledgeStatement | null;
  plans: readonly OpeningStrategicPlan[];
}

export interface OpeningKnowledgeResult {
  status: OpeningKnowledgeStatus;
  knowledgeVersion: typeof OPENING_KNOWLEDGE_VERSION;
  classificationVersion: string;
  entry: OpeningBookEntry;
  shortDescription: OpeningKnowledgeStatement | null;
  description: OpeningKnowledgeStatement | null;
  white: OpeningSideKnowledge;
  black: OpeningSideKnowledge;
  matchedClassificationRuleIds: readonly string[];
  matchedKnowledgeRuleIds: readonly string[];
  sources: readonly OpeningKnowledgeSource[];
}
