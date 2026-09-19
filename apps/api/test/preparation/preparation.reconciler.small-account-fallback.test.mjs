import assert from 'node:assert/strict';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import {
  createPreparationReconciler,
  pickAnalysisTarget,
} from '../../dist/modules/preparation/preparation-reconciler.service.js';

function target(overrides = {}) {
  return {
    id: 1,
    accountId: 1,
    ordinal: 0,
    currentImportRunId: 1,
    importStatus: 'COMPLETED',
    importWorkKey: null,
    importedCount: 1,
    indexedCount: 1,
    indexPendingCount: 0,
    indexFailedCount: 0,
    analysedCount: 0,
    analysisPendingCount: 1,
    analysisRunningCount: 0,
    analysisFailedCount: 0,
    normalIndexBatches: 1,
    normalAnalysisBatches: 0,
    ...overrides,
  };
}

assert.equal(
  pickAnalysisTarget([target()], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'one analysis-eligible game uses the quiescent fallback',
);

assert.equal(
  pickAnalysisTarget([
    target({ importedCount: 2, indexedCount: 2, analysisPendingCount: 2 }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'two analysis-eligible games use the quiescent fallback',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 10,
      indexedCount: 2,
      indexFailedCount: 8,
      analysisPendingCount: 2,
    }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'partial indexing failure cannot strand one or two analysis-eligible games after index quiescence',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 10,
      indexedCount: 3,
      indexFailedCount: 7,
      analysisPendingCount: 3,
    }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'three analysis-eligible games enter the normal first-analysis lane at the configured threshold',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 10,
      indexedCount: 2,
      indexFailedCount: 8,
      analysisPendingCount: 1,
      normalAnalysisBatches: 1,
    }),
  ], DEFAULT_PREPARATION_CONFIG)?.id,
  1,
  'after first analysis, the analysis tail may continue from remaining indexed evidence',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importStatus: 'RUNNING',
      importedCount: 2,
      indexedCount: 2,
      analysisPendingCount: 2,
    }),
  ], DEFAULT_PREPARATION_CONFIG),
  null,
  'below-threshold fallback waits for terminal import coverage',
);

assert.equal(
  pickAnalysisTarget([
    target({
      importedCount: 2,
      indexedCount: 1,
      indexPendingCount: 1,
      analysisPendingCount: 1,
    }),
  ], DEFAULT_PREPARATION_CONFIG),
  null,
  'below-threshold fallback waits until normal index candidates are exhausted',
);

assert.equal(
  pickAnalysisTarget(
    [target({ importedCount: 2, indexedCount: 2, analysisPendingCount: 2 })],
    DEFAULT_PREPARATION_CONFIG,
    new Set([1]),
  ),
  null,
  'below-threshold fallback waits for the target active index batch to settle',
);

const fallbackAdmissions = await captureAnalysisAdmissions(
  target({ importedCount: 2, indexedCount: 2, analysisPendingCount: 2 }),
);
assert.equal(fallbackAdmissions.length, 1);
assert.equal(fallbackAdmissions[0].lane, 'FIRST_ANALYSIS');
assert.equal(
  fallbackAdmissions[0].maxTasks,
  1,
  'the two-game fallback is a one-game wave rather than a normal three-game FIRST_ANALYSIS batch',
);

const partialFailureAdmissions = await captureAnalysisAdmissions(
  target({
    importedCount: 10,
    indexedCount: 2,
    indexFailedCount: 8,
    analysisPendingCount: 2,
  }),
);
assert.equal(partialFailureAdmissions.length, 1);
assert.equal(partialFailureAdmissions[0].lane, 'FIRST_ANALYSIS');
assert.equal(
  partialFailureAdmissions[0].maxTasks,
  1,
  'index failures do not suppress the one-game fallback once only two analysis-eligible games remain',
);

const thresholdAdmissions = await captureAnalysisAdmissions(
  target({ importedCount: 10, indexedCount: 3, analysisPendingCount: 3 }),
);
assert.equal(thresholdAdmissions.length, 1);
assert.equal(thresholdAdmissions[0].lane, 'FIRST_ANALYSIS');
assert.equal(
  thresholdAdmissions[0].maxTasks,
  undefined,
  'normal first analysis keeps the configured three-game lane size',
);

const activeIndexAdmissions = await captureAnalysisAdmissions(
  target({ importedCount: 2, indexedCount: 2, analysisPendingCount: 2 }),
  [activeIndexBatch(1)],
);
assert.equal(
  activeIndexAdmissions.length,
  0,
  'the reconciler does not use the fallback while that target still has an active index batch',
);

console.log('Preparation small-account first-analysis fallback tests passed.');

async function captureAnalysisAdmissions(targetSnapshot, activeBatches = []) {
  const observedAt = new Date('2026-08-17T00:00:00.000Z');
  const snapshot = {
    run: {
      id: 7,
      userId: 11,
      status: 'RUNNING',
      attentionCode: null,
      attentionDetail: null,
      reconcileAfter: new Date('2026-08-17T00:00:15.000Z'),
      firstImportedAt: null,
      firstIndexedAt: null,
      firstAnalysedAt: null,
      coreReadyAt: null,
      analysisCompletedAt: null,
      completedAt: null,
    },
    targets: [targetSnapshot],
    activeBatches,
    telemetry: {
      batchCount: activeBatches.length,
      maxQueueWaitMs: null,
      maxFirstSettlementMs: null,
      maxTotalSettlementMs: null,
    },
  };
  const admissions = [];
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
    async applyState() {
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
  const batchRepository = {
    async admitNextBatch(input) {
      admissions.push(input);
      return {
        outcome: 'CREATED',
        batchId: 101,
        jobRunId: 201,
        importedGameIds: [301],
        plannedLimit: input.maxTasks ?? DEFAULT_PREPARATION_CONFIG.firstAnalysisBatchSize,
      };
    },
  };
  const reconciler = createPreparationReconciler({
    repository,
    batchRepository,
    config: { ...DEFAULT_PREPARATION_CONFIG },
    now: () => observedAt,
    logger: { info() {}, warn() {}, error() {} },
  });

  await reconciler.reconcileOnce();
  return admissions;
}

function activeIndexBatch(targetId) {
  const observedAt = new Date('2026-08-17T00:00:00.000Z');
  return {
    id: 91,
    targetId,
    stage: 'INDEX',
    status: 'RUNNING',
    jobRunId: 191,
    priority: 200,
    createdAt: observedAt,
    startedAt: observedAt,
    firstSettledAt: null,
    settledAt: null,
    activeWorkKeys: 1,
    higherPriorityRunnable: false,
    workerCapacityAvailable: false,
  };
}
