import {
  ONBOARDING_CONTRACT_VERSION,
  type OnboardingAction,
  type OnboardingAttentionCode,
  type OnboardingFeatureReadiness,
  type OnboardingLatestMilestone,
  type OnboardingReadinessResponse,
} from '@chess-trainer/contracts/onboarding';
import {
  currentTacticalDetectionThresholdsHash,
  currentTacticalDetectionVersion,
} from '../lab/tactical-detections/tactical-detection.service';
import {
  OnboardingReadRepository,
  type OnboardingBatchRecord,
  type OnboardingReadRepository as OnboardingRepositoryBoundary,
  type OnboardingRunRecord,
  type OnboardingScopeTotals,
  type OnboardingTargetRecord,
} from './onboarding.repository.prisma';
import {
  OnboardingTacticalEvidenceRepository,
  type OnboardingTacticalEvidence,
  type OnboardingTacticalEvidenceRepository as OnboardingTacticalEvidenceRepositoryBoundary,
} from './onboarding-tactical-evidence.repository.prisma';

const KNOWN_ATTENTION_CODES = new Set<OnboardingAttentionCode>([
  'NO_RECENT_GAMES', 'ALL_INDEXING_FAILED', 'IMPORT_PAUSED', 'IMPORT_RETRY_AVAILABLE',
  'RECONCILE_DUE_WARNING', 'RECONCILE_DUE_CRITICAL', 'PREPARATION_TASK_START_DELAY',
  'INDEX_NO_SETTLEMENT_WARNING', 'ANALYSIS_NO_SETTLEMENT_WARNING', 'INDEXING_PARTIAL',
  'ANALYSIS_PARTIAL',
]);

type LatestMilestoneKind = NonNullable<OnboardingLatestMilestone>['kind'];
type OnboardingDispositionValue = 'PENDING' | 'COMPLETED' | 'SKIPPED';

interface Dependencies {
  repository?: OnboardingRepositoryBoundary;
  tacticalEvidenceRepository?: OnboardingTacticalEvidenceRepositoryBoundary;
  now?: () => Date;
}

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function fixedPercentage(completed: number, total: number | null): number | null {
  if (total === null) return null;
  if (total === 0) return 100;
  return Math.round(Math.min(100, (completed / total) * 100) * 100) / 100;
}

function gameProgress(source: {
  committedCount: number;
  indexedCount: number;
  indexPendingCount: number;
  indexFailedCount: number;
  analysedCount: number;
  analysisPendingCount: number;
  analysisRunningCount: number;
  analysisFailedCount: number;
}) {
  return {
    committed: source.committedCount,
    indexed: source.indexedCount,
    indexPending: source.indexPendingCount,
    indexFailed: source.indexFailedCount,
    analysed: source.analysedCount,
    analysisPending: source.analysisPendingCount,
    analysisRunning: source.analysisRunningCount,
    analysisFailed: source.analysisFailedCount,
  };
}

function milestones(run: OnboardingRunRecord) {
  return {
    firstImportedAt: iso(run.firstImportedAt),
    firstIndexedAt: iso(run.firstIndexedAt),
    firstAnalysedAt: iso(run.firstAnalysedAt),
    coreReadyAt: iso(run.coreReadyAt),
    analysisCompletedAt: iso(run.analysisCompletedAt),
  };
}

function latestMilestone(run: OnboardingRunRecord): OnboardingLatestMilestone {
  const entries: Array<[LatestMilestoneKind, Date | null]> = [
    ['FIRST_IMPORTED', run.firstImportedAt],
    ['FIRST_INDEXED', run.firstIndexedAt],
    ['FIRST_ANALYSED', run.firstAnalysedAt],
    ['CORE_READY', run.coreReadyAt],
    ['ANALYSIS_COMPLETED', run.analysisCompletedAt],
  ];
  let latest: { kind: LatestMilestoneKind; occurredAt: Date } | null = null;
  for (const [kind, occurredAt] of entries) {
    if (occurredAt && (!latest || occurredAt.getTime() > latest.occurredAt.getTime())) {
      latest = { kind, occurredAt };
    }
  }
  return latest ? { kind: latest.kind, occurredAt: latest.occurredAt.toISOString() } : null;
}

