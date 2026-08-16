import assert from 'node:assert/strict';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationReconciler } from '../../dist/modules/preparation/preparation-reconciler.service.js';

await proveParentResumePrecedesImportResume();
await proveRejectedParentResumeDoesNotTouchImport();

async function proveParentResumePrecedesImportResume() {
  const snapshot = pausedSnapshot();
  const calls = [];
  const repository = createRepository(snapshot);
  repository.resume = async (userId, runId) => {
    calls.push(['parent', userId, runId]);
    snapshot.run.status = 'RUNNING';
    return true;
  };
  const importRepository = createImportRepository();
  importRepository.resume = async (userId, importRunId) => {
    calls.push(['import', userId, importRunId]);
    snapshot.targets[0].importStatus = 'QUEUED';
    return true;
  };

  const reconciler = createPreparationReconciler({
    repository,
    batchRepository: unusedBatchRepository,
    importRepository,
    jobControl: { cancelForUser: async () => null },
    config: DEFAULT_PREPARATION_CONFIG,
    logger: silentLogger,
  });

  assert.equal(await reconciler.resume(7, 41), true);
  assert.deepEqual(calls, [
    ['parent', 7, 41],
    ['import', 7, 81],
  ]);
}

async function proveRejectedParentResumeDoesNotTouchImport() {
  const snapshot = pausedSnapshot();
  snapshot.run.status = 'CANCEL_REQUESTED';
  let importResumeCalls = 0;
  const repository = createRepository(snapshot);
  repository.resume = async () => false;
  const importRepository = createImportRepository();
  importRepository.resume = async () => {
    importResumeCalls += 1;
    return true;
  };

  const reconciler = createPreparationReconciler({
    repository,
    batchRepository: unusedBatchRepository,
    importRepository,
    jobControl: { cancelForUser: async () => null },
    config: DEFAULT_PREPARATION_CONFIG,
    logger: silentLogger,
  });

  assert.equal(await reconciler.resume(7, 41), false);
  assert.equal(
    importResumeCalls,
    0,
    'a rejected or racing parent resume must not restart linked import work',
  );
}

function pausedSnapshot() {
  return {
    run: {
      id: 41,
      userId: 7,
      status: 'PAUSED',
      retryGeneration: 0,
      attentionCode: null,
      attentionDetail: null,
      firstImportedAt: null,
      firstIndexedAt: null,
      firstAnalysedAt: null,
      coreReadyAt: null,
      analysisCompletedAt: null,
    },
    targets: [{
      id: 51,
      accountId: 61,
      ordinal: 0,
      currentImportRunId: 81,
      importStatus: 'PAUSED',
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
    }],
    activeBatches: [],
    telemetry: {
      batchCount: 0,
      maxQueueWaitMs: null,
      maxFirstSettlementMs: null,
      maxTotalSettlementMs: null,
    },
  };
}

function createRepository(snapshot) {
  return {
    claimNextDueRun: async () => null,
    loadSnapshot: async () => snapshot,
    applyState: async () => false,
    requestPause: async () => false,
    resume: async () => false,
    requestCancel: async () => false,
    beginRetry: async () => null,
  };
}

function createImportRepository() {
  return {
    requestPause: async () => false,
    resume: async () => false,
    requestCancel: async () => false,
  };
}

const unusedBatchRepository = {
  createRun: async () => { throw new Error('not used'); },
  admitNextBatch: async () => { throw new Error('not used'); },
  refreshBatchSnapshotForJob: async () => false,
};

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};
