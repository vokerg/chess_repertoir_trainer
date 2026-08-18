import assert from 'node:assert/strict';
import {
  dataLifecycleActionSchema,
  dataLifecycleErrorCodeSchema,
  dataLifecycleOperationStatusSchema,
  dataLifecyclePreviewCountsSchema,
  dataLifecycleResourceTypeSchema,
  dataLifecycleScopeSchema,
  dataLifecycleStopRequestSchema,
  dataLifecycleTerminalResultSchema,
  importedGameOpeningProvenanceSchema,
} from '../dist/data-lifecycle/index.js';

for (const action of [
  'UNANALYSE_GAMES',
  'UNINDEX_GAMES',
  'PURGE_ACCOUNT_DATA',
  'DELETE_EXTERNAL_ACCOUNT',
  'DELETE_APP_USER',
]) {
  assert.equal(dataLifecycleActionSchema.parse(action), action);
}

assert.equal(dataLifecycleOperationStatusSchema.parse('NEEDS_ATTENTION'), 'NEEDS_ATTENTION');
assert.equal(dataLifecycleResourceTypeSchema.parse('GAME'), 'GAME');
assert.equal(dataLifecycleStopRequestSchema.parse('STOP_AFTER_BATCH'), 'STOP_AFTER_BATCH');
assert.equal(dataLifecycleTerminalResultSchema.parse('CANCELLED_BEFORE_MUTATION'), 'CANCELLED_BEFORE_MUTATION');
assert.equal(dataLifecycleErrorCodeSchema.parse('DATA_LIFECYCLE_WRITE_BLOCKED'), 'DATA_LIFECYCLE_WRITE_BLOCKED');
assert.equal(dataLifecycleErrorCodeSchema.parse('DATA_LIFECYCLE_SCOPE_VIOLATION'), 'DATA_LIFECYCLE_SCOPE_VIOLATION');
assert.equal(importedGameOpeningProvenanceSchema.parse('LOCAL_BOOK'), 'LOCAL_BOOK');

assert.deepEqual(dataLifecycleScopeSchema.parse({
  resourceType: 'GAME',
  userId: 4,
  accountId: 12,
  gameIds: [90, 91],
}), {
  resourceType: 'GAME',
  userId: 4,
  accountId: 12,
  gameIds: [90, 91],
});
assert.equal(
  dataLifecycleScopeSchema.safeParse({
    resourceType: 'GAME',
    userId: 4,
    accountId: 12,
    gameIds: Array.from({ length: 101 }, (_, index) => index + 1),
  }).success,
  false,
);
assert.equal(dataLifecycleScopeSchema.safeParse({ resourceType: 'ACCOUNT', userId: 4 }).success, false);

const counts = {
  accounts: 1,
  games: 24,
  plies: 1_932,
  analysisRuns: 18,
  aiReviews: 2,
  tacticalDetections: 9,
  scenarioSessions: 3,
  importRuns: 4,
  jobRuns: 7,
  preparationRuns: 1,
};
assert.deepEqual(dataLifecyclePreviewCountsSchema.parse(counts), counts);
assert.equal(dataLifecyclePreviewCountsSchema.safeParse({ ...counts, games: -1 }).success, false);

console.log('Data lifecycle contract tests passed.');