function mapBatch(batch: OnboardingBatchRecord) {
  const settled = batch.completedTasks + batch.skippedTasks + batch.failedTasks + batch.cancelledTasks;
  const remaining = Math.max(0, batch.totalTasks - settled);
  return {
    id: batch.id,
    targetId: batch.targetId,
    stage: batch.stage,
    lane: batch.lane,
    status: batch.status,
    selected: batch.totalTasks,
    queued: batch.queuedTasks,
    running: batch.runningTasks,
    completed: batch.completedTasks,
    skipped: batch.skippedTasks,
    failed: batch.failedTasks,
    cancelled: batch.cancelledTasks,
    settled,
    remaining,
    percentage: fixedPercentage(settled, batch.totalTasks) ?? 100,
  };
}

function mapTarget(target: OnboardingTargetRecord) {
  return {
    id: target.id,
    accountId: target.accountId,
    provider: target.provider,
    username: target.username,
    ordinal: target.ordinal,
    importStatus: target.importStatus,
    providerWindows: {
      completed: target.windowsCompleted,
      total: target.windowsTotal,
      percentage: fixedPercentage(target.windowsCompleted, target.windowsTotal),
    },
    games: gameProgress({
      committedCount: target.importedCount,
      indexedCount: target.indexedCount,
      indexPendingCount: target.indexPendingCount,
      indexFailedCount: target.indexFailedCount,
      analysedCount: target.analysedCount,
      analysisPendingCount: target.analysisPendingCount,
      analysisRunningCount: target.analysisRunningCount,
      analysisFailedCount: target.analysisFailedCount,
    }),
    milestones: {
      firstImportedAt: iso(target.firstImportedAt),
      firstIndexedAt: iso(target.firstIndexedAt),
      firstAnalysedAt: iso(target.firstAnalysedAt),
      coreReadyAt: iso(target.coreReadyAt),
    },
  };
}

function presentationState(
  disposition: OnboardingDispositionValue,
  run: OnboardingRunRecord | null,
): OnboardingReadinessResponse['presentationState'] {
  // SKIPPED is the durable first-run guidance decision. A later EXPANSION (or
  // recovery descended only from expansion) may have its own readiness
  // milestones without completing onboarding, so those milestones must not
  // overwrite the skipped presentation.
  if (disposition === 'SKIPPED') return 'SKIPPED';
  if (run?.analysisCompletedAt) return 'COMPLETE';
  if (run?.coreReadyAt) return 'CORE_READY';
  if (run?.status === 'NEEDS_ATTENTION') return 'NEEDS_ATTENTION';
  if (run?.status === 'PAUSE_REQUESTED') return 'PAUSE_REQUESTED';
  if (run?.status === 'PAUSED') return 'PAUSED';
  if (run?.status === 'CANCEL_REQUESTED') return 'CANCEL_REQUESTED';
  if (run?.status === 'CANCELLED') return 'CANCELLED';
  if (run?.status === 'FAILED') return 'FAILED';
  if (run && ['QUEUED', 'RUNNING'].includes(run.status)) return 'PREPARING';
  if (disposition === 'COMPLETED') return 'COMPLETE';
  return 'NOT_STARTED';
}

function withPendingSkip(
  actions: OnboardingAction[],
  disposition: OnboardingDispositionValue,
): OnboardingAction[] {
  if (disposition !== 'PENDING' || actions.some((action) => action.code === 'SKIP_ONBOARDING')) return actions;
  return [...actions, { code: 'SKIP_ONBOARDING', destination: '/onboarding' }];
}

function withDispositionNavigation(
  actions: OnboardingAction[],
  disposition: OnboardingDispositionValue,
): OnboardingAction[] {
  const navigable = disposition === 'COMPLETED' && !actions.some((action) => action.code === 'VIEW_HOME')
    ? [{ code: 'VIEW_HOME' as const, destination: '/home' }, ...actions]
    : actions;
  return withPendingSkip(navigable, disposition);
}

