import type { OpeningBookEntry } from './openingBook.types';
import { OPENING_CLASSIFICATION_COVERAGE_RULES } from './openingClassification.coverage.rules';
import { OPENING_CLASSIFICATION_RULES } from './openingClassification.rules';
import {
  OPENING_CLASSIFICATION_VERSION,
  OpeningClassificationResult,
  OpeningClassificationRule,
  OpeningSideClassification,
  OpeningSideClassificationPatch,
} from './openingClassification.types';

export type {
  OpeningCharacter,
  OpeningClassificationConfidence,
  OpeningClassificationResult,
  OpeningClassificationRule,
  OpeningRole,
  OpeningSide,
  OpeningSideClassification,
  OpeningSoundness,
  OpeningTheoreticalStatus,
  OpeningTheoryBurden,
} from './openingClassification.types';
export { OPENING_CLASSIFICATION_VERSION } from './openingClassification.types';

const REPLACED_FOUNDATION_RULE_IDS = new Set(['family-owens-defense']);

const ALL_OPENING_CLASSIFICATION_RULES: readonly OpeningClassificationRule[] = [
  ...OPENING_CLASSIFICATION_RULES.filter((rule) => !REPLACED_FOUNDATION_RULE_IDS.has(rule.id)),
  ...OPENING_CLASSIFICATION_COVERAGE_RULES,
];

const UNKNOWN_SIDE_CLASSIFICATION: OpeningSideClassification = {
  soundness: 'UNKNOWN',
  character: [],
  theoreticalStatus: 'UNKNOWN',
  theoryBurden: 'UNKNOWN',
  roles: [],
  confidence: 'LOW',
};

function uniqueValues<T>(current: readonly T[], next: readonly T[] | undefined): readonly T[] {
  return next ? Array.from(new Set([...current, ...next])) : current;
}

function applyPatch(
  current: OpeningSideClassification,
  patch: OpeningSideClassificationPatch | undefined,
): OpeningSideClassification {
  if (!patch) return current;

  return {
    soundness: patch.soundness ?? current.soundness,
    character: uniqueValues(current.character, patch.character),
    theoreticalStatus: patch.theoreticalStatus ?? current.theoreticalStatus,
    theoryBurden: patch.theoryBurden ?? current.theoryBurden,
    roles: uniqueValues(current.roles, patch.roles),
    confidence: patch.confidence ?? current.confidence,
  };
}

function regexMatches(pattern: RegExp, value: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function matchesRule(entry: OpeningBookEntry, rule: OpeningClassificationRule): boolean {
  if (!regexMatches(rule.namePattern, entry.name)) return false;
  if (rule.ecoPattern && !regexMatches(rule.ecoPattern, entry.eco)) return false;
  if (rule.uciPrefix) {
    const normalizedPrefix = rule.uciPrefix.trim();
    if (entry.uci !== normalizedPrefix && !entry.uci.startsWith(`${normalizedPrefix} `)) return false;
  }
  return true;
}

export function validateOpeningClassificationRules(
  rules: readonly OpeningClassificationRule[] = ALL_OPENING_CLASSIFICATION_RULES,
): void {
  const ids = new Set<string>();

  for (const rule of rules) {
    if (!rule.id.trim()) throw new Error('Opening classification rule ID must not be empty');
    if (ids.has(rule.id)) throw new Error(`Duplicate opening classification rule ID: ${rule.id}`);
    ids.add(rule.id);

    if (rule.namePattern.global || rule.namePattern.sticky) {
      throw new Error(`Opening classification rule ${rule.id} must not use global or sticky regex flags`);
    }
    if (rule.ecoPattern?.global || rule.ecoPattern?.sticky) {
      throw new Error(`Opening classification ECO rule ${rule.id} must not use global or sticky regex flags`);
    }
    if (!rule.white && !rule.black) {
      throw new Error(`Opening classification rule ${rule.id} must classify at least one side`);
    }
  }
}

validateOpeningClassificationRules();

export const OpeningClassificationService = {
  classify(
    entry: OpeningBookEntry,
    rules: readonly OpeningClassificationRule[] = ALL_OPENING_CLASSIFICATION_RULES,
  ): OpeningClassificationResult {
    let white: OpeningSideClassification = { ...UNKNOWN_SIDE_CLASSIFICATION };
    let black: OpeningSideClassification = { ...UNKNOWN_SIDE_CLASSIFICATION };
    const matchedRuleIds: string[] = [];

    for (const rule of rules) {
      if (!matchesRule(entry, rule)) continue;
      matchedRuleIds.push(rule.id);
      white = applyPatch(white, rule.white);
      black = applyPatch(black, rule.black);
    }

    return {
      version: OPENING_CLASSIFICATION_VERSION,
      entry,
      white,
      black,
      matchedRuleIds,
    };
  },

  rules(): readonly OpeningClassificationRule[] {
    return ALL_OPENING_CLASSIFICATION_RULES;
  },
};
