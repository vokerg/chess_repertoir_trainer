import type { OpeningBookEntry } from './openingBook.types';
import { OpeningClassificationService } from './openingClassificationService';
import type { OpeningClassificationResult } from './openingClassification.types';
import { OPENING_KNOWLEDGE_RULES } from './openingKnowledge.rules';
import { OPENING_KNOWLEDGE_SOURCES } from './openingKnowledge.sources';
import {
  OPENING_KNOWLEDGE_VERSION,
  type OpeningKnowledgeLicense,
  type OpeningKnowledgeResult,
  type OpeningKnowledgeRule,
  type OpeningKnowledgeSelector,
  type OpeningKnowledgeSource,
  type OpeningKnowledgeSourceType,
  type OpeningKnowledgeStatement,
  type OpeningSideKnowledge,
  type OpeningSideKnowledgePatch,
  type OpeningStrategicPlan,
} from './openingKnowledge.types';

export type {
  OpeningKnowledgeConfidence,
  OpeningKnowledgeLifecycle,
  OpeningKnowledgeLicense,
  OpeningKnowledgeResult,
  OpeningKnowledgeRule,
  OpeningKnowledgeSelector,
  OpeningKnowledgeSource,
  OpeningKnowledgeSourceType,
  OpeningKnowledgeStatement,
  OpeningKnowledgeStatus,
  OpeningSideKnowledge,
  OpeningSideKnowledgePatch,
  OpeningStrategicPlan,
} from './openingKnowledge.types';
export { OPENING_KNOWLEDGE_VERSION } from './openingKnowledge.types';

const SUPPORTED_LICENSES = new Set<OpeningKnowledgeLicense>([
  'PROJECT_ORIGINAL',
  'CC0-1.0',
  'PUBLIC_DOMAIN',
  'CC-BY-SA-4.0',
  'REFERENCE_ONLY',
]);
const SUPPORTED_SOURCE_TYPES = new Set<OpeningKnowledgeSourceType>([
  'DATASET',
  'REFERENCE',
  'PROJECT_RESEARCH',
]);
const SUPPORTED_LIFECYCLES = new Set(['DRAFT', 'REVIEWED', 'DEPRECATED']);
const SUPPORTED_CONFIDENCE = new Set(['HIGH', 'MEDIUM', 'LOW']);
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function nonEmpty(value: string, message: string): void {
  if (!value.trim()) throw new Error(message);
}

function uniqueStrings(values: readonly string[], message: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    nonEmpty(value, message);
    if (seen.has(value)) throw new Error(`${message}: ${value}`);
    seen.add(value);
  }
}

function validateRegex(pattern: RegExp | undefined, message: string): void {
  if (pattern?.global || pattern?.sticky) throw new Error(message);
}

function normalizeUciSequence(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).join(' ');
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

function validateSourceIds(
  sourceIds: readonly string[],
  sourceMap: ReadonlyMap<string, OpeningKnowledgeSource>,
  context: string,
  requireProjectOriginal: boolean,
): void {
  if (!sourceIds.length) throw new Error(`${context} must reference at least one source`);
  uniqueStrings(sourceIds, `${context} has a duplicate or empty source ID`);

  let hasProjectOriginal = false;
  for (const sourceId of sourceIds) {
    const source = sourceMap.get(sourceId);
    if (!source) throw new Error(`${context} references missing source: ${sourceId}`);
    if (source.license === 'PROJECT_ORIGINAL') hasProjectOriginal = true;
  }

  if (requireProjectOriginal && !hasProjectOriginal) {
    throw new Error(`${context} must reference project-original authorship`);
  }
}

function validateStatement(
  value: OpeningKnowledgeStatement,
  sourceMap: ReadonlyMap<string, OpeningKnowledgeSource>,
  context: string,
  requireProjectOriginal: boolean,
): void {
  nonEmpty(value.text, `${context} text must not be empty`);
  if (!SUPPORTED_CONFIDENCE.has(value.confidence)) {
    throw new Error(`${context} has unsupported confidence: ${value.confidence}`);
  }
  validateSourceIds(value.sourceIds, sourceMap, context, requireProjectOriginal);
}

