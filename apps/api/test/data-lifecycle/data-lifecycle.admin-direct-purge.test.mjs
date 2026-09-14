import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAccountGameDataLifecycleService } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.service.js';
import { LifecycleHmacKeyring, hashOpaqueLifecycleToken } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const previewToken = 'preview-token-with-safe-length';
const idempotencyKey = 'stable-admin-purge-key';
const now = new Date('2026-09-14T10:00:00.000Z');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const previewHash = digest('preview');
const operationId = 274;
const targetUserId = 1968;

let operation = {
  id: operationId,
  action: 'PURGE_ACCOUNT_DATA',
  status: 'PREVIEWED',
  actorUserId: 1,
  targetUserId,
  actorKeyVersion: 1,
  actorKeyHash: digest('actor'),
  targetKeyVersion: 1,
  targetKeyHash: digest('target'),
  scope: { resourceType: 'ACCOUNT', userId: targetUserId, accountId: 1152 },
  previewCounts: {
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
  previewHash,
  previewTokenHash: hashOpaqueLifecycleToken(previewToken),
  previewExpiresAt: new Date('2026-09-14T11:00:00.000Z'),
  confirmationPhrase: 'PURGE ACCOUNT 1152',
  warningCodes: ['DESTRUCTIVE_OPERATION'],
  idempotencyKeyHash: null,
  stopRequest: 'NONE',
  stopRequestedAt: null,
  checkpoint: null,
  workKey: null,
  claimedAt: null,
  heartbeatAt: null,
  firstDestructiveCommitAt: null,
  verification: null,
  terminalResult: null,
  errorCode: null,
  receiptTokenHash: null,
  receiptExpiresAt: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date('2026-09-14T09:50:00.000Z'),
  updatedAt: new Date('2026-09-14T09:50:00.000Z'),
};

const prepareCalls = [];
const completeCalls = [];
const audits = [];
const service = createAccountGameDataLifecycleService({
  auditKeyring: new LifecycleHmacKeyring([{ version: 1, secret: 'admin-direct-purge-test' }]),
  lifecycleRepository: {
    async getForTargetUser() {
      return operation;
    },
    async appendAudit(input) {
      audits.push(input);
    },
  },
  coordinatorRepository: {
    async listCancellationTargets() {
      return { importRunIds: [], preparationRunIds: [], jobTaskIds: [], hasMore: false };
    },
    async loadDrainSnapshot() {
      return {
        activeImportRuns: 0,
        activeImportWorkKeys: 0,
        activePreparationRuns: 0,
        activeJobRuns: 0,
        activeJobTaskWorkKeys: 0,
        legacyImportBlockers: 0,
        drained: true,
      };
    },
  },
  executionRepository: {
    async prepareSynchronousAccountPurge(input) {
      prepareCalls.push(input);
      operation = {
        ...operation,
        status: 'QUEUED',
        idempotencyKeyHash: input.idempotencyKeyHash,
        verification: input.verification,
        startedAt: now,
        updatedAt: now,
      };
      return false;
    },
    async completeSynchronousAccountPurge(input) {
      completeCalls.push(input);
      operation = {
        ...operation,
        status: 'COMPLETED',
        firstDestructiveCommitAt: now,
        checkpoint: { version: 1, phase: 'DONE', afterGameId: null },
        terminalResult: 'COMPLETED',
        completedAt: now,
        updatedAt: now,
      };
    },
    async markSynchronousAccountPurgeNeedsAttention() {},
    async cancelScopedJobTasks() {
      return 0;
    },
  },
});

const result = await service.executeForAdmin(
  targetUserId,
  operationId,
  {
    previewToken,
    confirmationPhrase: operation.confirmationPhrase,
    idempotencyKey,
  },
  { method: 'TYPED_CONFIRMATION_PHRASE' },
);

assert.equal(result.status, 'COMPLETED');
assert.equal(result.terminalResult, 'COMPLETED');
assert.equal(prepareCalls.length, 1);
assert.deepEqual(prepareCalls[0], {
  operationId,
  targetUserId,
  previewTokenHash: hashOpaqueLifecycleToken(previewToken),
  previewHash,
  idempotencyKeyHash: hashOpaqueLifecycleToken(idempotencyKey),
  verification: { method: 'TYPED_CONFIRMATION_PHRASE' },
});
assert.deepEqual(completeCalls, [{
  operationId,
  targetUserId,
  idempotencyKeyHash: hashOpaqueLifecycleToken(idempotencyKey),
}]);
assert.deepEqual(audits.map(({ eventType, status, terminalResult }) => ({ eventType, status, terminalResult })), [
  { eventType: 'COMPLETED', status: 'COMPLETED', terminalResult: 'COMPLETED' },
]);

console.log('Administrator direct account purge service test passed.');
