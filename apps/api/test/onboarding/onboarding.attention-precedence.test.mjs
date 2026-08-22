import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

const observedAt = new Date('2026-08-20T08:00:00.000Z');
const rateLimitUntil = new Date('2026-08-20T08:10:00.000Z');

function repositoryFor(status, attentionCode = null, attentionDetail = null) {
  return {
    async getDisposition() {
      return {
        disposition: status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        reason: null,
        changedAt: null,
      };
    },
    async getLatestRun() {
      return {
        id: 1,
        userId: 1,
        purpose: 'ONBOARDING',
        status,
        attentionCode,
        attentionDetail,
        firstImportedAt: null,
        firstIndexedAt: null,
        firstAnalysedAt: null,
        coreReadyAt: null,
        analysisCompletedAt: null,
        targetCount: 1,
      };
    },
    async getScopeTotals() {
      return {
        targetCount: 1,
        completedImportTargets: 0,
        windowsCompleted: 0,
        windowsTotal: 1,
        unknownWindowTargets: 0,
        nonTerminalImportTargets: 1,
        rateLimitUntil,
        activeIndexBatches: 0,
        activeAnalysisBatches: 0,
        committedCount: 0,
        indexedCount: 0,
        indexPendingCount: 0,
        indexFailedCount: 0,
        analysedCount: 0,
        analysisPendingCount: 0,
        analysisRunningCount: 0,
        analysisFailedCount: 0,
      };
    },
    async listTargets() { return []; },
    async getBatchSummary() {
      return {
        batchCount: 0,
        queuedBatches: 0,
        runningBatches: 0,
        terminalBatches: 0,
        selectedTasks: 0,
        queuedTasks: 0,
        runningTasks: 0,
        completedTasks: 0,
        skippedTasks: 0,
        failedTasks: 0,
        cancelledTasks: 0,
        remainingTasks: 0,
      };
    },
    async listLatestBatches() { return []; },
    async getProductEvidence() {
      return {
        importedCount: 0,
        indexedCount: 0,
        indexFailedCount: 0,
        openingCount: 0,
        analysedCount: 0,
        analysisRunningCount: 0,
        analysisFailedCount: 0,
        tacticalCount: 0,
      };
    },
    async listReveals() { return []; },
  };
}

async function project(status, attentionCode = null, attentionDetail = null) {
  return createOnboardingReadinessService({
    repository: repositoryFor(status, attentionCode, attentionDetail),
    tacticalEvidenceRepository: {
      async get() { return { eligibleCount: 0, processedCount: 0, detectionCount: 0 }; },
    },
    now: () => observedAt,
  }).get(1);
}

const running = await project('RUNNING');
assert.equal(running.attention.code, 'IMPORT_RATE_LIMITED');

const pauseRequested = await project('PAUSE_REQUESTED');
assert.equal(pauseRequested.attention.code, 'PREPARATION_PAUSE_REQUESTED');
assert.deepEqual(pauseRequested.actions.map((action) => action.code), ['VIEW_HOME']);

const cancelRequested = await project('CANCEL_REQUESTED');
assert.equal(cancelRequested.attention.code, 'PREPARATION_CANCEL_REQUESTED');
assert.deepEqual(cancelRequested.actions.map((action) => action.code), ['VIEW_HOME']);

const cancelled = await project('CANCELLED');
assert.equal(cancelled.attention.code, 'PREPARATION_CANCELLED');
assert.deepEqual(cancelled.actions.map((action) => action.code), ['RESTART_PREPARATION', 'VIEW_HOME']);

const failed = await project('FAILED', null, 'Terminal failure.');
assert.equal(failed.attention.code, 'PREPARATION_FAILED');
assert.equal(failed.attention.detail, 'Terminal failure.');
assert.deepEqual(failed.actions.map((action) => action.code), ['RESTART_PREPARATION', 'VIEW_HOME']);

const completedPartial = await project('COMPLETED', 'ANALYSIS_PARTIAL', 'One game failed analysis.');
assert.equal(completedPartial.attention.code, 'ANALYSIS_PARTIAL');
assert.equal(completedPartial.attention.detail, 'One game failed analysis.');

console.log('Onboarding attention precedence tests passed.');
