import { OPENING_KNOWLEDGE_SOURCES } from './openingKnowledge.sources';
import { OPENING_KNOWLEDGE_PRIORITY_POLICY } from './openingKnowledgeCoverageAudit';

export type OpeningKnowledgeBatchLifecycle =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'REVIEWED'
  | 'APPLIED';

export type OpeningKnowledgeBatchSide = 'WHITE' | 'BLACK';

export interface OpeningKnowledgeBatchCoverageSnapshot {
  total: number;
  available: number;
  partial: number;
  unavailable: number;
}

export interface OpeningKnowledgeBatchRulePlan {
  id: string;
  selectorSummary: string;
  knowledgeIntent: string;
  sides: readonly OpeningKnowledgeBatchSide[];
  sourceIds: readonly string[];
  regressionFixtures: readonly string[];
}

export interface OpeningKnowledgeBatchManifest {
  schemaVersion: 1;
  id: string;
  revision: number;
  lifecycle: OpeningKnowledgeBatchLifecycle;
  title: string;
  rationale: string;
  priorityPolicyVersion: string;
  createdAt: string;
  selectedFamilies: readonly string[];
  baseline: {
    knowledgeVersion: string;
    classificationVersion: string;
    generatedEntries: OpeningKnowledgeBatchCoverageSnapshot;
    uniqueNames: OpeningKnowledgeBatchCoverageSnapshot;
    importedGameWeight?: OpeningKnowledgeBatchCoverageSnapshot;
  };
  expectedGain: {
    generatedAvailableEntries: number;
    uniqueAvailableNames: number;
    importedGameAvailableWeight?: number;
  };
  plannedRules: readonly OpeningKnowledgeBatchRulePlan[];
  acceptance: {
    minimumGeneratedAvailableGain: number;
    minimumUniqueNameAvailableGain: number;
    minimumImportedGameAvailableGain?: number;
    requireAllRulesExercised: boolean;
    requireNoRankingContractChange: boolean;
  };
  reviewer?: {
    name: string;
    reviewedAt: string;
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function nonEmpty(value: string, message: string): void {
  if (!value.trim()) throw new Error(message);
}

function validDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function unique(values: readonly string[], message: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    nonEmpty(value, message);
    if (seen.has(value)) throw new Error(`${message}: ${value}`);
    seen.add(value);
  }
}

function nonNegativeInteger(value: number, message: string): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(message);
}

function validateSnapshot(
  snapshot: OpeningKnowledgeBatchCoverageSnapshot,
  context: string,
): void {
  nonNegativeInteger(snapshot.total, `${context} total must be a non-negative integer`);
  nonNegativeInteger(snapshot.available, `${context} available must be a non-negative integer`);
  nonNegativeInteger(snapshot.partial, `${context} partial must be a non-negative integer`);
  nonNegativeInteger(snapshot.unavailable, `${context} unavailable must be a non-negative integer`);
  const classified = snapshot.available + snapshot.partial + snapshot.unavailable;
  if (classified !== snapshot.total) {
    throw new Error(`${context} statuses must add up to total`);
  }
}

