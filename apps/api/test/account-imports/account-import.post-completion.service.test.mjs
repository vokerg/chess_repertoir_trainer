import assert from 'node:assert/strict';
import { createAccountImportPostCompletionService } from '../../dist/modules/account-imports/account-import.post-completion.service.js';

{
  const recomputed = [];
  const synchronized = [];
  const states = [
    {
      latestCompletedImportRunId: 12,
      latestCompletedAt: new Date('2026-08-20T10:02:00.000Z'),
      hasActiveImport: false,
    },
    {
      latestCompletedImportRunId: 12,
      latestCompletedAt: new Date('2026-08-20T10:02:00.000Z'),
      hasActiveImport: false,
    },
  ];
  const service = createAccountImportPostCompletionService({
    repository: {
      findNextCandidate: async () => ({
        userId: 1,
        accountId: 7,
        latestCompletedImportRunId: 11,
        latestCompletedAt: new Date('2026-08-20T10:00:00.000Z'),
      }),
      getState: async () => states.shift(),
      synchronizeForwardSyncMetadata: async (userId, accountId) => {
        synchronized.push([userId, accountId]);
        return true;
      },
    },
    ratingStats: {
      recomputeForAccount: async (userId, accountId) => {
        recomputed.push([userId, accountId]);
        return { ok: true };
      },
    },
  });

  assert.equal(await service.reconcileNext(), true);
  assert.deepEqual(recomputed, [[1, 7], [1, 7]]);
  assert.deepEqual(synchronized, [[1, 7]]);
}

{
  let recomputes = 0;
  let synchronized = 0;
  const service = createAccountImportPostCompletionService({
    repository: {
      findNextCandidate: async () => ({
        userId: 2,
        accountId: 9,
        latestCompletedImportRunId: 21,
        latestCompletedAt: new Date('2026-08-20T11:00:00.000Z'),
      }),
      getState: async () => ({
        latestCompletedImportRunId: 21,
        latestCompletedAt: new Date('2026-08-20T11:00:00.000Z'),
        hasActiveImport: true,
      }),
      synchronizeForwardSyncMetadata: async () => {
        synchronized += 1;
        return true;
      },
    },
    ratingStats: {
      recomputeForAccount: async () => {
        recomputes += 1;
        return { ok: true };
      },
    },
  });

  assert.equal(await service.reconcileNext(), true);
  assert.equal(recomputes, 1, 'an active successor import is left for a later durable completion pass');
  assert.equal(synchronized, 1);
}

{
  const service = createAccountImportPostCompletionService({
    repository: {
      findNextCandidate: async () => null,
      getState: async () => {
        throw new Error('not expected');
      },
      synchronizeForwardSyncMetadata: async () => {
        throw new Error('not expected');
      },
    },
    ratingStats: {
      recomputeForAccount: async () => {
        throw new Error('not expected');
      },
    },
  });

  assert.equal(await service.reconcileNext(), false);
}

console.log('Account-import post-completion service tests passed.');
