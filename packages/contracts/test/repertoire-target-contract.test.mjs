import assert from 'node:assert/strict';
import {
  LICHESS_GAMES_RATING_GROUPS,
} from '../dist/opening-explorer/index.js';
import {
  REPERTOIRE_TARGET_IMMUTABLE_FIELDS,
  REPERTOIRE_TARGET_MUTABLE_FIELDS,
  REPERTOIRE_TARGET_RECALCULATION_FIELDS,
  alternatePersonaRepertoireTargetExample,
  appendHigherLichessRatingGroup,
  existingCourseRepertoireTargetExample,
  newCourseRepertoireTargetExample,
  profileOverrideRepertoireTargetExample,
  repertoireTargetCandidateChangedFields,
  repertoireTargetChangedFields,
  repertoireTargetImmutableFieldsChanged,
  repertoireTargetPeerResolutionExample,
  repertoireTargetRequiresCandidateRecalculation,
  repertoireTargetSchema,
  resolveRepertoireTargetPopulation,
} from '../dist/repertoire-target/index.js';

for (const example of [
  newCourseRepertoireTargetExample,
  existingCourseRepertoireTargetExample,
  profileOverrideRepertoireTargetExample,
  alternatePersonaRepertoireTargetExample,
]) {
  assert.deepEqual(repertoireTargetSchema.parse(example), example);
}

assert.deepEqual(
  resolveRepertoireTargetPopulation({ kind: 'ALL_PLAYERS' }).effectiveRatingGroups,
  LICHESS_GAMES_RATING_GROUPS,
);
assert.deepEqual(
  resolveRepertoireTargetPopulation({ kind: 'EXPLICIT_LICHESS_GROUP', ratingGroup: 1800 })
    .effectiveRatingGroups,
  [1800],
);
assert.deepEqual(
  resolveRepertoireTargetPopulation(
    { kind: 'MY_PEERS' },
    repertoireTargetPeerResolutionExample,
  ).effectiveRatingGroups,
  [1400, 1600],
);
assert.deepEqual(
  resolveRepertoireTargetPopulation(
    { kind: 'MY_PEERS_PLUS_ONE' },
    repertoireTargetPeerResolutionExample,
  ).effectiveRatingGroups,
  [1400, 1600, 1800],
);
assert.deepEqual(appendHigherLichessRatingGroup([2200, 2500]), [2200, 2500]);
assert.throws(() => resolveRepertoireTargetPopulation({ kind: 'MY_PEERS' }));