function attentionActions(
  attention: OnboardingAttentionCode | null,
  disposition: OnboardingDispositionValue,
): OnboardingAction[] {
  if (attention === 'NO_RECENT_GAMES') {
    if (disposition === 'PENDING') return [
      { code: 'EXPAND_RANGE', destination: '/onboarding' },
      { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
      { code: 'FINISH_ONBOARDING', destination: '/onboarding' },
      { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
    ];
    return [
      { code: 'EXPAND_RANGE', destination: '/onboarding' },
      { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
      { code: 'VIEW_HOME', destination: '/home' },
    ];
  }
  if (attention === 'ALL_INDEXING_FAILED' || attention === 'IMPORT_RETRY_AVAILABLE') {
    if (disposition === 'PENDING') return [
      { code: 'RETRY_PREPARATION', destination: '/onboarding' },
      { code: 'FINISH_ONBOARDING', destination: '/onboarding' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
      { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
    ];
    return [
      { code: 'RETRY_PREPARATION', destination: '/onboarding' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
      { code: 'VIEW_HOME', destination: '/home' },
    ];
  }
  const primaryCode = attention === 'IMPORT_PAUSED' ? 'RESUME_PREPARATION' : 'VIEW_ONBOARDING';
  return withDispositionNavigation([
    { code: primaryCode, destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ], disposition);
}

function skippedActions(
  run: OnboardingRunRecord | null,
  attention: OnboardingAttentionCode | null,
): OnboardingAction[] {
  if (!run) return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'START_ONBOARDING', destination: '/onboarding' },
  ];
  if (run.status === 'QUEUED' || run.status === 'RUNNING') return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
    { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ];
  if (run.status === 'PAUSED') return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'RESUME_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ];
  if (run.status === 'PAUSE_REQUESTED' || run.status === 'CANCEL_REQUESTED') {
    return [{ code: 'VIEW_HOME', destination: '/home' }];
  }
  if (run.status === 'NEEDS_ATTENTION') {
    if (attention === 'NO_RECENT_GAMES') return [
      { code: 'VIEW_HOME', destination: '/home' },
      { code: 'EXPAND_RANGE', destination: '/onboarding' },
      { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
    ];
    if (attention === 'ALL_INDEXING_FAILED' || attention === 'IMPORT_RETRY_AVAILABLE') return [
      { code: 'VIEW_HOME', destination: '/home' },
      { code: 'RETRY_PREPARATION', destination: '/onboarding' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
    ];
    return [
      { code: 'VIEW_HOME', destination: '/home' },
      { code: attention === 'IMPORT_PAUSED' ? 'RESUME_PREPARATION' : 'VIEW_ONBOARDING', destination: '/onboarding' },
      { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
    ];
  }
  if (run.status === 'FAILED' || run.status === 'CANCELLED') return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'RESTART_PREPARATION', destination: '/onboarding' },
  ];
  return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'START_ONBOARDING', destination: '/onboarding' },
  ];
}

function postCorePreparationActions(
  run: OnboardingRunRecord | null,
  attention: OnboardingAttentionCode | null,
  disposition: OnboardingDispositionValue,
): OnboardingAction[] | null {
  if (!run || disposition !== 'COMPLETED') return null;
  if (run.status === 'QUEUED' || run.status === 'RUNNING') return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
    { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ];
  if (run.status === 'PAUSED') return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'RESUME_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ];
  if (run.status === 'PAUSE_REQUESTED' || run.status === 'CANCEL_REQUESTED') {
    return [{ code: 'VIEW_HOME', destination: '/home' }];
  }
  if (run.status === 'NEEDS_ATTENTION') return attentionActions(attention, disposition);
  if (run.status === 'FAILED' || run.status === 'CANCELLED') return [
    { code: 'RESTART_PREPARATION', destination: '/onboarding' },
    { code: 'VIEW_HOME', destination: '/home' },
  ];
  return null;
}

function allowedActions(
  state: OnboardingReadinessResponse['presentationState'],
  attention: OnboardingAttentionCode | null,
  run: OnboardingRunRecord | null,
  disposition: OnboardingDispositionValue,
): OnboardingAction[] {
  if (state === 'NOT_STARTED') return [
    { code: 'START_ONBOARDING', destination: '/onboarding' },
    { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
  ];
  if (state === 'PREPARING') return withDispositionNavigation([
    { code: 'VIEW_ONBOARDING', destination: '/onboarding' },
    { code: 'PAUSE_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ], disposition);
  if (state === 'PAUSE_REQUESTED' || state === 'CANCEL_REQUESTED') {
    return withPendingSkip([{ code: 'VIEW_HOME', destination: '/home' }], disposition);
  }
  if (state === 'PAUSED') return withDispositionNavigation([
    { code: 'RESUME_PREPARATION', destination: '/onboarding' },
    { code: 'CANCEL_PREPARATION', destination: '/onboarding' },
  ], disposition);
  if (state === 'NEEDS_ATTENTION') return attentionActions(attention, disposition);
  if (state === 'FAILED') return withPendingSkip([
    { code: 'RESTART_PREPARATION', destination: '/onboarding' },
    { code: 'VIEW_HOME', destination: '/home' },
  ], disposition);
  if (state === 'CANCELLED') return withPendingSkip([
    { code: 'RESTART_PREPARATION', destination: '/onboarding' },
    { code: 'VIEW_HOME', destination: '/home' },
  ], disposition);
  if (state === 'SKIPPED') return skippedActions(run, attention);
  const postCoreActions = postCorePreparationActions(run, attention, disposition);
  if (postCoreActions) return postCoreActions;
  return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'VIEW_GAMES', destination: '/games' },
    { code: 'VIEW_OPENING_ANALYSIS', destination: '/opening-analysis' },
    { code: 'VIEW_ANALYSIS', destination: '/analysis' },
  ];
}

function featureReadiness(
  evidence: Awaited<ReturnType<OnboardingRepositoryBoundary['getProductEvidence']>>,
  tacticalEvidence: OnboardingTacticalEvidence,
  importChecked: boolean,
  indexChecked: boolean,
  analysisChecked: boolean,
): OnboardingFeatureReadiness[] {
  const games: OnboardingFeatureReadiness['state'] = evidence.importedCount > 0 ? 'ready' : importChecked ? 'checked-empty' : 'locked';
  const openings: OnboardingFeatureReadiness['state'] = evidence.openingCount > 0 ? 'ready'
    : indexChecked ? 'checked-empty'
      : evidence.indexedCount > 0 ? 'partial' : 'locked';
  const analysis: OnboardingFeatureReadiness['state'] = evidence.analysedCount > 0 ? 'ready'
    : evidence.analysisFailedCount > 0 || evidence.analysisRunningCount > 0 ? 'partial'
      : analysisChecked ? 'checked-empty'
        : evidence.indexedCount > 0 ? 'partial' : 'locked';
  const tacticsChecked = tacticalEvidence.eligibleCount > 0
    && tacticalEvidence.processedCount >= tacticalEvidence.eligibleCount;
  const tactics: OnboardingFeatureReadiness['state'] = tacticalEvidence.detectionCount > 0 ? 'ready'
    : tacticsChecked ? 'checked-empty'
      : tacticalEvidence.processedCount > 0 || evidence.analysedCount > 0 ? 'partial' : 'locked';
  return [
    { feature: 'games', state: games, evidenceCount: evidence.importedCount },
    { feature: 'openings', state: openings, evidenceCount: evidence.openingCount },
    { feature: 'analysis', state: analysis, evidenceCount: evidence.analysedCount },
    { feature: 'tactics', state: tactics, evidenceCount: tacticalEvidence.detectionCount },
  ];
}

function fixedCoverage(scope: OnboardingScopeTotals) {
  const importComplete = scope.targetCount > 0 && scope.completedImportTargets === scope.targetCount;
  // A zero-game import is an attention/checked-empty outcome, not a meaningful
  // "100% indexed" progress surface.
  const index = importComplete && scope.committedCount > 0 ? {
    settled: scope.indexedCount + scope.indexFailedCount,
    total: scope.committedCount,
    remaining: scope.indexPendingCount,
    percentage: fixedPercentage(scope.indexedCount + scope.indexFailedCount, scope.committedCount) ?? 100,
  } : null;
  const indexComplete = importComplete
    && scope.indexPendingCount === 0
    && scope.activeIndexBatches === 0
    && scope.indexedCount > 0;
  const analysisSettled = scope.analysedCount + scope.analysisFailedCount;
  const analysisRemaining = scope.analysisPendingCount + scope.analysisRunningCount;
  const analysis = indexComplete ? {
    settled: analysisSettled,
    total: scope.indexedCount,
    remaining: analysisRemaining,
    percentage: fixedPercentage(analysisSettled, scope.indexedCount) ?? 100,
  } : null;
  return { index, analysis };
}

function attentionFor(
  run: OnboardingRunRecord | null,
  scope: OnboardingScopeTotals | null,
  observedAt: Date,
): { code: OnboardingAttentionCode; detail: string | null } | null {
  if (!run) return null;
  if (run.status === 'PAUSE_REQUESTED') return { code: 'PREPARATION_PAUSE_REQUESTED', detail: null };
  if (run.status === 'PAUSED') return { code: 'PREPARATION_PAUSED', detail: null };
  if (run.status === 'CANCEL_REQUESTED') return { code: 'PREPARATION_CANCEL_REQUESTED', detail: null };
  if (run.status === 'CANCELLED') return { code: 'PREPARATION_CANCELLED', detail: null };
  if (run.status === 'FAILED') return { code: 'PREPARATION_FAILED', detail: run.attentionDetail };
  if (
    (run.status === 'QUEUED' || run.status === 'RUNNING')
    && scope?.rateLimitUntil
    && scope.rateLimitUntil > observedAt
  ) {
    return { code: 'IMPORT_RATE_LIMITED', detail: `Provider import is rate limited until ${scope.rateLimitUntil.toISOString()}.` };
  }
  if (!run.attentionCode) return null;
  const code = KNOWN_ATTENTION_CODES.has(run.attentionCode as OnboardingAttentionCode)
    ? run.attentionCode as OnboardingAttentionCode
    : 'PREPARATION_NEEDS_ATTENTION';
  return { code, detail: run.attentionDetail };
}

export function createOnboardingReadinessService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? OnboardingReadRepository;
  const tacticalEvidenceRepository = dependencies.tacticalEvidenceRepository ?? OnboardingTacticalEvidenceRepository;
  const now = dependencies.now ?? (() => new Date());

  return {
    async get(userId: number): Promise<OnboardingReadinessResponse> {
      const observedAt = now();
      const tacticalPolicy = {
        thresholdsHash: currentTacticalDetectionThresholdsHash(),
        detectionVersion: currentTacticalDetectionVersion(),
      };
      const [disposition, run, evidence, tacticalEvidence, reveals] = await Promise.all([
        repository.getDisposition(userId),
        repository.getLatestRun(userId),
        repository.getProductEvidence(userId),
        tacticalEvidenceRepository.get(userId, tacticalPolicy),
        repository.listReveals(userId),
      ]);

      const [scope, targets, batchSummary, latestBatches] = run
        ? await Promise.all([
            repository.getScopeTotals(userId, run.id),
            repository.listTargets(userId, run.id),
            repository.getBatchSummary(userId, run.id),
            repository.listLatestBatches(userId, run.id),
          ])
        : [null, [], null, []] as const;

      const attention = attentionFor(run, scope, observedAt);
      const state = presentationState(disposition.disposition, run);
      const importChecked = Boolean(scope && scope.targetCount > 0 && scope.completedImportTargets === scope.targetCount);
      const indexChecked = Boolean(
        scope
        && importChecked
        && scope.indexedCount > 0
        && scope.indexPendingCount === 0
        && scope.activeIndexBatches === 0,
      );
      const analysisChecked = Boolean(run?.analysisCompletedAt);

      return {
        contractVersion: ONBOARDING_CONTRACT_VERSION,
        disposition: {
          value: disposition.disposition,
          reason: disposition.reason,
          changedAt: iso(disposition.changedAt),
        },
        presentationState: state,
        preparation: run && scope && batchSummary ? {
          runId: run.id,
          status: run.status,
          purpose: run.purpose,
          targetsTotal: scope.targetCount,
          targetsTruncated: scope.targetCount > targets.length,
          providerWindows: {
            completed: scope.windowsCompleted,
            total: scope.unknownWindowTargets === 0 ? scope.windowsTotal : null,
            percentage: fixedPercentage(
              scope.windowsCompleted,
              scope.unknownWindowTargets === 0 ? scope.windowsTotal : null,
            ),
          },
          games: gameProgress(scope),
          fixedCoverage: fixedCoverage(scope),
          technicalBatches: batchSummary,
          latestBatches: latestBatches.map(mapBatch),
          targets: targets.map(mapTarget),
          milestones: milestones(run),
          latestMilestone: latestMilestone(run),
        } : null,
        attention,
        readiness: featureReadiness(evidence, tacticalEvidence, importChecked, indexChecked, analysisChecked),
        actions: allowedActions(state, attention?.code ?? null, run, disposition.disposition),
        reveals: reveals.map((reveal) => ({
          kind: reveal.kind,
          importedGameId: reveal.importedGameId,
          accountId: reveal.accountId,
          title: reveal.kind === 'ANALYSIS'
            ? 'Game analysis ready'
            : reveal.kind === 'OPENING'
              ? 'Opening identified'
              : 'Game imported',
          detail: reveal.openingName
            ? `${reveal.openingEco ? `${reveal.openingEco} · ` : ''}${reveal.openingName}`
            : null,
          destination: reveal.kind === 'OPENING' ? '/opening-analysis' : `/games/${reveal.importedGameId}`,
        })),
        observedAt: observedAt.toISOString(),
      };
    },
  };
}

export const OnboardingReadinessService = createOnboardingReadinessService();