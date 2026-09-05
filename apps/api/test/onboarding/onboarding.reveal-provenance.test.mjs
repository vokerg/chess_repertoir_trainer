import assert from 'node:assert/strict';
import { createOnboardingReadinessService } from '../../dist/modules/onboarding/onboarding.service.js';

const repository = {
  async getDisposition() {
    return { disposition: 'PENDING', reason: null, changedAt: null };
  },
  async getLatestRun() {
    return {
      id: 41,
      userId: 1,
      purpose: 'ONBOARDING',
      status: 'RUNNING',
      attentionCode: null,
      attentionDetail: null,
      firstImportedAt: new Date('2026-09-04T04:00:00.000Z'),
      firstIndexedAt: new Date('2026-09-04T04:05:00.000Z'),
      firstAnalysedAt: new Date('2026-09-04T04:10:00.000Z'),
      coreReadyAt: null,
      analysisCompletedAt: null,
      targetCount: 1,
    };
  },
  async getScopeTotals() {
    return {
      targetCount: 1,
      completedImportTargets: 1,
      windowsCompleted: 3,
      windowsTotal: 3,
      unknownWindowTargets: 0,
      nonTerminalImportTargets: 0,
      rateLimitUntil: null,
      activeIndexBatches: 0,
      activeAnalysisBatches: 1,
      committedCount: 12,
      indexedCount: 8,
      indexPendingCount: 4,
      indexFailedCount: 0,
      analysedCount: 3,
      analysisPendingCount: 5,
      analysisRunningCount: 0,
      analysisFailedCount: 0,
    };
  },
  async listTargets() {
    return [{
      id: 11,
      accountId: 17,
      provider: 'LICHESS',
      username: 'public-player',
      ordinal: 0,
      importStatus: 'COMPLETED',
      windowsTotal: 3,
      windowsCompleted: 3,
      importedCount: 12,
      indexedCount: 8,
      indexPendingCount: 4,
      indexFailedCount: 0,
      analysedCount: 3,
      analysisPendingCount: 5,
      analysisRunningCount: 0,
      analysisFailedCount: 0,
      firstImportedAt: new Date('2026-09-04T04:00:00.000Z'),
      firstIndexedAt: new Date('2026-09-04T04:05:00.000Z'),
      firstAnalysedAt: new Date('2026-09-04T04:10:00.000Z'),
      coreReadyAt: null,
    }];
  },
  async getBatchSummary() {
    return {
      batchCount: 1,
      queuedBatches: 0,
      runningBatches: 1,
      terminalBatches: 0,
      selectedTasks: 8,
      queuedTasks: 0,
      runningTasks: 1,
      completedTasks: 3,
      skippedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      remainingTasks: 5,
    };
  },
  async listLatestBatches() { return []; },
  async getProductEvidence() {
    return {
      importedCount: 12,
      indexedCount: 8,
      indexFailedCount: 0,
      openingCount: 8,
      analysedCount: 3,
      analysisRunningCount: 0,
      analysisFailedCount: 0,
    };
  },
  async listReveals() {
    return [
      {
        kind: 'OPENING',
        importedGameId: 101,
        accountId: 17,
        openingName: 'Caro-Kann Defense',
        openingEco: 'B10',
      },
      {
        kind: 'ANALYSIS',
        importedGameId: 102,
        accountId: 17,
        openingName: 'Italian Game',
        openingEco: 'C50',
      },
      {
        kind: 'IMPORTED_GAME',
        importedGameId: 201,
        accountId: 99,
        openingName: null,
        openingEco: null,
      },
    ];
  },
};

const readiness = await createOnboardingReadinessService({
  repository,
  tacticalEvidenceRepository: {
    async get() { return { eligibleCount: 0, processedCount: 0, detectionCount: 0 }; },
  },
  now: () => new Date('2026-09-04T05:00:00.000Z'),
}).get(1);

assert.equal(readiness.reveals.length, 2);
assert.deepEqual(readiness.reveals[0], {
  kind: 'OPENING',
  importedGameId: 101,
  accountId: 17,
  sampleCount: 8,
  evidenceState: 'ready',
  scope: { provider: 'LICHESS', username: 'public-player' },
  title: 'Opening identified',
  detail: 'B10 · Caro-Kann Defense',
  destination: '/opening-analysis',
});
assert.deepEqual(readiness.reveals[1], {
  kind: 'ANALYSIS',
  importedGameId: 102,
  accountId: 17,
  sampleCount: 3,
  evidenceState: 'ready',
  scope: { provider: 'LICHESS', username: 'public-player' },
  title: 'Game analysis ready',
  detail: 'C50 · Italian Game',
  destination: '/games/102',
});
assert.equal(readiness.reveals.some((item) => item.accountId === 99), false);

console.log('Onboarding reveal provenance tests passed.');