export function validateOpeningKnowledgeBatchManifest(
  manifest: OpeningKnowledgeBatchManifest,
  knownSourceIds: ReadonlySet<string> = new Set(
    OPENING_KNOWLEDGE_SOURCES.map((source) => source.id),
  ),
): void {
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported opening knowledge batch schema: ${manifest.schemaVersion}`);
  }
  nonEmpty(manifest.id, 'Opening knowledge batch ID must not be empty');
  if (!Number.isInteger(manifest.revision) || manifest.revision < 1) {
    throw new Error('Opening knowledge batch revision must be a positive integer');
  }
  nonEmpty(manifest.title, 'Opening knowledge batch title must not be empty');
  nonEmpty(manifest.rationale, 'Opening knowledge batch rationale must not be empty');
  if (!validDate(manifest.createdAt)) {
    throw new Error('Opening knowledge batch createdAt must be a valid ISO date');
  }
  if (manifest.priorityPolicyVersion !== OPENING_KNOWLEDGE_PRIORITY_POLICY.version) {
    throw new Error(
      `Opening knowledge batch priority policy must be ${OPENING_KNOWLEDGE_PRIORITY_POLICY.version}`,
    );
  }

  unique(manifest.selectedFamilies, 'Opening knowledge batch family must be unique and non-empty');
  if (!manifest.selectedFamilies.length) {
    throw new Error('Opening knowledge batch must select at least one family');
  }

  validateSnapshot(manifest.baseline.generatedEntries, 'Generated-entry baseline');
  validateSnapshot(manifest.baseline.uniqueNames, 'Unique-name baseline');
  if (manifest.baseline.importedGameWeight) {
    validateSnapshot(manifest.baseline.importedGameWeight, 'Imported-game baseline');
  }
  nonEmpty(manifest.baseline.knowledgeVersion, 'Baseline knowledge version must not be empty');
  nonEmpty(manifest.baseline.classificationVersion, 'Baseline classification version must not be empty');

  nonNegativeInteger(
    manifest.expectedGain.generatedAvailableEntries,
    'Expected generated-entry gain must be a non-negative integer',
  );
  nonNegativeInteger(
    manifest.expectedGain.uniqueAvailableNames,
    'Expected unique-name gain must be a non-negative integer',
  );
  if (manifest.expectedGain.importedGameAvailableWeight !== undefined) {
    nonNegativeInteger(
      manifest.expectedGain.importedGameAvailableWeight,
      'Expected imported-game gain must be a non-negative integer',
    );
  }

  if (!manifest.plannedRules.length) {
    throw new Error('Opening knowledge batch must plan at least one rule');
  }
  const ruleIds = new Set<string>();
  for (const rule of manifest.plannedRules) {
    nonEmpty(rule.id, 'Opening knowledge batch rule ID must not be empty');
    if (ruleIds.has(rule.id)) throw new Error(`Duplicate opening knowledge batch rule ID: ${rule.id}`);
    ruleIds.add(rule.id);
    nonEmpty(rule.selectorSummary, `Opening knowledge batch rule ${rule.id} selector must not be empty`);
    nonEmpty(rule.knowledgeIntent, `Opening knowledge batch rule ${rule.id} intent must not be empty`);
    unique(rule.sides, `Opening knowledge batch rule ${rule.id} side must be unique`);
    if (!rule.sides.length) throw new Error(`Opening knowledge batch rule ${rule.id} must select a side`);
    unique(rule.sourceIds, `Opening knowledge batch rule ${rule.id} source must be unique`);
    if (!rule.sourceIds.length) throw new Error(`Opening knowledge batch rule ${rule.id} needs sources`);
    for (const sourceId of rule.sourceIds) {
      if (!knownSourceIds.has(sourceId)) {
        throw new Error(`Opening knowledge batch rule ${rule.id} references missing source: ${sourceId}`);
      }
    }
    unique(
      rule.regressionFixtures,
      `Opening knowledge batch rule ${rule.id} fixture must be unique and non-empty`,
    );
    if (!rule.regressionFixtures.length) {
      throw new Error(`Opening knowledge batch rule ${rule.id} needs regression fixtures`);
    }
  }

  nonNegativeInteger(
    manifest.acceptance.minimumGeneratedAvailableGain,
    'Minimum generated-entry gain must be a non-negative integer',
  );
  nonNegativeInteger(
    manifest.acceptance.minimumUniqueNameAvailableGain,
    'Minimum unique-name gain must be a non-negative integer',
  );
  if (manifest.acceptance.minimumImportedGameAvailableGain !== undefined) {
    nonNegativeInteger(
      manifest.acceptance.minimumImportedGameAvailableGain,
      'Minimum imported-game gain must be a non-negative integer',
    );
  }

  if (manifest.lifecycle === 'REVIEWED' || manifest.lifecycle === 'APPLIED') {
    if (!manifest.reviewer) throw new Error('Reviewed opening knowledge batch needs a reviewer');
    nonEmpty(manifest.reviewer.name, 'Opening knowledge batch reviewer must not be empty');
    if (!validDate(manifest.reviewer.reviewedAt)) {
      throw new Error('Opening knowledge batch review date must be a valid ISO date');
    }
  }
}
