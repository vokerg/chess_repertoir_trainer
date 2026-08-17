import assert from 'node:assert/strict';
import {
  DEFAULT_PREPARATION_CONFIG,
} from '../../dist/modules/preparation/preparation.config.js';
import {
  createPreparationReconciler,
  pickAnalysisTarget,
  pickIndexTarget,
  selectOperationalAttention,
} from '../../dist/modules/preparation/preparation-reconciler.service.js';

await proveStageSpecificFairness();
await proveFirstAnalysisThresholdAndFallback();
await proveStallWarningsRespectHigherPriorityPreemption();
await proveProgressiveAdmissionAndCoreReadiness();
await proveAdmissionBlockDoesNotFreezeImportedIndexBacklog();
await proveAnalysisFailureIsTerminalAfterCore();
await provePauseAndCancelAcknowledgement();
await proveRetryOnlyAdmitsFailedEvidence();
await proveActiveAndIdleCadence();

function proveStageSpecificFairness() {
  const first = target(1, {
    ordinal: 0,
    indexPendingCount: 4,
    analysisPendingCount: 4,
    normalIndexBatches: 2,
    normalAnalysisBatches: 0,
  });
  const second = target(2, {
    ordinal: 1,
    indexPendingCount: 4,
    analysisPendingCount: 4,
    normalIndexBatches: 0,
    normalAnalysisBatches: 3,
  });

  assert.equal(pickIndexTarget([first, second])?.id, second.id);
  assert.equal(pickAnalysisTarget([first, second], DEFAULT_PREPARATION_CONFIG)?.id, first.id);
}

function proveFirstAnalysisThresholdAndFallback() {
  const runningImport = target(1, {
    importStatus: 'RUNNING',
    analysisPendingCount: 2,
    indexedCount: 2,
  });
  assert.equal(
    pickAnalysisTarget([runningImport], DEFAULT_PREPARATION_CONFIG),
    null,
    'two games do not start first analysis while import can still produce normal candidates',
  );

  runningImport.analysisPendingCount = 3;
  runningImport.indexedCount = 3;
  assert.equal(pickAnalysisTarget([runningImport], DEFAULT_PREPARATION_CONFIG)?.id, 1);

  const completedSmallAccount = target(2, {
    importStatus: 'COMPLETED',
    analysisPendingCount: 1,
    indexedCount: 1,
    indexPendingCount: 0,
  });
  assert.equal(
    pickAnalysisTarget([completedSmallAccount], DEFAULT_PREPARATION_CONFIG)?.id,
    2,
    'a quiescent one-game account uses the configured first-analysis fallback',
  );

  const failedSmallAccount = target(3, {
    importStatus: 'FAILED',
    analysisPendingCount: 1,
    indexedCount: 1,
    indexPendingCount: 0,
  });
  assert.equal(
    pickAnalysisTarget([failedSmallAccount], DEFAULT_PREPARATION_CONFIG),
    null,
    'a failed import does not use the successful small-account fallback path',
  );
}

function proveStallWarningsRespectHigherPriorityPreemption() {
  const observedAt = new Date('2026-08-15T20:00:00.000Z');
  const queuedBatch = activeBatch({
    stage: 'ANALYSIS',
    startedAt: null,
    higherPriorityRunnable: true,
    workerCapacityAvailable: true,
  });
  assert.equal(
    selectOperationalAttention([queuedBatch], 0, observedAt, DEFAULT_PREPARATION_CONFIG),
    null,
    'explained higher-priority preemption is excluded from queued-start warnings',
  );
  queuedBatch.higherPriorityRunnable = false;
  queuedBatch.workerCapacityAvailable = false;
  assert.equal(
    selectOperationalAttention([queuedBatch], 0, observedAt, DEFAULT_PREPARATION_CONFIG),
    null,
    'queued-start warnings require worker capacity to be available',
  );
  queuedBatch.workerCapacityAvailable = true;
  assert.equal(
    selectOperationalAttention([queuedBatch], 0, observedAt, DEFAULT_PREPARATION_CONFIG)?.code,
    'PREPARATION_TASK_START_DELAY',
  );

  const runningBatch = activeBatch({
    stage: 'ANALYSIS',
    startedAt: new Date('2026-08-15T19:54:00.000Z'),
    higherPriorityRunnable: true,
    workerCapacityAvailable: false,
  });
  assert.equal(
    selectOperationalAttention([runningBatch], 0, observedAt, DEFAULT_PREPARATION_CONFIG)?.code,
    'ANALYSIS_NO_SETTLEMENT_WARNING',
    'once a preparation task is running, queued higher-priority work does not explain its lack of settlement',
  );
  assert.equal(
    selectOperationalAttention([], 61_000, observedAt, DEFAULT_PREPARATION_CONFIG)?.code,
    'RECONCILE_DUE_CRITICAL',
  );
}

