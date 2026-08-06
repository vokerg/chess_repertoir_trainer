import assert from 'node:assert/strict';
import { OPENING_BOOK } from '../../dist/services/opening-book/openingBook.generated.js';
import { OPENING_KNOWLEDGE_BATCH_MANIFESTS } from '../../dist/services/opening-book/openingKnowledgeBatch.manifests.js';
import { validateOpeningKnowledgeBatchManifest } from '../../dist/services/opening-book/openingKnowledgeBatchManifest.js';

assert.equal(OPENING_KNOWLEDGE_BATCH_MANIFESTS.length, 1);

const [manifest] = OPENING_KNOWLEDGE_BATCH_MANIFESTS;
validateOpeningKnowledgeBatchManifest(manifest);

assert.equal(manifest.id, 'rb-025-generated-priority-batch-001');
assert.equal(manifest.lifecycle, 'DRAFT');
assert.equal(manifest.selectedFamilies.length, 6);
assert.equal(manifest.plannedRules.length, 16);
assert.equal(manifest.expectedGain.generatedAvailableEntries, 671);
assert.equal(manifest.expectedGain.uniqueAvailableNames, 561);
assert.ok(manifest.plannedRules.every((rule) => rule.sides.includes('WHITE')));
assert.ok(manifest.plannedRules.every((rule) => rule.sides.includes('BLACK')));
assert.ok(manifest.plannedRules.every((rule) => rule.regressionFixtures.length > 0));

const openingNames = new Set(OPENING_BOOK.map((entry) => entry.name));
for (const plannedRule of manifest.plannedRules) {
  for (const fixture of plannedRule.regressionFixtures) {
    assert.ok(openingNames.has(fixture), `${plannedRule.id} fixture must exist: ${fixture}`);
  }
}
