import assert from 'node:assert/strict';
import { settlesWithin } from '../../dist/modules/jobs/job-worker-shutdown.js';

assert.equal(await settlesWithin(Promise.resolve(), 100), true);

const pendingRetention = new Promise(() => {});
const completeCleanup = Promise.allSettled([
  Promise.resolve(),
  pendingRetention,
]).then(() => undefined);
const startedAt = Date.now();
assert.equal(
  await settlesWithin(completeCleanup, 20),
  false,
  'pending retention work cannot extend shutdown beyond the configured budget',
);
assert.ok(Date.now() - startedAt < 500, 'the shutdown deadline remains bounded');

console.log('Persistent job worker shutdown deadline tests passed.');
