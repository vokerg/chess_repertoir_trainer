import assert from 'node:assert/strict';
import {
  validateOpeningKnowledgeBatchManifest,
} from '../../dist/services/opening-book/openingKnowledgeBatchManifest.js';
import {
  buildOpeningClassificationCoverageAudit,
  openingClassificationUnknownDimensionCount,
} from '../../dist/services/opening-book/openingClassificationCoverageAudit.js';
import {
  buildOpeningKnowledgeCoverageAudit,
  openingSideKnowledgeStatus,
  OPENING_KNOWLEDGE_PRIORITY_POLICY,
} from '../../dist/services/opening-book/openingKnowledgeCoverageAudit.js';

function entry(name) {
  return { eco: 'A00', name, pgn: '', uci: '', epd: '', ply: 0 };
}

function side(overrides = {}) {
  return {
    soundness: 'UNKNOWN',
    character: [],
    theoreticalStatus: 'UNKNOWN',
    theoryBurden: 'UNKNOWN',
    roles: [],
    confidence: 'LOW',
    ...overrides,
  };
}

function classification(name, white, black) {
  return {
    version: '2026-07-rules-v2',
    entry: entry(name),
    white,
    black,
    matchedRuleIds: ['test-rule'],
  };
}

function sideKnowledge(summary, plans = []) {
  return {
    strategicSummary: summary ? { text: summary, confidence: 'HIGH', sourceIds: ['test'] } : null,
    plans: plans.map((id) => ({
      id,
      title: id,
      summary: id,
      confidence: 'HIGH',
      sourceIds: ['test'],
    })),
  };
}

function knowledge(name, status, options = {}) {
  return {
    status,
    knowledgeVersion: '2026-08-knowledge-v1',
    classificationVersion: '2026-07-rules-v2',
    entry: entry(name),
    shortDescription: options.shortDescription
      ? { text: options.shortDescription, confidence: 'HIGH', sourceIds: ['test'] }
      : null,
    description: options.description
      ? { text: options.description, confidence: 'HIGH', sourceIds: ['test'] }
      : null,
    white: options.white ?? sideKnowledge(null),
    black: options.black ?? sideKnowledge(null),
    matchedClassificationRuleIds: ['test-rule'],
    matchedKnowledgeRuleIds: status === 'UNAVAILABLE' ? [] : ['test-knowledge'],
    sources: [],
  };
}

function coverage(total, available, partial, unavailable) {
  return { total, available, partial, unavailable };
}

function batchManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    id: 'rb-025-batch-001',
    revision: 1,
    lifecycle: 'DRAFT',
    title: 'First prioritized opening knowledge batch',
    rationale: 'Expand high-impact unavailable families using broad rules and narrow exceptions.',
    priorityPolicyVersion: OPENING_KNOWLEDGE_PRIORITY_POLICY.version,
    createdAt: '2026-08-06',
    selectedFamilies: ['Italian Game'],
    baseline: {
      knowledgeVersion: '2026-08-knowledge-v1',
      classificationVersion: '2026-07-rules-v2',
      generatedEntries: coverage(3733, 1352, 299, 2082),
      uniqueNames: coverage(3167, 1000, 200, 1967),
    },
    expectedGain: {
      generatedAvailableEntries: 20,
      uniqueAvailableNames: 10,
    },
    plannedRules: [{
      id: 'knowledge-family-italian-game',
      selectorSummary: 'classification family-italian-game',
      knowledgeIntent: 'Add broad side-aware Italian Game orientation and plans.',
      sides: ['WHITE', 'BLACK'],
      sourceIds: ['project-editorial-rb-022'],
      regressionFixtures: ['Italian Game: Giuoco Piano'],
    }],
    acceptance: {
      minimumGeneratedAvailableGain: 10,
      minimumUniqueNameAvailableGain: 5,
      requireAllRulesExercised: true,
      requireNoRankingContractChange: true,
    },
    ...overrides,
  };
}

const completeHigh = side({
  soundness: 'SOUND',
  character: ['BALANCED'],
  theoreticalStatus: 'MAINLINE',
  theoryBurden: 'MEDIUM',
  roles: ['RESPONDER'],
  confidence: 'HIGH',
});
const incompleteMedium = side({
  character: ['DYNAMIC'],
  theoryBurden: 'HIGH',
  roles: ['INITIATOR'],
  confidence: 'MEDIUM',
});
const unknownLow = side();

assert.equal(openingClassificationUnknownDimensionCount(completeHigh), 0);
assert.equal(openingClassificationUnknownDimensionCount(incompleteMedium), 2);
assert.equal(openingClassificationUnknownDimensionCount(unknownLow), 5);
assert.equal(openingSideKnowledgeStatus(sideKnowledge('summary', ['plan'])), 'AVAILABLE');
assert.equal(openingSideKnowledgeStatus(sideKnowledge('summary')), 'PARTIAL');
assert.equal(openingSideKnowledgeStatus(sideKnowledge(null)), 'UNAVAILABLE');

