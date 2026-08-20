import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

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

const notStarted = await createOnboardingReadinessService({
  repository: baseRepository,
  now: () => new Date('2026-08-20T08:00:00.000Z'),
}).get(1);
assert.equal(notStarted.presentationState, 'NOT_STARTED');
assert.deepEqual(notStarted.actions.map((action) => action.code), ['START_ONBOARDING', 'SKIP_ONBOARDING']);
assert.equal(notStarted.preparation, null);
assert.equal(notStarted.readiness.every((item) => item.state === 'locked'), true);

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
const running = await createOnboardingReadinessService({ repository: runningRepository }).get(1);
assert.equal(running.presentationState, 'PREPARING');
assert.equal(running.preparation.providerWindows.total, null);
assert.equal(running.preparation.providerWindows.percentage, null);
assert.equal(running.preparation.fixedCoverage.index, null);
assert.equal(running.preparation.latestBatches[0].selected, 4);
assert.equal(running.preparation.latestBatches[0].queued, 2);
assert.equal(running.preparation.latestBatches[0].remaining, 2);
assert.equal(running.preparation.latestBatches[0].percentage, 50);
assert.equal(running.readiness.find((item) => item.feature === 'analysis').state, 'partial');
assert.equal('eta' in running.preparation, false);
assert.equal('overallPercentage' in running.preparation, false);

const terminalRepository = {
  ...runningRepository,
  async getScopeTotals() {
    return { targetCount: 1, completedImportTargets: 1, windowsCompleted: 4, windowsTotal: 4, unknownWindowTargets: 0, nonTerminalImportTargets: 0, rateLimitUntil: null, activeIndexBatches: 0, activeAnalysisBatches: 0, committedCount: 4, indexedCount: 3, indexPendingCount: 0, indexFailedCount: 1, analysedCount: 2, analysisPendingCount: 1, analysisRunningCount: 0, analysisFailedCount: 0 };
  },
};
const terminal = await createOnboardingReadinessService({ repository: terminalRepository }).get(1);
assert.deepEqual(terminal.preparation.fixedCoverage.index, { settled: 4, total: 4, remaining: 0, percentage: 100 });
assert.deepEqual(terminal.preparation.fixedCoverage.analysis, { settled: 2, total: 3, remaining: 1, percentage: 66.67 });

console.log('Onboarding readiness service tests passed.');