function validatePlan(
  value: OpeningStrategicPlan,
  sourceMap: ReadonlyMap<string, OpeningKnowledgeSource>,
  context: string,
  requireProjectOriginal: boolean,
): void {
  nonEmpty(value.id, `${context} plan ID must not be empty`);
  nonEmpty(value.title, `${context} plan title must not be empty`);
  nonEmpty(value.summary, `${context} plan summary must not be empty`);
  if (!SUPPORTED_CONFIDENCE.has(value.confidence)) {
    throw new Error(`${context} has unsupported confidence: ${value.confidence}`);
  }
  if (value.conditions) uniqueStrings(value.conditions, `${context} has duplicate or empty conditions`);
  if (value.caveats) uniqueStrings(value.caveats, `${context} has duplicate or empty caveats`);
  validateSourceIds(value.sourceIds, sourceMap, context, requireProjectOriginal);
}

function validateSidePatch(
  patch: OpeningSideKnowledgePatch | undefined,
  sourceMap: ReadonlyMap<string, OpeningKnowledgeSource>,
  context: string,
  requireProjectOriginal: boolean,
): void {
  if (!patch) return;
  if (patch.planMode && patch.planMode !== 'MERGE' && patch.planMode !== 'REPLACE') {
    throw new Error(`${context} has unsupported plan mode: ${patch.planMode}`);
  }

  const changesPlans = patch.planMode === 'REPLACE'
    || Boolean(patch.removePlanIds?.length)
    || Boolean(patch.plans?.length);
  if (!patch.strategicSummary && !changesPlans) {
    throw new Error(`${context} must change a summary or plans`);
  }

  if (patch.strategicSummary) {
    validateStatement(patch.strategicSummary, sourceMap, `${context} strategic summary`, requireProjectOriginal);
  }
  if (patch.removePlanIds) uniqueStrings(patch.removePlanIds, `${context} has duplicate or empty removed plan IDs`);

  const planIds = new Set<string>();
  for (const value of patch.plans ?? []) {
    if (planIds.has(value.id)) throw new Error(`${context} has duplicate plan ID: ${value.id}`);
    planIds.add(value.id);
    validatePlan(value, sourceMap, `${context} plan ${value.id}`, requireProjectOriginal);
  }
  for (const removedId of patch.removePlanIds ?? []) {
    if (planIds.has(removedId)) {
      throw new Error(`${context} cannot remove and add plan ${removedId} in one patch`);
    }
  }
}

function validateSelector(
  selector: OpeningKnowledgeSelector,
  validClassificationRuleIds: ReadonlySet<string>,
  context: string,
): void {
  const allIds = selector.allClassificationRuleIds ?? [];
  const anyIds = selector.anyClassificationRuleIds ?? [];
  const hasSelector = allIds.length > 0
    || anyIds.length > 0
    || Boolean(selector.namePattern)
    || Boolean(selector.ecoPattern)
    || Boolean(selector.uciPrefix?.trim());
  if (!hasSelector) throw new Error(`${context} must define at least one selector`);

  uniqueStrings(allIds, `${context} has duplicate or empty all-classification rule IDs`);
  uniqueStrings(anyIds, `${context} has duplicate or empty any-classification rule IDs`);
  for (const ruleId of [...allIds, ...anyIds]) {
    if (!validClassificationRuleIds.has(ruleId)) {
      throw new Error(`${context} references unknown classification rule ID: ${ruleId}`);
    }
  }

  validateRegex(selector.namePattern, `${context} name regex must not use global or sticky flags`);
  validateRegex(selector.ecoPattern, `${context} ECO regex must not use global or sticky flags`);

  if (selector.uciPrefix !== undefined) {
    const normalized = normalizeUciSequence(selector.uciPrefix);
    if (!normalized) throw new Error(`${context} UCI prefix must not be empty`);
    const moves = normalized.split(' ');
    if (moves.some((move) => !UCI_MOVE.test(move))) {
      throw new Error(`${context} has malformed UCI prefix: ${selector.uciPrefix}`);
    }
  }
}

