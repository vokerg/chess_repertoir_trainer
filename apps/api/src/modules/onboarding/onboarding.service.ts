import {
  ONBOARDING_CONTRACT_VERSION,
  type OnboardingAction,
  type OnboardingAttentionCode,
  type OnboardingFeatureReadiness,
  type OnboardingLatestMilestone,
  type OnboardingReadinessResponse,
} from '@chess-trainer/contracts/onboarding';
import {
  OnboardingReadRepository,
  type OnboardingBatchRecord,
  type OnboardingReadRepository as OnboardingRepositoryBoundary,
  type OnboardingRunRecord,
  type OnboardingScopeTotals,
  type OnboardingTargetRecord,
} from './onboarding.repository.prisma';

const KNOWN_ATTENTION_CODES = new Set<OnboardingAttentionCode>([
  'NO_RECENT_GAMES', 'ALL_INDEXING_FAILED', 'IMPORT_PAUSED', 'IMPORT_RETRY_AVAILABLE',
  'RECONCILE_DUE_WARNING', 'RECONCILE_DUE_CRITICAL', 'PREPARATION_TASK_START_DELAY',
  'INDEX_NO_SETTLEMENT_WARNING', 'ANALYSIS_NO_SETTLEMENT_WARNING', 'INDEXING_PARTIAL',
  'ANALYSIS_PARTIAL',
]);

type LatestMilestoneKind = NonNullable<OnboardingLatestMilestone>['kind'];

interface Dependencies {
  repository?: OnboardingRepositoryBoundary;
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
  disposition: 'PENDING' | 'COMPLETED' | 'SKIPPED',
  run: OnboardingRunRecord | null,
): OnboardingReadinessResponse['presentationState'] {
  if (run?.analysisCompletedAt) return 'COMPLETE';
  if (run?.coreReadyAt) return 'CORE_READY';
  // Skip dismisses first-run guidance without cancelling accepted background work.
  // Keep the preparation projection populated, but do not re-open onboarding UI
  // merely because that work is still running or needs attention.
  if (disposition === 'SKIPPED') return 'SKIPPED';
  if (run?.status === 'NEEDS_ATTENTION') return 'NEEDS_ATTENTION';
  if (run?.status === 'PAUSED' || run?.status === 'PAUSE_REQUESTED') return 'PAUSED';
  if (run?.status === 'CANCELLED' || run?.status === 'CANCEL_REQUESTED') return 'CANCELLED';
  if (run?.status === 'FAILED') return 'FAILED';
  if (run && ['QUEUED', 'RUNNING'].includes(run.status)) return 'PREPARING';
  if (disposition === 'COMPLETED') return 'COMPLETE';
  return 'NOT_STARTED';
}

function allowedActions(
  state: OnboardingReadinessResponse['presentationState'],
  attention: OnboardingAttentionCode | null,
): OnboardingAction[] {
  if (state === 'NOT_STARTED') return [
    { code: 'START_ONBOARDING', destination: '/onboarding' },
    { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
  ];
  if (state === 'PREPARING') return [{ code: 'RESUME_ONBOARDING', destination: '/onboarding' }];
  if (state === 'PAUSED') {
    if (attention === 'PREPARATION_PAUSE_REQUESTED') {
      return [{ code: 'VIEW_HOME', destination: '/home' }];
    }
    return [{ code: 'RESUME_ONBOARDING', destination: '/onboarding' }];
  }
  if (state === 'NEEDS_ATTENTION') {
    if (attention === 'NO_RECENT_GAMES') return [
      { code: 'EXPAND_RANGE', destination: '/onboarding' },
      { code: 'ADD_ACCOUNT', destination: '/settings/accounts' },
      { code: 'FINISH_ONBOARDING', destination: '/onboarding' },
      { code: 'SKIP_ONBOARDING', destination: '/onboarding' },
    ];
    if (attention === 'ALL_INDEXING_FAILED' || attention === 'IMPORT_RETRY_AVAILABLE') return [
      { code: 'RETRY_PREPARATION', destination: '/onboarding' },
      { code: 'FINISH_ONBOARDING', destination: '/onboarding' },
    ];
    return [{ code: 'RESUME_ONBOARDING', destination: '/onboarding' }];
  }
  if (state === 'FAILED') return [
    { code: 'RESTART_PREPARATION', destination: '/onboarding' },
    { code: 'VIEW_HOME', destination: '/home' },
  ];
  if (state === 'CANCELLED') {
    if (attention === 'PREPARATION_CANCEL_REQUESTED') {
      return [{ code: 'VIEW_HOME', destination: '/home' }];
    }
    return [
      { code: 'RESTART_PREPARATION', destination: '/onboarding' },
      { code: 'VIEW_HOME', destination: '/home' },
    ];
  }
  if (state === 'SKIPPED') return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'START_ONBOARDING', destination: '/onboarding' },
  ];
  return [
    { code: 'VIEW_HOME', destination: '/home' },
    { code: 'VIEW_GAMES', destination: '/games' },
    { code: 'VIEW_OPENING_ANALYSIS', destination: '/opening-analysis' },
    { code: 'VIEW_ANALYSIS', destination: '/analysis' },
  ];
}

