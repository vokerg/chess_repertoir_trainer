import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

const coreReadyAt = new Date('2026-08-22T09:00:00.000Z');
const analysisCompletedAt = new Date('2026-08-22T09:30:00.000Z');

function repositoryFor({ disposition = 'COMPLETED', purpose = 'ONBOARDING', status = 'RUNNING', analysisComplete = false } = {}) {
  const run = {
    id: 41,
    userId: 1,
    purpose,
    status,
    attentionCode: null,
    attentionDetail: status === 'FAILED' ? 'Post-core analysis orchestration failed.' : null,
    firstImportedAt: new Date('2026-08-22T08:00:00.000Z'),
    firstIndexedAt: new Date('2026-08-22T08:15:00.000Z'),
    firstAnalysedAt: new Date('2026-08-22T08:30:00.000Z'),
    coreReadyAt,
    analysisCompletedAt: analysisComplete ? analysisCompletedAt : null,
    targetCount: 1,
  };

  return {
    async getDisposition() {
      return {
        disposition,
        reason: disposition === 'COMPLETED' ? 'CORE_READY' : 'USER_SKIPPED',
        changedAt: coreReadyAt,
      };
    },
    async getLatestRun() { return run; },
    async getScopeTotals() {
      return {
        targetCount: 1,
        completedImportTargets: 1,
        windowsCompleted: 4,
        windowsTotal: 4,
        unknownWindowTargets: 0,
        nonTerminalImportTargets: 0,
        rateLimitUntil: null,
        activeIndexBatches: 0,
        activeAnalysisBatches: status === 'RUNNING' ? 1 : 0,
        committedCount: 4,
        indexedCount: 4,
        indexPendingCount: 0,
        indexFailedCount: 0,
        analysedCount: analysisComplete ? 4 : 2,
        analysisPendingCount: analysisComplete ? 0 : 2,
        analysisRunningCount: 0,
        analysisFailedCount: 0,
      };
    },
    async listTargets() { return []; },
    async getBatchSummary() {
      return {
        batchCount: 1,
        queuedBatches: 0,
        runningBatches: status === 'RUNNING' ? 1 : 0,
        terminalBatches: status === 'RUNNING' ? 0 : 1,
        selectedTasks: 4,
        queuedTasks: 0,
        runningTasks: status === 'RUNNING' ? 1 : 0,
        completedTasks: analysisComplete ? 4 : 2,
        skippedTasks: 0,
        failedTasks: 0,
        cancelledTasks: 0,
        remainingTasks: analysisComplete ? 0 : 2,
      };
    },
    async listLatestBatches() { return []; },
    async getProductEvidence() {
      return {
        importedCount: 4,
        indexedCount: 4,
        indexFailedCount: 0,
        openingCount: 4,
        analysedCount: analysisComplete ? 4 : 2,
        analysisRunningCount: 0,
        analysisFailedCount: 0,
      };
    },
    async listReveals() { return []; },
  };
}

async function project(options) {
  return createOnboardingReadinessService({
    repository: repositoryFor(options),
    tacticalEvidenceRepository: {
      async get() { return { eligibleCount: 2, processedCount: 2, detectionCount: 0 }; },
    },
  }).get(1);
}

const running = await project({ status: 'RUNNING' });
assert.equal(running.presentationState, 'CORE_READY');
assert.deepEqual(running.actions.map((action) => action.code), [
  'VIEW_HOME',
  'VIEW_ONBOARDING',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
]);

const paused = await project({ status: 'PAUSED' });
assert.equal(paused.presentationState, 'CORE_READY');
assert.equal(paused.attention.code, 'PREPARATION_PAUSED');
assert.deepEqual(paused.actions.map((action) => action.code), [
  'VIEW_HOME',
  'RESUME_PREPARATION',
  'CANCEL_PREPARATION',
]);

const cancelRequested = await project({ status: 'CANCEL_REQUESTED' });
assert.equal(cancelRequested.presentationState, 'CORE_READY');
assert.equal(cancelRequested.attention.code, 'PREPARATION_CANCEL_REQUESTED');
assert.deepEqual(cancelRequested.actions.map((action) => action.code), ['VIEW_HOME']);

const failed = await project({ status: 'FAILED' });
assert.equal(failed.presentationState, 'CORE_READY');
assert.equal(failed.attention.code, 'PREPARATION_FAILED');
assert.deepEqual(failed.actions.map((action) => action.code), ['RESTART_PREPARATION', 'VIEW_HOME']);

const skippedExpansion = await project({
  disposition: 'SKIPPED',
  purpose: 'EXPANSION',
  status: 'RUNNING',
});
assert.equal(skippedExpansion.presentationState, 'SKIPPED');
assert.deepEqual(skippedExpansion.actions.map((action) => action.code), [
  'VIEW_HOME',
  'VIEW_ONBOARDING',
  'PAUSE_PREPARATION',
  'CANCEL_PREPARATION',
]);

const skippedCompletedExpansion = await project({
  disposition: 'SKIPPED',
  purpose: 'EXPANSION',
  status: 'COMPLETED',
  analysisComplete: true,
});
assert.equal(skippedCompletedExpansion.presentationState, 'SKIPPED');
assert.deepEqual(skippedCompletedExpansion.actions.map((action) => action.code), [
  'VIEW_HOME',
  'START_ONBOARDING',
]);

console.log('Onboarding post-core action and skipped expansion presentation tests passed.');