export function validateOpeningKnowledgeRegistry(
  rules: readonly OpeningKnowledgeRule[] = OPENING_KNOWLEDGE_RULES,
  sources: readonly OpeningKnowledgeSource[] = OPENING_KNOWLEDGE_SOURCES,
  validClassificationRuleIds: ReadonlySet<string> = new Set(
    OpeningClassificationService.rules().map((rule) => rule.id),
  ),
): void {
  const sourceIds = new Set<string>();
  for (const source of sources) {
    nonEmpty(source.id, 'Opening knowledge source ID must not be empty');
    if (sourceIds.has(source.id)) throw new Error(`Duplicate opening knowledge source ID: ${source.id}`);
    sourceIds.add(source.id);
    nonEmpty(source.title, `Opening knowledge source ${source.id} title must not be empty`);
    nonEmpty(source.sourceRef, `Opening knowledge source ${source.id} reference must not be empty`);
    if (!SUPPORTED_SOURCE_TYPES.has(source.sourceType)) {
      throw new Error(`Opening knowledge source ${source.id} has unsupported source type: ${source.sourceType}`);
    }
    if (!SUPPORTED_LICENSES.has(source.license)) {
      throw new Error(`Opening knowledge source ${source.id} has unsupported license: ${source.license}`);
    }
    if (!isValidIsoDate(source.retrievedAt)) {
      throw new Error(`Opening knowledge source ${source.id} has invalid retrieval date`);
    }
  }

  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const ruleIds = new Set<string>();
  for (const rule of rules) {
    nonEmpty(rule.id, 'Opening knowledge rule ID must not be empty');
    if (ruleIds.has(rule.id)) throw new Error(`Duplicate opening knowledge rule ID: ${rule.id}`);
    ruleIds.add(rule.id);
    if (!Number.isInteger(rule.revision) || rule.revision < 1) {
      throw new Error(`Opening knowledge rule ${rule.id} revision must be a positive integer`);
    }
    if (!SUPPORTED_LIFECYCLES.has(rule.lifecycle)) {
      throw new Error(`Opening knowledge rule ${rule.id} has unsupported lifecycle: ${rule.lifecycle}`);
    }
    nonEmpty(rule.rationale, `Opening knowledge rule ${rule.id} rationale must not be empty`);
    validateSelector(rule.selector, validClassificationRuleIds, `Opening knowledge rule ${rule.id}`);

    const hasPatch = Boolean(
      rule.shortDescription || rule.description || rule.white || rule.black,
    );
    if (!hasPatch) throw new Error(`Opening knowledge rule ${rule.id} must provide knowledge`);

    const requireProjectOriginal = rule.lifecycle === 'REVIEWED';
    if (rule.shortDescription) {
      validateStatement(rule.shortDescription, sourceMap, `Opening knowledge rule ${rule.id} short description`, requireProjectOriginal);
    }
    if (rule.description) {
      validateStatement(rule.description, sourceMap, `Opening knowledge rule ${rule.id} description`, requireProjectOriginal);
    }
    validateSidePatch(rule.white, sourceMap, `Opening knowledge rule ${rule.id} White patch`, requireProjectOriginal);
    validateSidePatch(rule.black, sourceMap, `Opening knowledge rule ${rule.id} Black patch`, requireProjectOriginal);
  }
}

