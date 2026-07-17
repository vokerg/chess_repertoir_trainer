import assert from 'node:assert/strict';
import {
  createImportedGameJobRunBodySchema,
  jobRunErrorCodeSchema,
  jobRunListQuerySchema,
  jobRunSummarySchema,
  jobTaskListQuerySchema,
  jobTaskSchema,
} from '../dist/jobs/index.js';

assert.deepEqual(createImportedGameJobRunBodySchema.parse({
  kind: 'ANALYSE_GAMES',
  gameIds: [3, 2, 1],
}), {
  kind: 'ANALYSE_GAMES',
  gameIds: [3, 2, 1],
  force: false,
});
assert.equal(
  createImportedGameJobRunBodySchema.safeParse({ kind: 'UNKNOWN', gameIds: [1] }).success,
  false,
);
assert.equal(
  createImportedGameJobRunBodySchema.safeParse({ kind: 'INDEX_GAMES', gameIds: [] }).success,
  false,
);

assert.deepEqual(jobRunListQuerySchema.parse({ active: 'true', limit: '25' }), {
  active: true,
  limit: 25,
});
assert.deepEqual(jobTaskListQuerySchema.parse({}), { offset: 0, limit: 100 });
assert.equal(jobRunErrorCodeSchema.parse('JOB_RUN_NOT_RETRYABLE'), 'JOB_RUN_NOT_RETRYABLE');

const summary = {
  id: 9,
  kind: 'PROCESS_GAMES',
  source: 'USER_ACTION',
  priority: 350,
  status: 'QUEUED',
  totalTasks: 2,
  force: false,
  taskCounts: {
    queued: 2,
    running: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    cancelled: 0,
  },
  createdAt: '2026-07-16T08:00:00.000Z',
  updatedAt: '2026-07-16T08:00:00.000Z',
  startedAt: null,
  completedAt: null,
};
assert.deepEqual(jobRunSummarySchema.parse(summary), summary);
assert.equal(
  jobRunSummarySchema.safeParse({ ...summary, taskCounts: { queued: 2 } }).success,
  false,
);

const retainedTask = {
  id: 12,
  importedGameId: null,
  ordinal: 0,
  status: 'QUEUED',
  error: null,
  createdAt: '2026-07-16T08:00:00.000Z',
  updatedAt: '2026-07-16T08:00:00.000Z',
};
assert.deepEqual(jobTaskSchema.parse(retainedTask), retainedTask);

console.log('Persistent job contract tests passed.');
