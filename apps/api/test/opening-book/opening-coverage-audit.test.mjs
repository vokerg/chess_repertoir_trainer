import assert from 'node:assert/strict';
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
  assert.ok(result.priorityBacklog[0].factors.unknownClassificationDimensionWeight > 0);
}

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