function regexMatches(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function selectorMatches(
  entry: OpeningBookEntry,
  matchedClassificationRuleIds: ReadonlySet<string>,
  selector: OpeningKnowledgeSelector,
): boolean {
  if (selector.allClassificationRuleIds?.some((id) => !matchedClassificationRuleIds.has(id))) return false;
  if (selector.anyClassificationRuleIds?.length
    && !selector.anyClassificationRuleIds.some((id) => matchedClassificationRuleIds.has(id))) return false;
  if (selector.namePattern && !regexMatches(selector.namePattern, entry.name)) return false;
  if (selector.ecoPattern && !regexMatches(selector.ecoPattern, entry.eco)) return false;
  if (selector.uciPrefix) {
    const prefix = normalizeUciSequence(selector.uciPrefix);
    const entryUci = normalizeUciSequence(entry.uci);
    if (entryUci !== prefix && !entryUci.startsWith(`${prefix} `)) return false;
  }
  return true;
}

function applySidePatch(
  current: OpeningSideKnowledge,
  patch: OpeningSideKnowledgePatch | undefined,
): OpeningSideKnowledge {
  if (!patch) return current;

  let plans = patch.planMode === 'REPLACE' ? [] : [...current.plans];
  if (patch.removePlanIds?.length) {
    const removed = new Set(patch.removePlanIds);
    plans = plans.filter((value) => !removed.has(value.id));
  }
  for (const next of patch.plans ?? []) {
    const existingIndex = plans.findIndex((value) => value.id === next.id);
    if (existingIndex >= 0) plans[existingIndex] = next;
    else plans.push(next);
  }

  return {
    strategicSummary: patch.strategicSummary ?? current.strategicSummary,
    plans,
  };
}

function collectSourceIds(
  shortDescription: OpeningKnowledgeStatement | null,
  description: OpeningKnowledgeStatement | null,
  white: OpeningSideKnowledge,
  black: OpeningSideKnowledge,
): ReadonlySet<string> {
  const ids = new Set<string>();
  const add = (value: OpeningKnowledgeStatement | OpeningStrategicPlan | null): void => {
    for (const sourceId of value?.sourceIds ?? []) ids.add(sourceId);
  };
  add(shortDescription);
  add(description);
  add(white.strategicSummary);
  add(black.strategicSummary);
  white.plans.forEach(add);
  black.plans.forEach(add);
  return ids;
}

function statusFor(
  matchedKnowledgeRuleIds: readonly string[],
  shortDescription: OpeningKnowledgeStatement | null,
  description: OpeningKnowledgeStatement | null,
  white: OpeningSideKnowledge,
  black: OpeningSideKnowledge,
): OpeningKnowledgeResult['status'] {
  if (!matchedKnowledgeRuleIds.length) return 'UNAVAILABLE';
  const complete = Boolean(
    shortDescription
    && description
    && white.strategicSummary
    && black.strategicSummary
    && white.plans.length
    && black.plans.length,
  );
  return complete ? 'AVAILABLE' : 'PARTIAL';
}

validateOpeningKnowledgeRegistry();

export const OpeningKnowledgeService = {
  resolve(
    entry: OpeningBookEntry,
    classification: OpeningClassificationResult = OpeningClassificationService.classify(entry),
    rules: readonly OpeningKnowledgeRule[] = OPENING_KNOWLEDGE_RULES,
    sources: readonly OpeningKnowledgeSource[] = OPENING_KNOWLEDGE_SOURCES,
  ): OpeningKnowledgeResult {
    let shortDescription: OpeningKnowledgeStatement | null = null;
    let description: OpeningKnowledgeStatement | null = null;
    let white: OpeningSideKnowledge = { strategicSummary: null, plans: [] };
    let black: OpeningSideKnowledge = { strategicSummary: null, plans: [] };
    const matchedKnowledgeRuleIds: string[] = [];
    const matchedClassificationRuleIds = new Set(classification.matchedRuleIds);

    for (const rule of rules) {
      if (rule.lifecycle !== 'REVIEWED') continue;
      if (!selectorMatches(entry, matchedClassificationRuleIds, rule.selector)) continue;
      matchedKnowledgeRuleIds.push(rule.id);
      shortDescription = rule.shortDescription ?? shortDescription;
      description = rule.description ?? description;
      white = applySidePatch(white, rule.white);
      black = applySidePatch(black, rule.black);
    }

    const finalSourceIds = collectSourceIds(shortDescription, description, white, black);
    const resolvedSources = sources.filter((source) => finalSourceIds.has(source.id));

    return {
      status: statusFor(matchedKnowledgeRuleIds, shortDescription, description, white, black),
      knowledgeVersion: OPENING_KNOWLEDGE_VERSION,
      classificationVersion: classification.version,
      entry,
      shortDescription,
      description,
      white,
      black,
      matchedClassificationRuleIds: classification.matchedRuleIds,
      matchedKnowledgeRuleIds,
      sources: resolvedSources,
    };
  },

  rules(): readonly OpeningKnowledgeRule[] {
    return OPENING_KNOWLEDGE_RULES;
  },

  sources(): readonly OpeningKnowledgeSource[] {
    return OPENING_KNOWLEDGE_SOURCES;
  },
};
