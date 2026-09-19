import assert from 'node:assert/strict';
import {
  ACCOUNT_IMPORT_POST_COMPLETION_DRAIN_LIMIT,
  drainAccountImportPostCompletion,
} from '../../dist/modules/account-imports/account-import.post-completion-drain.js';

{
  let calls = 0;
  const results = [true, true, true, false];
  const reconciled = await drainAccountImportPostCompletion(async () => {
    calls += 1;
    return results.shift() ?? false;
  });
  assert.equal(reconciled, 3);
  assert.equal(calls, 4, 'drain stops immediately once persisted dirty work is exhausted');
}

{
  let calls = 0;
  const reconciled = await drainAccountImportPostCompletion(async () => {
    calls += 1;
    return true;
  }, 2);
  assert.equal(reconciled, 2);
  assert.equal(calls, 2, 'drain obeys its hard maintenance bound');
}

assert.equal(ACCOUNT_IMPORT_POST_COMPLETION_DRAIN_LIMIT, 20);
await assert.rejects(
  drainAccountImportPostCompletion(async () => false, 0),
  /positive integer/,
);

console.log('Account-import post-completion drain tests passed.');