function featureReadiness(
  evidence: Awaited<ReturnType<OnboardingRepositoryBoundary['getProductEvidence']>>,
  importChecked: boolean,
  indexChecked: boolean,
  analysisChecked: boolean,
): OnboardingFeatureReadiness[] {
  const games: OnboardingFeatureReadiness['state'] = evidence.importedCount > 0 ? 'ready' : importChecked ? 'checked-empty' : 'locked';
  const openings: OnboardingFeatureReadiness['state'] = evidence.openingCount > 0 ? 'ready'
    : indexChecked ? 'checked-empty'
      : evidence.indexedCount > 0 ? 'partial' : 'locked';
  const analysis: OnboardingFeatureReadiness['state'] = evidence.analysedCount > 0 ? 'ready'
    : analysisChecked ? 'checked-empty'
      : evidence.indexedCount > 0 ? 'partial' : 'locked';
  const tactics: OnboardingFeatureReadiness['state'] = evidence.tacticalCount > 0 ? 'ready'
    : analysisChecked ? 'checked-empty'
      : evidence.analysedCount > 0 ? 'partial' : 'locked';
  return [
    { feature: 'games', state: games, evidenceCount: evidence.importedCount },
    { feature: 'openings', state: openings, evidenceCount: evidence.openingCount },
    { feature: 'analysis', state: analysis, evidenceCount: evidence.analysedCount },
    { feature: 'tactics', state: tactics, evidenceCount: evidence.tacticalCount },
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
  if (scope?.rateLimitUntil && scope.rateLimitUntil > observedAt) {
    return { code: 'IMPORT_RATE_LIMITED', detail: `Provider import is rate limited until ${scope.rateLimitUntil.toISOString()}.` };
  }
  if (run.status === 'PAUSE_REQUESTED') return { code: 'PREPARATION_PAUSE_REQUESTED', detail: null };
  if (run.status === 'PAUSED') return { code: 'PREPARATION_PAUSED', detail: null };
  if (run.status === 'CANCEL_REQUESTED') return { code: 'PREPARATION_CANCEL_REQUESTED', detail: null };
  if (run.status === 'CANCELLED') return { code: 'PREPARATION_CANCELLED', detail: null };
  if (run.status === 'FAILED') return { code: 'PREPARATION_FAILED', detail: run.attentionDetail };
  if (!run.attentionCode) return null;
  const code = KNOWN_ATTENTION_CODES.has(run.attentionCode as OnboardingAttentionCode)
    ? run.attentionCode as OnboardingAttentionCode
    : 'PREPARATION_NEEDS_ATTENTION';
  return { code, detail: run.attentionDetail };
}

export function createOnboardingReadinessService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? OnboardingReadRepository;
  const now = dependencies.now ?? (() => new Date());

  return {
    async get(userId: number): Promise<OnboardingReadinessResponse> {
      const observedAt = now();
      const [disposition, run, evidence, reveals] = await Promise.all([
        repository.getDisposition(userId),
        repository.getLatestRun(userId),
        repository.getProductEvidence(userId),
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
          purpose: 'ONBOARDING',
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
        readiness: featureReadiness(evidence, importChecked, indexChecked, analysisChecked),
        actions: allowedActions(state, attention?.code ?? null),
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
