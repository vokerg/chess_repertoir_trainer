import assert from 'node:assert/strict';
import {
  ONBOARDING_CONTRACT_VERSION,
  onboardingDispositionSchema,
  onboardingFeatureStateSchema,
  onboardingReadinessResponseSchema,
} from '../dist/onboarding/index.js';

assert.equal(onboardingDispositionSchema.safeParse('PENDING').success, true);
assert.equal(onboardingDispositionSchema.safeParse('IN_PROGRESS').success, false);
assert.equal(onboardingFeatureStateSchema.safeParse('checked-empty').success, true);

const response = onboardingReadinessResponseSchema.parse({
  contractVersion: ONBOARDING_CONTRACT_VERSION,
  disposition: { value: 'PENDING', reason: null, changedAt: null },
  presentationState: 'PREPARING',
  preparation: {
    runId: 10,
    status: 'RUNNING',
    purpose: 'ONBOARDING',
    targetsTotal: 1,
    targetsTruncated: false,
    providerWindows: { completed: 2, total: 4, percentage: 50 },
    games: {
      committed: 3,
      indexed: 2,
      indexPending: 1,
      indexFailed: 0,
      analysed: 1,
      analysisPending: 1,
      analysisRunning: 0,
      analysisFailed: 0,
    },
    fixedCoverage: { index: null, analysis: null },
    technicalBatches: {
      batchCount: 1,
      queuedBatches: 0,
      runningBatches: 1,
      terminalBatches: 0,
      selectedTasks: 3,
      queuedTasks: 1,
      runningTasks: 0,
      completedTasks: 2,
      skippedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      remainingTasks: 1,
    },
    latestBatches: [{
      id: 1,
      targetId: 1,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
      status: 'RUNNING',
      selected: 3,
      queued: 1,
      running: 0,
      completed: 2,
      skipped: 0,
      failed: 0,
      cancelled: 0,
      settled: 2,
      remaining: 1,
      percentage: 66.67,
    }],
    targets: [],
    milestones: {
      firstImportedAt: '2026-08-20T07:00:00.000Z',
      firstIndexedAt: '2026-08-20T07:01:00.000Z',
      firstAnalysedAt: null,
      coreReadyAt: null,
      analysisCompletedAt: null,
    },
    latestMilestone: { kind: 'FIRST_INDEXED', occurredAt: '2026-08-20T07:01:00.000Z' },
  },
  attention: null,
  readiness: [
    { feature: 'games', state: 'ready', evidenceCount: 3 },
    { feature: 'openings', state: 'ready', evidenceCount: 2 },
    { feature: 'analysis', state: 'partial', evidenceCount: 0 },
    { feature: 'tactics', state: 'locked', evidenceCount: 0 },
  ],
  actions: [{ code: 'RESUME_ONBOARDING', destination: '/onboarding' }],
  reveals: [],
  observedAt: '2026-08-20T07:02:00.000Z',
});
assert.equal(response.preparation.providerWindows.percentage, 50);
assert.equal(response.preparation.latestBatches[0].selected, 3);

assert.equal(onboardingReadinessResponseSchema.safeParse({
  ...response,
  overallPercentage: 42,
}).success, false);
assert.equal(onboardingReadinessResponseSchema.safeParse({
  ...response,
  etaSeconds: 120,
}).success, false);

console.log('Onboarding contract tests passed.');