assert.equal(repertoireTargetSchema.safeParse({
  ...alternatePersonaRepertoireTargetExample,
  objective: {
    ...alternatePersonaRepertoireTargetExample.objective,
    allowDeliberatelyDubious: false,
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  objective: {
    ...newCourseRepertoireTargetExample.objective,
    allowDeliberatelyDubious: true,
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  objective: {
    ...newCourseRepertoireTargetExample.objective,
    minimumSoundness: 'UNKNOWN',
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  objective: {
    ...newCourseRepertoireTargetExample.objective,
    maximumTheoryBurden: 'UNKNOWN',
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  accountIds: [1, 1],
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  accountIds: [],
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  population: {
    ...newCourseRepertoireTargetExample.population,
    effectiveRatingGroups: [1400, 1600],
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  population: {
    ...newCourseRepertoireTargetExample.population,
    peerResolution: {
      ...newCourseRepertoireTargetExample.population.peerResolution,
      contributions: [{
        ...newCourseRepertoireTargetExample.population.peerResolution.contributions[0],
        accountId: 2,
      }],
    },
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...profileOverrideRepertoireTargetExample,
  overriddenFields: ['speedPreset', 'population'],
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  overriddenFields: ['coverage'],
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  defaults: [
    ...newCourseRepertoireTargetExample.defaults,
    newCourseRepertoireTargetExample.defaults[0],
  ],
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  createdAt: '2026-07-28T10:00:00.000Z',
  updatedAt: '2026-07-28T09:00:00.000Z',
}).success, false);

const metadataOnly = {
  ...newCourseRepertoireTargetExample,
  updatedAt: '2026-07-28T10:00:00.000Z',
};
assert.deepEqual(repertoireTargetChangedFields(newCourseRepertoireTargetExample, metadataOnly), ['updatedAt']);
assert.deepEqual(repertoireTargetCandidateChangedFields(newCourseRepertoireTargetExample, metadataOnly), []);
assert.equal(repertoireTargetRequiresCandidateRecalculation(newCourseRepertoireTargetExample, metadataOnly), false);

const provenanceOnly = {
  ...newCourseRepertoireTargetExample,
  defaults: newCourseRepertoireTargetExample.defaults.map((entry) => (
    entry.field === 'objective'
      ? {
        ...entry,
        source: { kind: 'PERSONA_PRESET', presetVersion: '2026-07-v2' },
      }
      : entry
  )),
};
assert.deepEqual(repertoireTargetChangedFields(newCourseRepertoireTargetExample, provenanceOnly), ['defaults']);
assert.deepEqual(repertoireTargetCandidateChangedFields(newCourseRepertoireTargetExample, provenanceOnly), []);
assert.equal(repertoireTargetRequiresCandidateRecalculation(newCourseRepertoireTargetExample, provenanceOnly), false);

const peerEvidenceOnly = {
  ...newCourseRepertoireTargetExample,
  population: {
    ...newCourseRepertoireTargetExample.population,
    peerResolution: {
      ...newCourseRepertoireTargetExample.population.peerResolution,
      eligibleGames: 121,
    },
  },
  defaults: newCourseRepertoireTargetExample.defaults.map((entry) => (
    entry.field === 'population'
      ? {
        ...entry,
        value: {
          ...entry.value,
          peerResolution: {
            ...entry.value.peerResolution,
            eligibleGames: 121,
          },
        },
      }
      : entry
  )),
};
assert.deepEqual(repertoireTargetChangedFields(newCourseRepertoireTargetExample, peerEvidenceOnly), [
  'population',
]);
assert.deepEqual(repertoireTargetCandidateChangedFields(newCourseRepertoireTargetExample, peerEvidenceOnly), []);
assert.equal(repertoireTargetRequiresCandidateRecalculation(newCourseRepertoireTargetExample, peerEvidenceOnly), false);

const changedCoverage = {
  ...newCourseRepertoireTargetExample,
  coverage: {
    ...newCourseRepertoireTargetExample.coverage,
    opponentResponseCoveragePercent: 90,
  },
  overriddenFields: ['coverage'],
};
assert.deepEqual(repertoireTargetCandidateChangedFields(newCourseRepertoireTargetExample, changedCoverage), ['coverage']);
assert.equal(repertoireTargetRequiresCandidateRecalculation(newCourseRepertoireTargetExample, changedCoverage), true);

const accountOrderOnly = {
  ...existingCourseRepertoireTargetExample,
  accountIds: [2, 1],
};
const accountOrderEquivalent = {
  ...existingCourseRepertoireTargetExample,
  accountIds: [1, 2],
};
assert.deepEqual(repertoireTargetChangedFields(accountOrderOnly, accountOrderEquivalent), []);
assert.equal(repertoireTargetRequiresCandidateRecalculation(accountOrderOnly, accountOrderEquivalent), false);

const changedIdentity = {
  ...newCourseRepertoireTargetExample,
  targetId: '00000000-0000-4000-8000-000000000010',
};
assert.deepEqual(repertoireTargetImmutableFieldsChanged(newCourseRepertoireTargetExample, changedIdentity), ['targetId']);

assert.deepEqual(REPERTOIRE_TARGET_IMMUTABLE_FIELDS, ['contractVersion', 'targetId', 'createdAt']);
assert.deepEqual(REPERTOIRE_TARGET_MUTABLE_FIELDS, [
  'side',
  'startingPoint',
  'speedPreset',
  'population',
  'accountIds',
  'objective',
  'coverage',
  'defaults',
  'overriddenFields',
  'updatedAt',
]);
assert.deepEqual(REPERTOIRE_TARGET_RECALCULATION_FIELDS, [
  'side',
  'startingPoint',
  'speedPreset',
  'population',
  'accountIds',
  'objective',
  'coverage',
]);

console.log('Repertoire target contract tests passed.');
