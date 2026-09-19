import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

const run = {
  id: 1,
  userId: 1,
  purpose: 'ONBOARDING',
  status: 'COMPLETED',
  attentionCode: 'ANALYSIS_PARTIAL',
  attentionDetail: '3 indexed game(s) have terminal analysis failures.',
  firstImportedAt: new Date('2026-08-20T07:00:00.000Z'),
  firstIndexedAt: new Date('2026-08-20T07:01:00.000Z'),
  firstAnalysedAt: null,
  coreReadyAt: new Date('2026-08-20T07:02:00.000Z'),
  analysisCompletedAt: new Date('2026-08-20T07:03:00.000Z'),
  targetCount: 1,
};

const repository = {
  async getDisposition() { return { disposition: 'COMPLETED', reason: 'CORE_READY', changedAt: run.coreReadyAt }; },
  async getLatestRun() { return run; },
  async getScopeTotals() {
    return {
      targetCount: 1,
      completedImportTargets: 1,
      windowsCompleted: 1,
      windowsTotal: 1,
      unknownWindowTargets: 0,
      nonTerminalImportTargets: 0,
      rateLimitUntil: null,
      activeIndexBatches: 0,
      activeAnalysisBatches: 0,
      committedCount: 3,
      indexedCount: 3,
      indexPendingCount: 0,
      indexFailedCount: 0,
      analysedCount: 0,
      analysisPendingCount: 0,
      analysisRunningCount: 0,
      analysisFailedCount: 3,
    };
  },
  async listTargets() { return []; },
  async getBatchSummary() {
    return {
      batchCount: 1,
      queuedBatches: 0,
      runningBatches: 0,
      terminalBatches: 1,
      selectedTasks: 3,
      queuedTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      skippedTasks: 0,
      failedTasks: 3,
      cancelledTasks: 0,
      remainingTasks: 0,
    };
  },
  async listLatestBatches() { return []; },
  async getProductEvidence() {
    return {
      importedCount: 3,
      indexedCount: 3,
      indexFailedCount: 0,
      openingCount: 2,
      analysedCount: 0,
      analysisRunningCount: 0,
      analysisFailedCount: 3,
      tacticalCount: 0,
    };
  },
  async listReveals() { return []; },
};

const service = createOnboardingReadinessService({
  repository,
  tacticalEvidenceRepository: {
    async get() { return { eligibleCount: 0, processedCount: 0, detectionCount: 0 }; },
  },
});

const response = await service.get(1);
assert.equal(response.presentationState, 'COMPLETE');
assert.equal(response.attention.code, 'ANALYSIS_PARTIAL');
assert.equal(response.readiness.find((item) => item.feature === 'analysis').state, 'partial');

console.log('Onboarding terminal analysis-failure readiness tests passed.');
