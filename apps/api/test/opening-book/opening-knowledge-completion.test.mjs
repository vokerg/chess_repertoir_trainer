import assert from 'node:assert/strict';
import { OPENING_BOOK } from '../../dist/services/opening-book/openingBook.generated.js';
import {
  OPENING_KNOWLEDGE_COMPLETION_FAMILIES,
} from '../../dist/services/opening-book/openingKnowledge.completion.rules.js';
import {
  OpeningKnowledgeService,
  validateOpeningKnowledgeRegistry,
} from '../../dist/services/opening-book/openingKnowledgeService.js';

validateOpeningKnowledgeRegistry();

assert.equal(OPENING_KNOWLEDGE_COMPLETION_FAMILIES.length, 119);
assert.equal(OpeningKnowledgeService.rules().length, 160);

const openingNames = new Set(OPENING_BOOK.map((entry) => entry.name));
const completionRuleIds = new Set(
  OPENING_KNOWLEDGE_COMPLETION_FAMILIES.map(
    (family) => `knowledge-completion-${family.id}`,
  ),
);
const exercisedCompletionRuleIds = new Set();
const uniqueNames = new Set();

for (const family of OPENING_KNOWLEDGE_COMPLETION_FAMILIES) {
  assert.ok(openingNames.has(family.fixture), `${family.family} fixture must exist: ${family.fixture}`);
  if (family.kind === 'FULL') {
    assert.ok(family.whiteSummary, `${family.family} must define White guidance`);
    assert.ok(family.blackSummary, `${family.family} must define Black guidance`);
  }
}

for (const entry of OPENING_BOOK) {
  uniqueNames.add(entry.name);
  const result = OpeningKnowledgeService.resolve(entry);

  assert.equal(result.status, 'AVAILABLE', entry.name);
  assert.ok(result.shortDescription, `${entry.name} must have a short description`);
  assert.ok(result.description, `${entry.name} must have a long description`);
  assert.ok(result.white.strategicSummary, `${entry.name} must have White guidance`);
  assert.ok(result.white.plans.length > 0, `${entry.name} must have a White plan`);
  assert.ok(result.black.strategicSummary, `${entry.name} must have Black guidance`);
  assert.ok(result.black.plans.length > 0, `${entry.name} must have a Black plan`);

  for (const ruleId of result.matchedKnowledgeRuleIds) {
    if (completionRuleIds.has(ruleId)) exercisedCompletionRuleIds.add(ruleId);
  }
}

assert.equal(OPENING_BOOK.length, 3733);
assert.equal(uniqueNames.size, 3167);
assert.deepEqual(
  [...completionRuleIds].filter((ruleId) => !exercisedCompletionRuleIds.has(ruleId)),
  [],
  'every completion rule must match at least one pinned opening-book entry',
);

console.log('Opening knowledge completion tests passed.');
