import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

function repositoryFor(attentionCode) {
  return {
    async getDisposition() {
      return {
        disposition: 'SKIPPED',
        reason: 'USER_SKIPPED',
        changedAt: new Date('2026-08-20T07:00:00.000Z'),
      };
    },
    async getLatestRun() {
      return {
        id: 1,
        userId: 1,
        purpose: 'ONBOARDING',
        status: 'NEEDS_ATTENTION',
        attentionCode,
        attentionDetail: null,
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
        completedImportTargets: 1,
        windowsCompleted: 1,
        windowsTotal: 1,
        unknownWindowTargets: 0,
        nonTerminalImportTargets: 0,
        rateLimitUntil: null,
        activeIndexBatches: 0,
        activeAnalysisBatches: 0,
        committedCount: attentionCode === 'NO_RECENT_GAMES' ? 0 : 1,
        indexedCount: 0,
        indexPendingCount: 0,
        indexFailedCount: attentionCode === 'ALL_INDEXING_FAILED' ? 1 : 0,
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
        importedCount: attentionCode === 'NO_RECENT_GAMES' ? 0 : 1,
        indexedCount: 0,
        indexFailedCount: attentionCode === 'ALL_INDEXING_FAILED' ? 1 : 0,
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

async function project(attentionCode) {
  return createOnboardingReadinessService({
    repository: repositoryFor(attentionCode),
    tacticalEvidenceRepository: {
      async get() { return { eligibleCount: 0, processedCount: 0, detectionCount: 0 }; },
    },
  }).get(1);
}

const noRecentGames = await project('NO_RECENT_GAMES');
assert.equal(noRecentGames.presentationState, 'SKIPPED');
assert.deepEqual(noRecentGames.actions.map((action) => action.code), [
  'VIEW_HOME',
  'EXPAND_RANGE',
  'ADD_ACCOUNT',
  'CANCEL_PREPARATION',
]);
assert.equal(noRecentGames.actions.some((action) => action.code === 'FINISH_ONBOARDING'), false);
assert.equal(noRecentGames.actions.some((action) => action.code === 'SKIP_ONBOARDING'), false);

const allIndexingFailed = await project('ALL_INDEXING_FAILED');
assert.equal(allIndexingFailed.presentationState, 'SKIPPED');
assert.deepEqual(allIndexingFailed.actions.map((action) => action.code), [
  'VIEW_HOME',
  'RETRY_PREPARATION',
  'CANCEL_PREPARATION',
]);
assert.equal(allIndexingFailed.actions.some((action) => action.code === 'FINISH_ONBOARDING'), false);
assert.equal(allIndexingFailed.actions.some((action) => action.code === 'SKIP_ONBOARDING'), false);

console.log('Onboarding skipped recovery action tests passed.');
