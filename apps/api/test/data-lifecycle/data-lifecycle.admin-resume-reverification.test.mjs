import assert from 'node:assert/strict';
import { createAccountGameDataLifecycleOperationRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game-operation.repository.prisma.js';

const digest = (character) => character.repeat(64);
const now = new Date('2026-09-09T06:00:00.000Z');
const baseOperation = {
  id: 41,
  action: 'PURGE_ACCOUNT_DATA',
  status: 'NEEDS_ATTENTION',
  actorUserId: 1,
  targetUserId: 7,
  actorKeyVersion: 3,
  actorKeyHash: digest('a'),
  targetKeyVersion: 3,
  targetKeyHash: digest('b'),
  scopeResourceType: 'ACCOUNT',
  scopeJson: { resourceType: 'ACCOUNT', userId: 7, accountId: 5 },
  previewCountsJson: {
    accounts: 1,
    games: 3,
    plies: 8,
    analysisRuns: 1,
    aiReviews: 0,
    tacticalDetections: 0,
    scenarioSessions: 0,
    importRuns: 1,
    jobRuns: 0,
    preparationRuns: 0,
  },
  previewHash: digest('c'),
  previewTokenHash: digest('d'),
  previewExpiresAt: new Date('2026-09-09T07:00:00.000Z'),
  confirmationPhrase: 'PURGE ACCOUNT 5',
  warningCodes: [],
  idempotencyKeyHash: digest('e'),
  receiptTokenHash: null,
  receiptExpiresAt: null,
  stopRequest: 'NONE',
  stopRequestedAt: null,
  checkpointJson: null,
  workKey: null,
  claimedAt: null,
  heartbeatAt: null,
  firstDestructiveCommitAt: new Date('2026-09-09T05:55:00.000Z'),
  verificationJson: { method: 'CLERK_SIGNED_FVA_AND_REVERIFICATION_ID' },
  terminalResult: 'NEEDS_ATTENTION',
  errorCode: 'PARTIAL_FAILURE',
  startedAt: new Date('2026-09-09T05:50:00.000Z'),
  completedAt: null,
  createdAt: new Date('2026-09-09T05:45:00.000Z'),
  updatedAt: now,
};

function createDatabase(existingReverificationHash) {
  let createdReverification = null;
  let destructiveResumeUpdated = false;
  const transaction = {
    $executeRaw: async () => {
      destructiveResumeUpdated = true;
      return 1;
    },
    dataLifecycleOperation: {
      findFirst: async () => ({ ...baseOperation }),
    },
    dataLifecycleResourceFence: {
      findFirst: async () => ({ id: 9 }),
    },
    adminReverificationUse: {
      findUnique: async ({ where }) =>
        where.reverificationIdHash === existingReverificationHash ? { id: 1 } : null,
      create: async ({ data }) => {
        createdReverification = data;
        return data;
      },
    },
  };
  const database = {
    $transaction: async (work) => work(transaction),
    dataLifecycleOperation: {
      findFirst: async () => ({ ...baseOperation, status: 'EXECUTING', terminalResult: null, errorCode: null }),
    },
  };
  return {
    database,
    get createdReverification() {
      return createdReverification;
    },
    get destructiveResumeUpdated() {
      return destructiveResumeUpdated;
    },
  };
}

const oldReverificationHash = digest('f');
const oldAttempt = createDatabase(oldReverificationHash);
const oldRepository = createAccountGameDataLifecycleOperationRepository(oldAttempt.database);
await assert.rejects(
  () =>
    oldRepository.resumeNeedsAttention(7, 41, digest('e'), {
      reverificationIdHash: oldReverificationHash,
    }),
  /already used/,
);
assert.equal(oldAttempt.createdReverification, null, 'old evidence must not be inserted again');

const newReverificationHash = digest('9');
const freshAttempt = createDatabase(null);
const freshRepository = createAccountGameDataLifecycleOperationRepository(freshAttempt.database);
const resumed = await freshRepository.resumeNeedsAttention(7, 41, digest('e'), {
  reverificationIdHash: newReverificationHash,
});
assert.equal(resumed.status, 'EXECUTING');
assert.equal(freshAttempt.createdReverification.reverificationIdHash, newReverificationHash);
assert.equal(freshAttempt.createdReverification.operationId, 41);
assert.equal(freshAttempt.createdReverification.idempotencyKeyHash, digest('e'));

console.log('Administrator lifecycle resume reverification tests passed.');
