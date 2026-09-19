import assert from 'node:assert/strict';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconciler } from '../../dist/modules/preparation/preparation-reconciler.service.js';

const observedAt = new Date('2026-08-17T00:00:00.000Z');
const snapshot = {
  run: {
    id: 7,
    userId: 11,
    status: 'NEEDS_ATTENTION',
    retryGeneration: 0,
    attentionCode: 'IMPORT_PAUSED',
    attentionDetail: 'Linked import is paused.',
    reconcileAfter: new Date('2026-08-17T00:00:00.000Z'),
    firstImportedAt: null,
    firstIndexedAt: null,
    firstAnalysedAt: null,
    coreReadyAt: null,
    analysisCompletedAt: null,
    completedAt: null,
  },
  targets: [
    target(1, { ordinal: 0, importStatus: 'RUNNING' }),
    target(2, { ordinal: 1, importStatus: 'FAILED' }),
  ],
  activeBatches: [],
  telemetry: {
    batchCount: 0,
    maxQueueWaitMs: null,
    maxFirstSettlementMs: null,
    maxTotalSettlementMs: null,
  },
};
const applied = [];
const repository = {
  async claimNextDueRun() {
    return {
      id: snapshot.run.id,
      userId: snapshot.run.userId,
      status: snapshot.run.status,
      dueAt: observedAt,
    };
  },
  async loadSnapshot() {
    return snapshot;
  },
  async applyState(input) {
    applied.push(input);
    snapshot.run.status = input.status;
    snapshot.run.attentionCode = input.attentionCode;
    snapshot.run.attentionDetail = input.attentionDetail;
    snapshot.run.reconcileAfter = input.reconcileAfter;
    return true;
  },
  async requestPause() {
    return false;
  },
  async resume() {
    return false;
  },
  async requestCancel() {
    return false;
  },
};
const reconciler = createPreparationReconciler({
  repository,
  batchRepository: {
    async admitNextBatch() {
      throw new Error('Recoverable attention must not admit preparation child work.');
    },
  },
  config: { ...DEFAULT_PREPARATION_CONFIG },
  now: () => observedAt,
  logger: { info() {}, warn() {}, error() {} },
});

const result = await reconciler.reconcileOnce();
assert.equal(result.claimed, true);
assert.equal(result.status, 'NEEDS_ATTENTION');
assert.equal(applied.length, 1);
assert.equal(
  applied[0].attentionCode,
  'IMPORT_RETRY_AVAILABLE',
  'a durable wake recomputes recoverable attention from the remaining current import blocker',
);
assert.equal(applied[0].attentionDetail, 'Linked import is failed.');
assert.equal(
  applied[0].reconcileAfter,
  null,
  'unresolved recoverable attention becomes dormant again after the current action signal is persisted',
);

console.log('Preparation recoverable import-attention state tests passed.');

function target(id, overrides = {}) {
  return {
    id,
    accountId: id,
    ordinal: id - 1,
    currentImportRunId: id,
    importStatus: 'COMPLETED',
    importWorkKey: null,
    importedCount: 0,
    indexedCount: 0,
    indexPendingCount: 0,
    indexFailedCount: 0,
    analysedCount: 0,
    analysisPendingCount: 0,
    analysisRunningCount: 0,
    analysisFailedCount: 0,
    normalIndexBatches: 0,
    normalAnalysisBatches: 0,
    ...overrides,
  };
}
