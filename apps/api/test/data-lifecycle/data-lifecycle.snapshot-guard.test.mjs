import assert from 'node:assert/strict';
import {
  DataLifecycleWriteBlockedError,
  assertDataLifecycleWriteAllowed,
} from '../../dist/modules/data-lifecycle/data-lifecycle.guard.js';

const snapshotStartedAt = new Date('2026-08-22T04:00:00.000Z');
let capturedWhere;
const transaction = {
  async $executeRaw() { return 0; },
  dataLifecycleResourceFence: {
    async findFirst(input) {
      capturedWhere = input.where;
      return {
        operationId: 91,
        resourceType: 'ACCOUNT',
        resourceId: 7,
      };
    },
  },
};

await assert.rejects(
  assertDataLifecycleWriteAllowed(transaction, {
    userId: 3,
    accountId: 7,
    snapshotStartedAt,
  }),
  (error) => {
    assert.ok(error instanceof DataLifecycleWriteBlockedError);
    assert.equal(error.operationId, 91);
    return true;
  },
);

assert.equal(capturedWhere.ownerUserId, 3);
assert.deepEqual(capturedWhere.AND[1], {
  OR: [
    { releasedAt: null },
    { releasedAt: { gte: snapshotStartedAt } },
  ],
});
assert.deepEqual(capturedWhere.AND[0], {
  OR: [
    { resourceType: 'USER' },
    { resourceType: 'ACCOUNT', resourceId: 7 },
    { resourceType: 'GAME', ownerAccountId: 7 },
  ],
});

await assert.rejects(
  assertDataLifecycleWriteAllowed(transaction, {
    userId: 3,
    accountId: 7,
    snapshotStartedAt: new Date(Number.NaN),
  }),
  /snapshotStartedAt must be a valid timestamp/,
);

console.log('Data lifecycle snapshot guard tests passed.');