{
  const result = buildOpeningClassificationCoverageAudit([
    {
      name: 'Complete Opening',
      weight: 3,
      classification: classification('Complete Opening', completeHigh, completeHigh),
    },
    {
      name: 'Incomplete Opening',
      weight: 2,
      classification: classification('Incomplete Opening', incompleteMedium, unknownLow),
    },
  ], 5);

  assert.equal(result.totalWeight, 5);
  assert.equal(result.sides.white.complete, 3);
  assert.equal(result.sides.white.fullySpecifiedHighConfidence, 3);
  assert.deepEqual(result.sides.white.unknown.soundness, { weight: 2, pct: 40 });
  assert.deepEqual(result.sides.white.unknown.theoreticalStatus, { weight: 2, pct: 40 });
  assert.equal(result.sides.black.complete, 3);
  assert.equal(result.sides.black.confidence.LOW, 2);
  assert.deepEqual(result.sides.black.unknown.roles, { weight: 2, pct: 40 });
}

{
  const observations = [
    {
      name: 'French Defense: Advance Variation',
      weight: 4,
      classification: classification('French Defense: Advance Variation', completeHigh, completeHigh),
      knowledge: knowledge('French Defense: Advance Variation', 'AVAILABLE', {
        shortDescription: 'Short',
        description: 'Long',
        white: sideKnowledge('White plan', ['white-plan']),
        black: sideKnowledge('Black plan', ['black-plan']),
      }),
    },
    {
      name: 'Invented Defense: Quiet Variation',
      weight: 2,
      classification: classification('Invented Defense: Quiet Variation', unknownLow, unknownLow),
      knowledge: knowledge('Invented Defense: Quiet Variation', 'UNAVAILABLE'),
    },
    {
      name: 'Invented Defense: Gambit',
      weight: 1,
      classification: classification('Invented Defense: Gambit', incompleteMedium, incompleteMedium),
      knowledge: knowledge('Invented Defense: Gambit', 'PARTIAL', {
        shortDescription: 'Short only',
        white: sideKnowledge('White plan', ['white-plan']),
        black: sideKnowledge('Black summary only'),
      }),
    },
  ];

  const result = buildOpeningKnowledgeCoverageAudit(observations, 7);
  assert.equal(result.knowledge.overall.AVAILABLE, 4);
  assert.equal(result.knowledge.overall.PARTIAL, 1);
  assert.equal(result.knowledge.overall.UNAVAILABLE, 2);
  assert.equal(result.knowledge.sides.white.AVAILABLE, 5);
  assert.equal(result.knowledge.sides.white.UNAVAILABLE, 2);
  assert.equal(result.knowledge.sides.black.AVAILABLE, 4);
  assert.equal(result.knowledge.sides.black.PARTIAL, 1);
  assert.equal(result.knowledge.sides.black.UNAVAILABLE, 2);
  assert.equal(result.knowledge.descriptions.descriptionMissing, 3);
  assert.equal(result.classification.sides.white.unknown.soundness.weight, 3);
  assert.equal(result.priorityPolicy.version, OPENING_KNOWLEDGE_PRIORITY_POLICY.version);
  assert.equal(result.priorityBacklog[0].family, 'Invented Defense');
  assert.equal(result.priorityBacklog[0].corpusWeight, 3);
  assert.equal(result.priorityBacklog[0].uniqueNames, 2);
  assert.ok(result.priorityBacklog[0].factors.unavailableKnowledgeWeight > 0);
  assert.ok(result.priorityBacklog[0].factors.sideGapWeight > 0);
  assert.ok(result.priorityBacklog[0].factors.unknownClassificationDimensionWeight > 0);
}

validateOpeningKnowledgeBatchManifest(batchManifest());
validateOpeningKnowledgeBatchManifest(batchManifest({
  lifecycle: 'REVIEWED',
  reviewer: { name: 'Maintainer', reviewedAt: '2026-08-06' },
}));
assert.throws(
  () => validateOpeningKnowledgeBatchManifest(batchManifest({
    lifecycle: 'REVIEWED',
  })),
  /needs a reviewer/,
);
assert.throws(
  () => validateOpeningKnowledgeBatchManifest(batchManifest({
    priorityPolicyVersion: 'stale-policy',
  })),
  /priority policy/,
);
assert.throws(
  () => validateOpeningKnowledgeBatchManifest(batchManifest({
    plannedRules: [{
      id: 'missing-source',
      selectorSummary: 'test',
      knowledgeIntent: 'test',
      sides: ['WHITE'],
      sourceIds: ['missing-source'],
      regressionFixtures: ['fixture'],
    }],
  })),
  /references missing source/,
);
assert.throws(
  () => validateOpeningKnowledgeBatchManifest(batchManifest({
    baseline: {
      knowledgeVersion: 'v1',
      classificationVersion: 'v1',
      generatedEntries: coverage(3, 1, 1, 0),
      uniqueNames: coverage(1, 1, 0, 0),
    },
  })),
  /statuses must add up to total/,
);

assert.throws(
  () => buildOpeningClassificationCoverageAudit([], 1),
  /does not match observed weight/,
);
assert.throws(
  () => buildOpeningClassificationCoverageAudit([{
    name: 'Invalid',
    weight: 0,
    classification: classification('Invalid', completeHigh, completeHigh),
  }]),
  /positive integer/,
);
