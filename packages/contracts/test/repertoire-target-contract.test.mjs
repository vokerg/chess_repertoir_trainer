import assert from 'node:assert/strict';
import {
  alternatePersonaRepertoireTargetExample,
  existingCourseRepertoireTargetExample,
  newCourseRepertoireTargetExample,
  repertoireTargetChangedFields,
  repertoireTargetRequiresCandidateRecalculation,
  repertoireTargetSchema,
} from '../dist/repertoire-target/index.js';

for (const example of [
  newCourseRepertoireTargetExample,
  existingCourseRepertoireTargetExample,
  alternatePersonaRepertoireTargetExample,
]) {
  assert.deepEqual(repertoireTargetSchema.parse(example), example);
}

assert.equal(repertoireTargetSchema.safeParse({
  ...alternatePersonaRepertoireTargetExample,
  objective: {
    ...alternatePersonaRepertoireTargetExample.objective,
    allowDeliberatelyDubious: false,
  },
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...existingCourseRepertoireTargetExample,
  overriddenFields: ['objective'],
}).success, false);

assert.equal(repertoireTargetSchema.safeParse({
  ...newCourseRepertoireTargetExample,
  population: { kind: 'EXPLICIT_LICHESS_GROUP', ratingGroup: 1500 },
}).success, false);

const metadataOnly = {
  ...newCourseRepertoireTargetExample,
  updatedAt: '2026-07-28T10:00:00.000Z',
};
assert.deepEqual(repertoireTargetChangedFields(newCourseRepertoireTargetExample, metadataOnly), []);
assert.equal(repertoireTargetRequiresCandidateRecalculation(newCourseRepertoireTargetExample, metadataOnly), false);

const changedCoverage = {
  ...newCourseRepertoireTargetExample,
  coverage: {
    ...newCourseRepertoireTargetExample.coverage,
    opponentResponseCoveragePercent: 90,
  },
};
assert.deepEqual(repertoireTargetChangedFields(newCourseRepertoireTargetExample, changedCoverage), ['coverage']);
assert.equal(repertoireTargetRequiresCandidateRecalculation(newCourseRepertoireTargetExample, changedCoverage), true);

console.log('Repertoire target contract tests passed.');
