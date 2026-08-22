import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

const noTacticalEvidenceRepository = {
  async get() { return { eligibleCount: 0, processedCount: 0, detectionCount: 0 }; },
};

function createService(dependencies = {}) {
  return createOnboardingReadinessService({
    tacticalEvidenceRepository: noTacticalEvidenceRepository,
    ...dependencies,
  });
}

const baseRepository = {
  async getDisposition() { return { disposition: 'PENDING', reason: null, changedAt: null }; },
  async getLatestRun() { return null; },
  async getScopeTotals() { throw new Error('not expected'); },
  async listTargets() { throw new Error('not expected'); },
  async getBatchSummary() { throw new Error('not expected'); },
  async listLatestBatches() { throw new Error('not expected'); },
  async getProductEvidence() {
    return { importedCount: 0, indexedCount: 0, indexFailedCount: 0, openingCount: 0, analysedCount: 0, analysisRunningCount: 0, analysisFailedCount: 0, tacticalCount: 0 };
  },
  async listReveals() { return []; },
};

const notStarted = await createService({
  repository: baseRepository,
  now: () => new Date('2026-08-20T08:00:00.000Z'),
}).get(1);
assert.equal(notStarted.presentationState, 'NOT_STARTED');
assert.deepEqual(notStarted.actions.map((action) => action.code), ['START_ONBOARDING', 'SKIP_ONBOARDING']);
assert.equal(notStarted.preparation, null);
assert.equal(notStarted.readiness.every((item) => item.state === 'locked'), true);

const skippedWithoutRun = await createService({
  repository: {
    ...baseRepository,
    async getDisposition() {
      return {
        disposition: 'SKIPPED',
        reason: 'USER_SKIPPED',
        changedAt: new Date('2026-08-20T07:05:00.000Z'),
      };
    },
  },
}).get(1);
assert.equal(skippedWithoutRun.presentationState, 'SKIPPED');
assert.deepEqual(skippedWithoutRun.actions.map((action) => action.code), ['VIEW_HOME', 'START_ONBOARDING']);

const runningRepository = {
  ...baseRepository,
  async getLatestRun() {
    return {
      id: 10, userId: 1, purpose: 'ONBOARDING', status: 'RUNNING', attentionCode: null, attentionDetail: null,
      firstImportedAt: new Date('2026-08-20T07:00:00.000Z'), firstIndexedAt: null, firstAnalysedAt: null,
      coreReadyAt: null, analysisCompletedAt: null, targetCount: 1,
    };
  },
  async getScopeTotals() {
    return { targetCount: 1, completedImportTargets: 0, windowsCompleted: 2, windowsTotal: 0, unknownWindowTargets: 1, nonTerminalImportTargets: 1, rateLimitUntil: null, activeIndexBatches: 1, activeAnalysisBatches: 0, committedCount: 4, indexedCount: 2, indexPendingCount: 2, indexFailedCount: 0, analysedCount: 0, analysisPendingCount: 2, analysisRunningCount: 0, analysisFailedCount: 0 };
  },
  async listTargets() { return []; },
  async getBatchSummary() { return { batchCount: 1, queuedBatches: 0, runningBatches: 1, terminalBatches: 0, selectedTasks: 4, queuedTasks: 2, runningTasks: 0, completedTasks: 2, skippedTasks: 0, failedTasks: 0, cancelledTasks: 0, remainingTasks: 2 }; },
  async listLatestBatches() { return [{ id: 1, targetId: 1, stage: 'INDEX', lane: 'FIRST_INDEX', status: 'RUNNING', totalTasks: 4, queuedTasks: 2, runningTasks: 0, completedTasks: 2, skippedTasks: 0, failedTasks: 0, cancelledTasks: 0 }]; },
  async getProductEvidence() { return { importedCount: 4, indexedCount: 2, indexFailedCount: 0, openingCount: 1, analysedCount: 0, analysisRunningCount: 0, analysisFailedCount: 0, tacticalCount: 0 }; },
};
const running = await createService({ repository: runningRepository }).get(1);
assert.equal(running.presentationState, 'PREPARING');
assert.equal(running.preparation.providerWindows.total, null);
assert.equal(running.preparation.providerWindows.percentage, null);
assert.equal(running.preparation.fixedCoverage.index, null);
assert.equal(running.preparation.latestBatches[0].selected, 4);
assert.equal(running.preparation.latestBatches[0].queued, 2);
assert.equal(running.preparation.latestBatches[0].remaining, 2);
assert.equal(running.preparation.latestBatches[0].percentage, 50);
assert.equal(running.readiness.find((item) => item.feature === 'analysis').state, 'partial');
assert.deepEqual(running.actions.map((action) => action.code), [
  'RESUME_ONBOARDING',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
  'SKIP_ONBOARDING',
]);
assert.equal('eta' in running.preparation, false);
assert.equal('overallPercentage' in running.preparation, false);

