import assert from 'node:assert/strict';
import { createAccountGameDataLifecycleWorker } from '../../dist/modules/data-lifecycle/data-lifecycle.account-game.worker.service.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const operation = {
  id: 1,
  action: 'PURGE_ACCOUNT_DATA',
  status: 'FENCING',
  actorUserId: 7,
  targetUserId: 7,
  scope: { resourceType: 'ACCOUNT', userId: 7, accountId: 11 },
  previewCounts: {
    accounts: 1,
    importedGames: 0,
    importedGamePlies: 0,
    gameAnalysisRuns: 0,
    aiReviews: 0,
    tacticalDetections: 0,
    scenarioTrainingSessions: 0,
    importRuns: 0,
    preparationRuns: 0,
    jobRuns: 0,
  },
  previewHash: 'a'.repeat(64),
  previewTokenHash: 'b'.repeat(64),
  previewExpiresAt: new Date(Date.now() + 60_000),
  confirmationPhrase: 'CONFIRM',
  warningCodes: [],
  idempotencyKeyHash: 'c'.repeat(64),
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
  startedAt: new Date(),
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const transitions = [];
const auditEvents = [];
let released = false;
let claimed = false;

const operationRepository = {
  async recoverStaleClaims() { return 0; },
  async claimNext(workKey) {
    if (claimed) return null;
    claimed = true;
    return { ...operation, workKey };
  },
  async releaseClaim() { released = true; },
  async hasAuditEvent() { return false; },
};

const lifecycleRepository = {
  async heartbeat() { return true; },
  async advanceClaimed(_operationId, _workKey, status) {
    transitions.push(status);
    return { ...operation, status };
  },
  async appendAudit(event) { auditEvents.push(event.eventType); },
};

const coordinatorRepository = {
  async listCancellationTargets() {
    return {
      importRunIds: [],
      preparationRunIds: [],
      jobTaskIds: [],
      hasMore: false,
    };
  },
};

const executionRepository = {
  async cancelScopedJobTasks() { return 0; },
};

const worker = createAccountGameDataLifecycleWorker({
  operationRepository,
  lifecycleRepository,
  coordinatorRepository,
  executionRepository,
  importRepository: { async requestCancel() {} },
  preparationRepository: { async requestCancel() {} },
  auditKeyring: new LifecycleHmacKeyring([{ version: 1, secret: 'fencing-forward-test' }]),
  logger: { info() {}, warn() {}, error() {} },
  config: {
    pollIntervalMs: 1,
    heartbeatIntervalMs: 60_000,
    staleAfterMs: 60_000,
    staleRecoveryIntervalMs: 60_000,
    shutdownTimeoutMs: 1_000,
    gameBatchLimit: 25,
  },
});

assert.equal(await worker.runOnce(), true);
assert.deepEqual(transitions, ['WAITING_FOR_DRAIN']);
assert.deepEqual(auditEvents, ['FENCE_INSTALLED', 'CANCELLATION_REQUESTED']);
assert.equal(released, true);

console.log('Account/game lifecycle fencing forward-transition test passed.');