async function proveProgressiveAdmissionAndCoreReadiness() {
  const snapshot = runSnapshot({
    targets: [target(1, {
      importStatus: 'RUNNING',
      importedCount: 5,
      indexPendingCount: 5,
    })],
  });
  const harness = createHarness(snapshot);
  harness.queueClaim();
  await harness.reconciler.reconcileOnce();
  assert.deepEqual(
    harness.admissions.map(({ stage, lane }) => [stage, lane]),
    [['INDEX', 'FIRST_INDEX']],
    'committed imported rows can be admitted before the linked import is terminal',
  );

  harness.admissions.length = 0;
  snapshot.targets[0] = target(1, {
    importStatus: 'COMPLETED',
    importedCount: 5,
    indexedCount: 3,
    indexPendingCount: 2,
    analysisPendingCount: 3,
    normalIndexBatches: 1,
  });
  harness.queueClaim();
  await harness.reconciler.reconcileOnce();
  assert.deepEqual(
    harness.admissions.map(({ stage, lane }) => [stage, lane]),
    [['INDEX', 'INDEX_CONTINUATION'], ['ANALYSIS', 'FIRST_ANALYSIS']],
    'three indexed games unlock first analysis while index continuation remains independently admissible',
  );

  harness.admissions.length = 0;
  harness.blockAdmissions = true;
  snapshot.targets[0] = target(1, {
    importStatus: 'COMPLETED',
    importedCount: 5,
    indexedCount: 5,
    analysisPendingCount: 5,
    normalIndexBatches: 2,
  });
  harness.queueClaim();
  await harness.reconciler.reconcileOnce();
  assert.equal(harness.applied.at(-1).markCoreReady, true);
  assert.equal(harness.applied.at(-1).status, 'RUNNING');
}

async function proveAdmissionBlockDoesNotFreezeImportedIndexBacklog() {
  const snapshot = runSnapshot({
    targets: [target(1, {
      importStatus: 'FAILED',
      importedCount: 2,
      indexPendingCount: 2,
    })],
  });
  const harness = createHarness(snapshot);
  harness.blockAdmissions = true;
  harness.queueClaim();
  await harness.reconciler.reconcileOnce();
  const applied = harness.applied.at(-1);
  assert.equal(applied.status, 'RUNNING');
  assert.equal(applied.attentionCode, null);
}

async function proveAnalysisFailureIsTerminalAfterCore() {
  const snapshot = runSnapshot({
    targets: [target(1, {
      importStatus: 'COMPLETED',
      importedCount: 2,
      indexedCount: 2,
      analysedCount: 1,
      analysisFailedCount: 1,
      analysisPendingCount: 0,
      analysisRunningCount: 0,
      normalAnalysisBatches: 1,
    })],
  });
  const harness = createHarness(snapshot);
  harness.queueClaim();
  await harness.reconciler.reconcileOnce();
  const applied = harness.applied.at(-1);
  assert.equal(applied.status, 'COMPLETED');
  assert.equal(applied.markCoreReady, true);
  assert.equal(applied.markAnalysisCompleted, true);
  assert.equal(applied.attentionCode, 'ANALYSIS_PARTIAL');
}