const skipped = await createService({
  repository: {
    ...runningRepository,
    async getDisposition() {
      return {
        disposition: 'SKIPPED',
        reason: 'USER_SKIPPED',
        changedAt: new Date('2026-08-20T07:05:00.000Z'),
      };
    },
  },
}).get(1);
assert.equal(skipped.presentationState, 'SKIPPED');
assert.equal(skipped.preparation.status, 'RUNNING');
assert.deepEqual(skipped.actions.map((action) => action.code), [
  'VIEW_HOME',
  'RESUME_ONBOARDING',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
]);
assert.equal(skipped.actions.some((action) => action.code === 'START_ONBOARDING'), false);

const pauseRequested = await createService({
  repository: {
    ...runningRepository,
    async getLatestRun() {
      return { ...(await runningRepository.getLatestRun()), status: 'PAUSE_REQUESTED' };
    },
  },
}).get(1);
assert.equal(pauseRequested.presentationState, 'PAUSE_REQUESTED');
assert.equal(pauseRequested.attention.code, 'PREPARATION_PAUSE_REQUESTED');
assert.deepEqual(pauseRequested.actions.map((action) => action.code), ['VIEW_HOME', 'SKIP_ONBOARDING']);

const paused = await createService({
  repository: {
    ...runningRepository,
    async getLatestRun() {
      return { ...(await runningRepository.getLatestRun()), status: 'PAUSED' };
    },
  },
}).get(1);
assert.equal(paused.presentationState, 'PAUSED');
assert.equal(paused.attention.code, 'PREPARATION_PAUSED');
assert.deepEqual(paused.actions.map((action) => action.code), ['RESUME_ONBOARDING', 'CANCEL_PREPARATION', 'SKIP_ONBOARDING']);

const cancelRequested = await createService({
  repository: {
    ...runningRepository,
    async getLatestRun() {
      return { ...(await runningRepository.getLatestRun()), status: 'CANCEL_REQUESTED' };
    },
  },
}).get(1);
assert.equal(cancelRequested.presentationState, 'CANCEL_REQUESTED');
assert.equal(cancelRequested.attention.code, 'PREPARATION_CANCEL_REQUESTED');
assert.deepEqual(cancelRequested.actions.map((action) => action.code), ['VIEW_HOME', 'SKIP_ONBOARDING']);

const cancelled = await createService({
  repository: {
    ...runningRepository,
    async getLatestRun() {
      return { ...(await runningRepository.getLatestRun()), status: 'CANCELLED' };
    },
  },
}).get(1);
assert.equal(cancelled.presentationState, 'CANCELLED');
assert.equal(cancelled.attention.code, 'PREPARATION_CANCELLED');
assert.deepEqual(cancelled.actions.map((action) => action.code), ['RESTART_PREPARATION', 'VIEW_HOME', 'SKIP_ONBOARDING']);

const failed = await createService({
  repository: {
    ...runningRepository,
    async getLatestRun() {
      return { ...(await runningRepository.getLatestRun()), status: 'FAILED', attentionDetail: 'Terminal failure.' };
    },
  },
}).get(1);
assert.equal(failed.presentationState, 'FAILED');
assert.equal(failed.attention.code, 'PREPARATION_FAILED');
assert.deepEqual(failed.actions.map((action) => action.code), ['RESTART_PREPARATION', 'VIEW_HOME', 'SKIP_ONBOARDING']);

