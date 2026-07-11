import assert from 'node:assert/strict';
import {
  analysisMergeTreeSchema,
} from '../../dist/modules/courses/analysis-reintegration.schemas.js';
import {
  importedGameSearchQuerySchema,
} from '../../dist/modules/imported-games/imported-games.schemas.js';
import {
  courseReviewQuerySchema,
} from '../../dist/modules/repertoire-coverage/course-review.schema.js';
import {
  bulkPositionAnalysisLookupSchema,
  storePositionAnalysisSchema,
} from '../../dist/modules/analysis/analysis.schemas.js';
import {
  createCourseSchema,
  updateCourseSchema,
  updateLineSchema,
} from '../../dist/modules/courses/courses.schemas.js';
import {
  scenarioTrainingAttemptSchema,
  tacticalScenarioStartSchema,
} from '../../dist/modules/scenario-training/scenario-training.schema.js';
import { trainingLogQuerySchema } from '../../dist/modules/lab/training-log/training-log.schema.js';
import { tacticalDetectionListSchema, tacticalDetectionRunSchema } from '../../dist/modules/lab/tactical-detections/tactical-detection.schema.js';

const importedGames = importedGameSearchQuerySchema.parse({
  accountIds: '1, 2',
  providers: 'LICHESS,CHESS_COM',
  rated: 'false',
  from: '2026-01-02T00:00:00.000Z',
  limit: '25',
});
assert.deepEqual(importedGames.accountIds, [1, 2]);
assert.deepEqual(importedGames.providers, ['LICHESS', 'CHESS_COM']);
assert.equal(importedGames.rated, false);
assert.equal(importedGames.from.toISOString(), '2026-01-02T00:00:00.000Z');
assert.equal(importedGames.limit, 25);
assert.equal(importedGames.sort, 'endedAtDesc');

assert.deepEqual(analysisMergeTreeSchema.parse({
  rootFen: 'startpos',
  children: [{ moveUci: 'e2e4', children: [{ moveUci: 'e7e5' }] }],
}), {
  rootFen: 'startpos',
  children: [{ moveUci: 'e2e4', children: [{ moveUci: 'e7e5', children: [] }] }],
});

assert.equal(courseReviewQuerySchema.safeParse({
  from: '2026-02-02T00:00:00.000Z',
  to: '2026-02-01T00:00:00.000Z',
}).success, false);

assert.deepEqual(storePositionAnalysisSchema.parse({
  fen: 'startpos',
  bestScoreCpWhite: null,
  lines: [{ moveUci: 'e2e4', pvUci: ['e2e4'] }],
}), {
  fen: 'startpos',
  bestScoreCpWhite: null,
  lines: [{ moveUci: 'e2e4', pvUci: ['e2e4'] }],
});
assert.equal(storePositionAnalysisSchema.safeParse({ fen: 'startpos', lines: [null] }).success, false);
assert.equal(bulkPositionAnalysisLookupSchema.safeParse({ fens: [] }).success, false);

assert.deepEqual(createCourseSchema.parse({ name: 'Course' }), { name: 'Course' });
assert.deepEqual(updateCourseSchema.parse({ description: null }), { description: null });
assert.equal(updateLineSchema.safeParse({ tags: [1] }).success, false);

assert.deepEqual(tacticalScenarioStartSchema.parse({}), {});
assert.equal(scenarioTrainingAttemptSchema.safeParse({ moveUci: [] }).success, false);
assert.deepEqual(tacticalDetectionRunSchema.parse({ force: 'true' }), { force: true });
assert.equal(tacticalDetectionListSchema.safeParse({ kind: 'NOT_A_KIND' }).success, false);
assert.deepEqual(trainingLogQuerySchema.parse({ limit: '10' }).limit, 10);

const issues = bulkPositionAnalysisLookupSchema.safeParse({ fens: [] });
assert.equal(issues.success, false);
assert.ok(issues.error.issues.some((issue) => issue.path[0] === 'fens'));

console.log('Zod 4 compatibility tests passed.');
