import assert from 'node:assert/strict';
import { OPENING_BOOK } from '../../dist/services/opening-book/openingBook.generated.js';
import { OpeningClassificationService } from '../../dist/services/opening-book/openingClassificationService.js';
import {
  OPENING_KNOWLEDGE_VERSION,
  OpeningKnowledgeService,
  validateOpeningKnowledgeRegistry,
} from '../../dist/services/opening-book/openingKnowledgeService.js';

function entry(name, options = {}) {
  return {
    eco: options.eco ?? 'A00',
    name,
    pgn: options.pgn ?? '1. e4',
    uci: options.uci ?? 'e2e4',
    epd: options.epd ?? 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    ply: options.ply ?? 1,
  };
}

const projectStatement = (text) => ({
  text,
  confidence: 'HIGH',
  sourceIds: ['project-editorial-rb-022'],
});
const projectPlan = (id, summary = id) => ({
  id,
  title: id,
  summary,
  confidence: 'HIGH',
  sourceIds: ['project-editorial-rb-022'],
});

validateOpeningKnowledgeRegistry();
assert.equal(OpeningKnowledgeService.rules().length, 25);

{
  const opening = entry('Sicilian Defense: Najdorf Variation, English Attack');
  const result = OpeningKnowledgeService.resolve(opening);

  assert.equal(result.knowledgeVersion, OPENING_KNOWLEDGE_VERSION);
  assert.equal(result.status, 'AVAILABLE');
  assert.ok(result.matchedKnowledgeRuleIds.includes('knowledge-family-sicilian-defense'));
  assert.ok(result.matchedKnowledgeRuleIds.includes('knowledge-subfamily-sicilian-najdorf'));
  assert.ok(result.matchedKnowledgeRuleIds.includes('knowledge-line-najdorf-english-attack'));
  assert.ok(result.white.plans.some((plan) => plan.id === 'najdorf-english-white-opposite-wing-attack'));
  assert.ok(result.black.plans.some((plan) => plan.id === 'najdorf-english-black-race-with-counterplay'));
  assert.ok(result.sources.some((source) => source.id === 'project-editorial-rb-022'));
  assert.ok(result.sources.some((source) => source.id === 'lichess-najdorf-english-attack'));
}

{
  const opening = entry('French Defense: Exchange Variation');
  const result = OpeningKnowledgeService.resolve(opening);

  assert.equal(result.status, 'AVAILABLE');
  assert.deepEqual(result.white.plans.map((plan) => plan.id), ['french-exchange-white-create-activity']);
  assert.deepEqual(result.black.plans.map((plan) => plan.id), ['french-exchange-black-activate-pieces']);
  assert.ok(!result.white.plans.some((plan) => plan.id === 'french-white-use-space-and-pawn-chain'));
  assert.ok(result.shortDescription.text.includes('symmetrical French structure'));
}

{
  const opening = entry('Sicilian Defense: Najdorf Variation, Poisoned Pawn Variation');
  const result = OpeningKnowledgeService.resolve(opening);

  assert.equal(result.status, 'AVAILABLE');
  assert.deepEqual(result.white.plans.map((plan) => plan.id), ['najdorf-poisoned-white-activity-before-material']);
  assert.deepEqual(result.black.plans.map((plan) => plan.id), ['najdorf-poisoned-black-consolidate-queen']);
}

{
  const english = OpeningKnowledgeService.resolve(entry('English Opening: Symmetrical Variation'));
  const reti = OpeningKnowledgeService.resolve(entry('Réti Opening: Modern Variation'));

  for (const result of [english, reti]) {
    assert.ok(result.white.plans.some((plan) => plan.id === 'flank-white-track-transposition'));
    assert.ok(result.black.plans.some((plan) => plan.id === 'flank-black-track-transposition'));
  }
}

{
  const result = OpeningKnowledgeService.resolve(entry('Italian Game: Evans Gambit Accepted'));

  assert.equal(result.status, 'PARTIAL');
  assert.ok(result.shortDescription);
  assert.equal(result.description, null);
  assert.ok(result.white.plans.some((plan) => plan.id === 'evans-white-open-centre-for-development'));
  assert.ok(result.white.plans.some((plan) => plan.id === 'evans-accepted-white-use-tempi-on-bishop'));
  assert.ok(result.black.plans.some((plan) => plan.id === 'evans-accepted-black-return-pawn-if-needed'));
  assert.notEqual(result.white.strategicSummary.text, result.black.strategicSummary.text);
}

{
  const result = OpeningKnowledgeService.resolve(entry('Invented Opening: Quiet Example'));

  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.shortDescription, null);
  assert.equal(result.description, null);
  assert.deepEqual(result.white, { strategicSummary: null, plans: [] });
  assert.deepEqual(result.black, { strategicSummary: null, plans: [] });
  assert.deepEqual(result.matchedKnowledgeRuleIds, []);
  assert.deepEqual(result.sources, []);
}