const rateLimited = await createService({
  repository: {
    ...runningRepository,
    async getScopeTotals() {
      return {
        ...(await runningRepository.getScopeTotals()),
        rateLimitUntil: new Date('2026-08-20T08:10:00.000Z'),
      };
    },
  },
  now: () => new Date('2026-08-20T08:00:00.000Z'),
}).get(1);
assert.equal(rateLimited.presentationState, 'PREPARING');
assert.equal(rateLimited.attention.code, 'IMPORT_RATE_LIMITED');
assert.deepEqual(rateLimited.actions.map((action) => action.code), [
  'RESUME_ONBOARDING',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
  'SKIP_ONBOARDING',
]);

const noDataRepository = {
  ...runningRepository,
  async getLatestRun() {
    return {
      ...(await runningRepository.getLatestRun()),
      status: 'NEEDS_ATTENTION',
      attentionCode: 'NO_RECENT_GAMES',
      attentionDetail: 'No eligible recent games.',
    };
  },
  async getScopeTotals() {
    return { targetCount: 1, completedImportTargets: 1, windowsCompleted: 4, windowsTotal: 4, unknownWindowTargets: 0, nonTerminalImportTargets: 0, rateLimitUntil: null, activeIndexBatches: 0, activeAnalysisBatches: 0, committedCount: 0, indexedCount: 0, indexPendingCount: 0, indexFailedCount: 0, analysedCount: 0, analysisPendingCount: 0, analysisRunningCount: 0, analysisFailedCount: 0 };
  },
  async getProductEvidence() { return { importedCount: 0, indexedCount: 0, indexFailedCount: 0, openingCount: 0, analysedCount: 0, analysisRunningCount: 0, analysisFailedCount: 0, tacticalCount: 0 }; },
};
const noData = await createService({ repository: noDataRepository }).get(1);
assert.equal(noData.presentationState, 'NEEDS_ATTENTION');
assert.equal(noData.attention.code, 'NO_RECENT_GAMES');
assert.equal(noData.preparation.fixedCoverage.index, null);
assert.equal(noData.readiness.find((item) => item.feature === 'games').state, 'checked-empty');
assert.deepEqual(noData.actions.map((action) => action.code), ['EXPAND_RANGE', 'ADD_ACCOUNT', 'FINISH_ONBOARDING', 'SKIP_ONBOARDING']);

const completedExpansionNoData = await createService({
  repository: {
    ...noDataRepository,
    async getDisposition() {
      return {
        disposition: 'COMPLETED',
        reason: 'CORE_READY',
        changedAt: new Date('2026-08-20T07:10:00.000Z'),
      };
    },
    async getLatestRun() {
      return {
        ...(await noDataRepository.getLatestRun()),
        purpose: 'EXPANSION',
      };
    },
  },
}).get(1);
assert.equal(completedExpansionNoData.presentationState, 'NEEDS_ATTENTION');
assert.deepEqual(completedExpansionNoData.actions.map((action) => action.code), [
  'EXPAND_RANGE',
  'ADD_ACCOUNT',
  'CANCEL_PREPARATION',
  'VIEW_HOME',
]);
assert.equal(completedExpansionNoData.actions.some((action) => action.code === 'SKIP_ONBOARDING'), false);
assert.equal(completedExpansionNoData.actions.some((action) => action.code === 'FINISH_ONBOARDING'), false);