async function provePauseAndCancelAcknowledgement() {
  const pauseSnapshot = runSnapshot({
    status: 'PAUSE_REQUESTED',
    targets: [target(1, { importStatus: 'RUNNING', importWorkKey: 'IMPORT:1' })],
    activeBatches: [activeBatch()],
  });
  const pause = createHarness(pauseSnapshot);
  pause.importControl.requestPause = async () => {
    pauseSnapshot.targets[0].importStatus = 'PAUSED';
    pauseSnapshot.targets[0].importWorkKey = null;
    return true;
  };
  pause.queueClaim('PAUSE_REQUESTED');
  await pause.reconciler.reconcileOnce();
  assert.equal(pause.applied.at(-1).status, 'PAUSE_REQUESTED');
  pauseSnapshot.activeBatches = [];
  pause.queueClaim('PAUSE_REQUESTED');
  await pause.reconciler.reconcileOnce();
  assert.equal(pause.applied.at(-1).status, 'PAUSED');

  const cancelSnapshot = runSnapshot({
    status: 'CANCEL_REQUESTED',
    targets: [target(1, { importStatus: 'RUNNING', importWorkKey: 'IMPORT:2' })],
    activeBatches: [activeBatch({ activeWorkKeys: 1 })],
  });
  const cancel = createHarness(cancelSnapshot);
  cancel.importControl.requestCancel = async () => {
    cancelSnapshot.targets[0].importStatus = 'CANCELLED';
    cancelSnapshot.targets[0].importWorkKey = null;
    return true;
  };
  cancel.jobControl.cancelForUser = async () => true;
  cancel.queueClaim('CANCEL_REQUESTED');
  await cancel.reconciler.reconcileOnce();
  assert.equal(
    cancel.applied.at(-1).status,
    'CANCEL_REQUESTED',
    'terminal child status is insufficient while the executor work key is retained',
  );
  cancelSnapshot.activeBatches = [];
  cancel.queueClaim('CANCEL_REQUESTED');
  await cancel.reconciler.reconcileOnce();
  assert.equal(cancel.applied.at(-1).status, 'CANCELLED');
}

async function proveRetryOnlyAdmitsFailedEvidence() {
  const snapshot = runSnapshot({
    status: 'NEEDS_ATTENTION',
    targets: [target(1, {
      importStatus: 'COMPLETED',
      importedCount: 4,
      indexedCount: 2,
      indexFailedCount: 1,
      analysisFailedCount: 1,
      normalIndexBatches: 2,
      normalAnalysisBatches: 1,
    })],
  });
  const harness = createHarness(snapshot);
  const generation = await harness.reconciler.retry(snapshot.run.userId, snapshot.run.id);
  assert.equal(generation, 1);
  assert.deepEqual(
    harness.admissions.map(({ stage, lane, retryFailed, startRetryGeneration }) => [
      stage,
      lane,
      retryFailed,
      startRetryGeneration,
    ]),
    [['INDEX', 'RETRY', true, true]],
    'one explicit retry generation creates one bounded failed-evidence wave, preferring indexing first',
  );
  assert.equal(snapshot.run.status, 'RUNNING');
  assert.equal(snapshot.run.retryGeneration, 1);

  const analysisOnlyFailure = runSnapshot({
    status: 'RUNNING',
    targets: [target(2, {
      importStatus: 'COMPLETED',
      indexedCount: 2,
      analysisFailedCount: 1,
    })],
  });
  const analysisOnly = createHarness(analysisOnlyFailure);
  assert.equal(
    await analysisOnly.reconciler.retry(analysisOnlyFailure.run.userId, analysisOnlyFailure.run.id),
    1,
  );
  assert.equal(analysisOnly.admissions[0].stage, 'ANALYSIS');
  assert.equal(analysisOnly.admissions[0].lane, 'RETRY');

  const blockedSnapshot = runSnapshot({
    status: 'NEEDS_ATTENTION',
    targets: [target(3, { indexFailedCount: 1 })],
  });
  const blockedRetry = createHarness(blockedSnapshot);
  blockedRetry.blockAdmissions = true;
  assert.equal(
    await blockedRetry.reconciler.retry(blockedSnapshot.run.userId, blockedSnapshot.run.id),
    null,
    'capacity blocking does not persist a retry generation without durable child work',
  );
  assert.equal(blockedSnapshot.run.retryGeneration, 0);
  assert.equal(blockedSnapshot.run.status, 'NEEDS_ATTENTION');

  const completedFailure = runSnapshot({
    status: 'COMPLETED',
    targets: [target(4, { analysisFailedCount: 1 })],
  });
  const completed = createHarness(completedFailure);
  assert.equal(
    await completed.reconciler.retry(completedFailure.run.userId, completedFailure.run.id),
    null,
    'terminal preparation is not reopened; ONB-009 owns linked recovery/expansion commands',
  );
  assert.equal(completed.admissions.length, 0);

  const importOnlyFailure = runSnapshot({
    status: 'NEEDS_ATTENTION',
    targets: [target(5, { importStatus: 'FAILED' })],
  });
  const importOnly = createHarness(importOnlyFailure);
  assert.equal(
    await importOnly.reconciler.retry(importOnlyFailure.run.userId, importOnlyFailure.run.id),
    null,
    'preparation retry does not masquerade as provider-import retry when no failed child evidence exists',
  );
  assert.equal(importOnly.admissions.length, 0);
}

