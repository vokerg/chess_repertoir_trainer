import assert from 'node:assert/strict';
import {
  ONBOARDING_CONTRACT_VERSION,
  onboardingActionCodeSchema,
  onboardingAttentionCodeSchema,
  onboardingDispositionCommandResponseSchema,
  onboardingDispositionSchema,
  onboardingErrorResponseSchema,
  onboardingExpandBodySchema,
  onboardingFeatureStateSchema,
  onboardingPreparationPurposeSchema,
  onboardingReadinessResponseSchema,
  onboardingRevealSchema,
  onboardingRunCommandResponseSchema,
  onboardingRunParamsSchema,
  onboardingStartBodySchema,
} from '../dist/onboarding/index.js';

assert.equal(onboardingDispositionSchema.safeParse('PENDING').success, true);
assert.equal(onboardingDispositionSchema.safeParse('IN_PROGRESS').success, false);
assert.equal(onboardingFeatureStateSchema.safeParse('checked-empty').success, true);
assert.equal(onboardingActionCodeSchema.safeParse('VIEW_ONBOARDING').success, true);
assert.equal(onboardingActionCodeSchema.safeParse('RESUME_PREPARATION').success, true);
assert.equal(onboardingActionCodeSchema.safeParse('PAUSE_PREPARATION').success, true);
assert.equal(onboardingActionCodeSchema.safeParse('CANCEL_PREPARATION').success, true);
assert.equal(onboardingActionCodeSchema.safeParse('RESTART_PREPARATION').success, true);
assert.equal(onboardingActionCodeSchema.safeParse('RESUME_ONBOARDING').success, false);
assert.equal(onboardingAttentionCodeSchema.safeParse('PREPARATION_CANCEL_REQUESTED').success, true);
assert.equal(onboardingPreparationPurposeSchema.safeParse('ONBOARDING').success, true);
assert.equal(onboardingPreparationPurposeSchema.safeParse('RECOVERY').success, true);
assert.equal(onboardingPreparationPurposeSchema.safeParse('EXPANSION').success, true);
assert.equal(onboardingPreparationPurposeSchema.safeParse('OTHER').success, false);

const response = onboardingReadinessResponseSchema.parse({
  contractVersion: ONBOARDING_CONTRACT_VERSION,
  disposition: { value: 'PENDING', reason: null, changedAt: null },
  presentationState: 'PREPARING',
  preparation: {
    runId: 10,
    status: 'RUNNING',
    purpose: 'RECOVERY',
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
  actions: [
    { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
    { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
    { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
  ],
  reveals: [],
  observedAt: '2026-08-20T07:02:00.000Z',
});
assert.equal(response.preparation.purpose, 'RECOVERY');
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

const reveal = {
  kind: 'OPENING',
  importedGameId: 31,
  accountId: 17,
  sampleCount: 12,
  evidenceState: 'ready',
  scope: { provider: 'LICHESS', username: 'public-player' },
  title: 'Opening identified',
  detail: 'B10 · Caro-Kann Defense',
  destination: '/opening-analysis',
};
assert.deepEqual(onboardingRevealSchema.parse(reveal), reveal);
assert.equal(onboardingRevealSchema.safeParse({ ...reveal, sampleCount: -1 }).success, false);
assert.equal(onboardingRevealSchema.safeParse({ ...reveal, evidenceState: 'unknown' }).success, false);
assert.equal(onboardingRevealSchema.safeParse({ ...reveal, scope: { provider: '', username: 'x' } }).success, false);

const startBody = { accountId: 17 };
assert.deepEqual(onboardingStartBodySchema.parse(startBody), startBody);
assert.equal(onboardingStartBodySchema.safeParse({ accountId: 0 }).success, false);
assert.equal(onboardingStartBodySchema.safeParse({ accountId: 17, extra: true }).success, false);

assert.deepEqual(onboardingRunParamsSchema.parse({ runId: '23' }), { runId: 23 });
assert.equal(onboardingRunParamsSchema.safeParse({ runId: '0' }).success, false);

const expansion = { kind: 'OLDER_HISTORY', accountId: 17 };
assert.deepEqual(onboardingExpandBodySchema.parse(expansion), expansion);
assert.equal(onboardingExpandBodySchema.safeParse({ kind: 'CUSTOM', accountId: 17 }).success, false);
assert.equal(onboardingExpandBodySchema.safeParse({ kind: 'ADD_ACCOUNT', accountId: -1 }).success, false);

const runResponse = {
  runId: 41,
  purpose: 'RECOVERY',
  status: 'QUEUED',
  retryGeneration: 2,
  idempotent: false,
};
assert.deepEqual(onboardingRunCommandResponseSchema.parse(runResponse), runResponse);
assert.equal(onboardingRunCommandResponseSchema.safeParse({ ...runResponse, runId: 0 }).success, false);
assert.equal(onboardingRunCommandResponseSchema.safeParse({ ...runResponse, purpose: 'OTHER' }).success, false);
assert.equal(onboardingRunCommandResponseSchema.safeParse({ ...runResponse, status: '' }).success, false);
assert.equal(onboardingRunCommandResponseSchema.safeParse({ ...runResponse, retryGeneration: -1 }).success, false);

const dispositionResponse = {
  disposition: 'COMPLETED',
  reason: 'CORE_READY',
  changedAt: '2026-08-26T07:00:00.000Z',
  idempotent: true,
};
assert.deepEqual(
  onboardingDispositionCommandResponseSchema.parse(dispositionResponse),
  dispositionResponse,
);
assert.equal(
  onboardingDispositionCommandResponseSchema.safeParse({
    ...dispositionResponse,
    changedAt: 'not-a-date',
  }).success,
  false,
);
assert.equal(
  onboardingDispositionCommandResponseSchema.safeParse({
    ...dispositionResponse,
    disposition: 'UNKNOWN',
  }).success,
  false,
);

const errorResponse = {
  error: 'Owned onboarding preparation run not found.',
  code: 'ONBOARDING_NOT_FOUND',
};
assert.deepEqual(onboardingErrorResponseSchema.parse(errorResponse), errorResponse);
assert.equal(
  onboardingErrorResponseSchema.safeParse({ ...errorResponse, code: 'INTERNAL_ERROR' }).success,
  false,
);

console.log('Onboarding contract tests passed.');