const allIndexFailedRepository = {
  ...noDataRepository,
  async getLatestRun() {
    return {
      ...(await runningRepository.getLatestRun()),
      status: 'NEEDS_ATTENTION',
      attentionCode: 'ALL_INDEXING_FAILED',
      attentionDetail: 'All eligible games failed indexing.',
    };
  },
  async getScopeTotals() {
    return { targetCount: 1, completedImportTargets: 1, windowsCompleted: 4, windowsTotal: 4, unknownWindowTargets: 0, nonTerminalImportTargets: 0, rateLimitUntil: null, activeIndexBatches: 0, activeAnalysisBatches: 0, committedCount: 3, indexedCount: 0, indexPendingCount: 0, indexFailedCount: 3, analysedCount: 0, analysisPendingCount: 0, analysisRunningCount: 0, analysisFailedCount: 0 };
  },
  async getProductEvidence() { return { importedCount: 3, indexedCount: 0, indexFailedCount: 3, openingCount: 0, analysedCount: 0, analysisRunningCount: 0, analysisFailedCount: 0, tacticalCount: 0 }; },
};
const allIndexFailed = await createService({ repository: allIndexFailedRepository }).get(1);
assert.equal(allIndexFailed.attention.code, 'ALL_INDEXING_FAILED');
assert.equal(allIndexFailed.preparation.fixedCoverage.index.percentage, 100);
assert.equal(allIndexFailed.readiness.find((item) => item.feature === 'openings').state, 'locked');
assert.deepEqual(allIndexFailed.actions.map((action) => action.code), [
  'RETRY_PREPARATION',
  'FINISH_ONBOARDING',
  'CANCEL_PREPARATION',
  'SKIP_ONBOARDING',
]);

const stalled = await createService({
  repository: {
    ...runningRepository,
    async getLatestRun() {
      return {
        ...(await runningRepository.getLatestRun()),
        attentionCode: 'INDEX_NO_SETTLEMENT_WARNING',
        attentionDetail: 'No index task settled recently.',
      };
    },
  },
}).get(1);
assert.equal(stalled.presentationState, 'PREPARING');
assert.equal(stalled.attention.code, 'INDEX_NO_SETTLEMENT_WARNING');
assert.deepEqual(stalled.actions.map((action) => action.code), [
  'RESUME_ONBOARDING',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
  'SKIP_ONBOARDING',
]);

const terminalRepository = {
  ...runningRepository,
  async getScopeTotals() {
    return { targetCount: 1, completedImportTargets: 1, windowsCompleted: 4, windowsTotal: 4, unknownWindowTargets: 0, nonTerminalImportTargets: 0, rateLimitUntil: null, activeIndexBatches: 0, activeAnalysisBatches: 0, committedCount: 4, indexedCount: 3, indexPendingCount: 0, indexFailedCount: 1, analysedCount: 2, analysisPendingCount: 1, analysisRunningCount: 0, analysisFailedCount: 0 };
  },
  async getProductEvidence() { return { importedCount: 4, indexedCount: 3, indexFailedCount: 1, openingCount: 2, analysedCount: 2, analysisRunningCount: 0, analysisFailedCount: 0, tacticalCount: 0 }; },
};
const terminal = await createService({ repository: terminalRepository }).get(1);
assert.deepEqual(terminal.preparation.fixedCoverage.index, { settled: 4, total: 4, remaining: 0, percentage: 100 });
assert.deepEqual(terminal.preparation.fixedCoverage.analysis, { settled: 2, total: 3, remaining: 1, percentage: 66.67 });

const tacticalPartial = await createService({
  repository: terminalRepository,
  tacticalEvidenceRepository: {
    async get() { return { eligibleCount: 2, processedCount: 1, detectionCount: 0 }; },
  },
}).get(1);
assert.equal(tacticalPartial.readiness.find((item) => item.feature === 'tactics').state, 'partial');

const tacticalCheckedEmpty = await createService({
  repository: terminalRepository,
  tacticalEvidenceRepository: {
    async get() { return { eligibleCount: 2, processedCount: 2, detectionCount: 0 }; },
  },
}).get(1);
assert.equal(tacticalCheckedEmpty.readiness.find((item) => item.feature === 'tactics').state, 'checked-empty');

const tacticalReady = await createService({
  repository: terminalRepository,
  tacticalEvidenceRepository: {
    async get() { return { eligibleCount: 2, processedCount: 2, detectionCount: 1 }; },
  },
}).get(1);
const tacticalReadyState = tacticalReady.readiness.find((item) => item.feature === 'tactics');
assert.equal(tacticalReadyState.state, 'ready');
assert.equal(tacticalReadyState.evidenceCount, 1);

console.log('Onboarding readiness service tests passed.');