{
  const opening = entry('Sicilian Defense: Test Override');
  const classification = OpeningClassificationService.classify(opening);
  const rules = [
    {
      id: 'test-broad', revision: 1, lifecycle: 'REVIEWED',
      selector: { allClassificationRuleIds: ['family-sicilian-defense'] },
      white: { plans: [projectPlan('shared-plan', 'broad')] },
      black: { plans: [projectPlan('remove-me'), projectPlan('keep-me')] },
      rationale: 'test broad merge',
    },
    {
      id: 'test-narrow', revision: 1, lifecycle: 'REVIEWED',
      selector: { allClassificationRuleIds: ['family-sicilian-defense'], namePattern: /Test Override/i },
      white: { plans: [projectPlan('shared-plan', 'narrow')] },
      black: { removePlanIds: ['remove-me'] },
      rationale: 'test same-ID replacement and removal',
    },
    {
      id: 'test-draft', revision: 1, lifecycle: 'DRAFT',
      selector: { allClassificationRuleIds: ['family-sicilian-defense'] },
      white: { strategicSummary: projectStatement('must not leak') },
      rationale: 'test lifecycle filtering',
    },
    {
      id: 'test-deprecated', revision: 1, lifecycle: 'DEPRECATED',
      selector: { allClassificationRuleIds: ['family-sicilian-defense'] },
      black: { strategicSummary: projectStatement('must not leak') },
      rationale: 'test lifecycle filtering',
    },
  ];

  validateOpeningKnowledgeRegistry(rules, OpeningKnowledgeService.sources());
  const result = OpeningKnowledgeService.resolve(
    opening,
    classification,
    rules,
    OpeningKnowledgeService.sources(),
  );

  assert.deepEqual(result.matchedKnowledgeRuleIds, ['test-broad', 'test-narrow']);
  assert.equal(result.white.plans.find((plan) => plan.id === 'shared-plan').summary, 'narrow');
  assert.deepEqual(result.black.plans.map((plan) => plan.id), ['keep-me']);
  assert.equal(result.white.strategicSummary, null);
  assert.equal(result.black.strategicSummary, null);
}

{
  const baseRule = {
    id: 'validation-rule', revision: 1, lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-sicilian-defense'] },
    shortDescription: projectStatement('valid'),
    rationale: 'validation test',
  };
  const sources = OpeningKnowledgeService.sources();

  assert.throws(
    () => validateOpeningKnowledgeRegistry([baseRule, baseRule], sources),
    /Duplicate opening knowledge rule ID/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{ ...baseRule, selector: { allClassificationRuleIds: ['missing-rule'] } }], sources),
    /unknown classification rule ID/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{ ...baseRule, selector: { uciPrefix: 'not-a-move' } }], sources),
    /malformed UCI prefix/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{ ...baseRule, selector: { namePattern: /Sicilian/g } }], sources),
    /must not use global or sticky flags/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{ ...baseRule, shortDescription: projectStatement('') }], sources),
    /text must not be empty/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{
      ...baseRule,
      white: { plans: [projectPlan('duplicate'), projectPlan('duplicate')] },
    }], sources),
    /duplicate plan ID/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{
      ...baseRule,
      shortDescription: { ...projectStatement('missing'), sourceIds: ['missing-source'] },
    }], sources),
    /references missing source/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([{
      ...baseRule,
      shortDescription: {
        ...projectStatement('reference only'),
        sourceIds: ['lichess-sicilian-najdorf'],
      },
    }], sources),
    /project-original authorship/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([baseRule], [sources[0], sources[0]]),
    /Duplicate opening knowledge source ID/,
  );
  assert.throws(
    () => validateOpeningKnowledgeRegistry([baseRule], [{
      ...sources[0],
      id: 'bad-license',
      license: 'UNSUPPORTED',
    }]),
    /unsupported license/,
  );
}

{
  assert.ok(OPENING_BOOK.length > 3000);
  let available = 0;
  let partial = 0;
  let unavailable = 0;
  const usedRuleIds = new Set();

  for (const opening of OPENING_BOOK) {
    const classification = OpeningClassificationService.classify(opening);
    const result = OpeningKnowledgeService.resolve(opening, classification);
    assert.equal(result.entry, opening);
    assert.equal(result.knowledgeVersion, OPENING_KNOWLEDGE_VERSION);
    assert.equal(result.classificationVersion, classification.version);
    assert.ok(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE'].includes(result.status));
    result.matchedKnowledgeRuleIds.forEach((id) => usedRuleIds.add(id));
    if (result.status === 'AVAILABLE') available += 1;
    if (result.status === 'PARTIAL') partial += 1;
    if (result.status === 'UNAVAILABLE') unavailable += 1;
  }

  assert.ok(available > 0);
  assert.ok(partial > 0);
  assert.ok(unavailable > 0);
  assert.ok(usedRuleIds.size >= 20);
  console.log(JSON.stringify({
    openingKnowledgeCoverage: {
      entries: OPENING_BOOK.length,
      available,
      partial,
      unavailable,
      usedRules: usedRuleIds.size,
    },
  }));
}