async function proveActiveAndIdleCadence() {
  const snapshot = runSnapshot({
    targets: [target(1, { importStatus: 'COMPLETED' })],
  });
  const harness = createHarness(snapshot);
  harness.queueClaim();
  const delays = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let reconciler;
  globalThis.setTimeout = (callback, delay) => {
    delays.push(delay);
    const handle = { unref() {} };
    if (delay === DEFAULT_PREPARATION_CONFIG.reconcileActiveMs) {
      queueMicrotask(callback);
    } else {
      queueMicrotask(() => reconciler.requestStop());
    }
    return handle;
  };
  globalThis.clearTimeout = () => {};
  try {
    reconciler = harness.reconciler;
    await reconciler.run();
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
  assert.deepEqual(
    delays.slice(0, 2),
    [DEFAULT_PREPARATION_CONFIG.reconcileActiveMs, DEFAULT_PREPARATION_CONFIG.reconcileIdleMs],
  );
}

function createHarness(snapshot) {
  const claims = [];
  const admissions = [];
  const applied = [];
  const repository = {
    claimNextDueRun: async () => claims.shift() ?? null,
    loadSnapshot: async () => snapshot,
    applyState: async (input) => {
      applied.push(input);
      if (snapshot.run.status !== input.expectedStatus) return false;
      snapshot.run.status = input.status;
      return true;
    },
    requestPause: async () => true,
    resume: async () => true,
    requestCancel: async () => true,
    beginRetry: async () => null,
  };
  const harness = {
    repository,
    admissions,
    applied,
    blockAdmissions: false,
    importControl: {
      requestPause: async () => true,
      resume: async () => true,
      requestCancel: async () => true,
    },
    jobControl: {
      cancelForUser: async () => true,
    },
    queueClaim(status = snapshot.run.status) {
      claims.push({
        id: snapshot.run.id,
        userId: snapshot.run.userId,
        status,
        dueAt: new Date('2026-08-15T19:59:59.000Z'),
      });
    },
  };
  harness.reconciler = createPreparationReconciler({
    repository,
    batchRepository: {
      admitNextBatch: async (input) => {
        admissions.push(input);
        if (harness.blockAdmissions) return { outcome: 'BLOCKED', reason: 'GLOBAL_TASK_CAPACITY' };
        let retryGeneration;
        if (input.startRetryGeneration) {
          snapshot.run.status = 'RUNNING';
          snapshot.run.retryGeneration += 1;
          retryGeneration = snapshot.run.retryGeneration;
        }
        return {
          outcome: 'CREATED',
          batchId: admissions.length,
          jobRunId: 100 + admissions.length,
          importedGameIds: [1000 + admissions.length],
          plannedLimit: 1,
          ...(retryGeneration === undefined ? {} : { retryGeneration }),
        };
      },
      createRun: async () => { throw new Error('not used'); },
      refreshBatchSnapshotForJob: async () => false,
    },
    importRepository: harness.importControl,
    jobControl: harness.jobControl,
    config: DEFAULT_PREPARATION_CONFIG,
    now: () => new Date('2026-08-15T20:00:00.000Z'),
    logger: { info() {}, warn() {}, error() {} },
  });
  return harness;
}

function runSnapshot(overrides = {}) {
  return {
    run: {
      id: 1,
      userId: 1,
      status: overrides.status ?? 'RUNNING',
      retryGeneration: 0,
      attentionCode: null,
      attentionDetail: null,
      firstImportedAt: null,
      firstIndexedAt: null,
      firstAnalysedAt: null,
      coreReadyAt: null,
      analysisCompletedAt: null,
    },
    targets: overrides.targets ?? [],
    activeBatches: overrides.activeBatches ?? [],
    telemetry: {
      batchCount: 0,
      maxQueueWaitMs: null,
      maxFirstSettlementMs: null,
      maxTotalSettlementMs: null,
    },
  };
}

function target(id, overrides = {}) {
  return {
    id,
    accountId: id,
    ordinal: 0,
    currentImportRunId: 10 + id,
    importStatus: 'RUNNING',
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

function activeBatch(overrides = {}) {
  return {
    id: 1,
    targetId: 1,
    stage: 'INDEX',
    status: 'RUNNING',
    jobRunId: 20,
    priority: 180,
    createdAt: new Date('2026-08-15T19:50:00.000Z'),
    startedAt: new Date('2026-08-15T19:50:01.000Z'),
    firstSettledAt: null,
    settledAt: null,
    activeWorkKeys: 0,
    higherPriorityRunnable: false,
    workerCapacityAvailable: true,
    ...overrides,
  };
}
