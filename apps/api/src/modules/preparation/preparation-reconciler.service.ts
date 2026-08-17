import type { AccountImportLifecycleRepository } from '../account-imports/account-import.lifecycle.repository.prisma';
import { AccountImportLifecycleRepository as accountImportLifecycleRepository } from '../account-imports/account-import.lifecycle.repository.prisma';
import { JobRunRepository } from '../jobs/job-run.repository.prisma';
import {
  readPreparationConfig,
  type PreparationConfig,
} from './preparation.config';
import {
  PreparationRepository,
  type PreparationRepository as PreparationBatchRepository,
} from './preparation.repository.prisma';
import {
  PreparationReconcilerRepository,
  type PreparationActiveBatchSnapshot,
  type PreparationReconcileClaim,
  type PreparationReconcileSnapshot,
  type PreparationReconcilerRepository as PreparationStateRepository,
  type PreparationTargetSnapshot,
} from './preparation-reconciler.repository.prisma';
import type { PreparationLane, PreparationRunStatus, PreparationStage } from './preparation.types';

const CLAIM_BATCH_LIMIT = 32;
const RECONCILE_ATTENTION_MS = 60_000;
const CHILD_START_WARNING_MS = 30_000;
const INDEX_FIRST_SETTLEMENT_WARNING_MS = 120_000;
const ANALYSIS_FIRST_SETTLEMENT_WARNING_MS = 300_000;

const IMPORT_TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const IMPORT_PAUSABLE_STATUSES = new Set(['QUEUED', 'RUNNING', 'PAUSE_REQUESTED']);
const IMPORT_CANCELLABLE_STATUSES = new Set([
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
]);
const RECOVERABLE_IMPORT_ATTENTION_CODES = new Set([
  'IMPORT_PAUSED',
  'IMPORT_RETRY_AVAILABLE',
]);
const IMPORT_ATTENTION_BLOCKING_STATUSES = new Set([
  'FAILED',
  'CANCELLED',
  'PAUSED',
  'PAUSE_REQUESTED',
  'CANCEL_REQUESTED',
]);

export interface PreparationReconcilerLogger {
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface PreparationJobControl {
  cancelForUser(userId: number, jobRunId: number): Promise<unknown>;
}

export interface PreparationReconcilerDependencies {
  repository?: PreparationStateRepository;
  batchRepository?: PreparationBatchRepository;
  importRepository?: AccountImportLifecycleRepository;
  jobControl?: PreparationJobControl;
  config?: PreparationConfig;
  logger?: PreparationReconcilerLogger;
  now?: () => Date;
}

export interface PreparationReconcileResult {
  claimed: boolean;
  runId?: number;
  status?: PreparationRunStatus;
}

export interface PreparationReconciler {
  run(): Promise<void>;
  requestStop(): void;
  wake(): void;
  reconcileOnce(): Promise<PreparationReconcileResult>;
  requestPause(userId: number, runId: number): Promise<boolean>;
  resume(userId: number, runId: number): Promise<boolean>;
  requestCancel(userId: number, runId: number): Promise<boolean>;
  retry(userId: number, runId: number): Promise<number | null>;
}

export function createPreparationReconciler(
  dependencies: PreparationReconcilerDependencies = {},
): PreparationReconciler {
  const repository = dependencies.repository ?? PreparationReconcilerRepository;
  const batchRepository = dependencies.batchRepository ?? PreparationRepository;
  const importRepository = dependencies.importRepository ?? accountImportLifecycleRepository;
  const jobControl = dependencies.jobControl ?? JobRunRepository;
  const config = dependencies.config ?? readPreparationConfig();
  const logger = dependencies.logger ?? consoleLogger;
  const now = dependencies.now ?? (() => new Date());

  let stopping = false;
  let wakeTimer: ReturnType<typeof setTimeout> | null = null;
  let wakeResolver: (() => void) | null = null;

  const api: PreparationReconciler = {
    async run() {
      stopping = false;
      while (!stopping) {
        let claimedInCycle = 0;
        try {
          for (; claimedInCycle < CLAIM_BATCH_LIMIT && !stopping; claimedInCycle += 1) {
            const result = await api.reconcileOnce();
            if (!result.claimed) break;
          }
        } catch (error) {
          logger.error('Preparation reconciliation cycle failed.', { error: formatError(error) });
        }

        if (stopping) break;
        await waitForWake(claimedInCycle > 0 ? config.reconcileActiveMs : config.reconcileIdleMs);
      }
    },

    requestStop() {
      stopping = true;
      api.wake();
    },

    wake() {
      if (wakeTimer !== null) {
        clearTimeout(wakeTimer);
        wakeTimer = null;
      }
      const resolver = wakeResolver;
      wakeResolver = null;
      resolver?.();
    },

    async reconcileOnce() {
      const startedAt = now();
      const leaseMs = Math.max(
        config.reconcileActiveMs,
        config.reconcileIdleMs,
        config.reconcileDueWarningMs,
      );
      const claim = await repository.claimNextDueRun(
        startedAt,
        new Date(startedAt.getTime() + leaseMs),
      );
      if (!claim) return { claimed: false };

      const lagMs = claim.dueAt === null
        ? 0
        : Math.max(0, startedAt.getTime() - claim.dueAt.getTime());
      const result = await reconcileClaim(claim, lagMs);
      return {
        claimed: true,
        runId: claim.id,
        status: result,
      };
    },

    async requestPause(userId, runId) {
      const changed = await repository.requestPause(userId, runId);
      if (changed) api.wake();
      return changed;
    },

    async resume(userId, runId) {
      const changed = await repository.resume(userId, runId);
      if (!changed) return false;

      const snapshot = await repository.loadSnapshot(runId);
      if (
        snapshot?.run.userId === userId
        && (snapshot.run.status === 'RUNNING' || snapshot.run.status === 'QUEUED')
      ) {
        for (const target of snapshot.targets) {
          if (target.currentImportRunId !== null && target.importStatus === 'PAUSED') {
            await importRepository.resume(userId, target.currentImportRunId);
          }
        }
      }
      api.wake();
      return true;
    },

    async requestCancel(userId, runId) {
      const changed = await repository.requestCancel(userId, runId);
      if (changed) api.wake();
      return changed;
    },

    async retry(userId, runId) {
      const snapshot = await repository.loadSnapshot(runId);
      if (!snapshot || snapshot.run.userId !== userId) return null;
      if (snapshot.run.status !== 'RUNNING' && snapshot.run.status !== 'NEEDS_ATTENTION') {
        return null;
      }

      const retry = pickRetryTarget(snapshot.targets);
      if (!retry) return null;
      const result = await batchRepository.admitNextBatch({
        userId: snapshot.run.userId,
        preparationRunId: snapshot.run.id,
        targetId: retry.target.id,
        stage: retry.stage,
        lane: 'RETRY',
        retryFailed: true,
        startRetryGeneration: true,
      });
      if (result.outcome !== 'CREATED' || result.retryGeneration === undefined) {
        return null;
      }

      logger.info('Preparation retry generation admitted.', {
        runId: snapshot.run.id,
        retryGeneration: result.retryGeneration,
        targetId: retry.target.id,
        stage: retry.stage,
        batchId: result.batchId,
        jobRunId: result.jobRunId,
        taskCount: result.importedGameIds.length,
      });
      api.wake();
      return result.retryGeneration;
    },
  };

  async function waitForWake(delayMs: number): Promise<void> {
    await new Promise<void>((resolve) => {
      wakeResolver = resolve;
      wakeTimer = setTimeout(() => {
        wakeTimer = null;
        wakeResolver = null;
        resolve();
      }, delayMs);
      wakeTimer.unref?.();
    });
  }

  async function reconcileClaim(
    claim: PreparationReconcileClaim,
    lagMs: number,
  ): Promise<PreparationRunStatus | undefined> {
    let snapshot = await repository.loadSnapshot(claim.id);
    if (!snapshot) return undefined;
    if (snapshot.run.status !== claim.status) {
      return snapshot.run.status;
    }

    if (snapshot.run.status === 'NEEDS_ATTENTION') {
      await reconcileImportAttention(snapshot);
      return (await repository.loadSnapshot(claim.id))?.run.status;
    }
    if (snapshot.run.status === 'PAUSE_REQUESTED') {
      await reconcilePause(snapshot);
      return (await repository.loadSnapshot(claim.id))?.run.status;
    }
    if (snapshot.run.status === 'CANCEL_REQUESTED') {
      await reconcileCancellation(snapshot);
      return (await repository.loadSnapshot(claim.id))?.run.status;
    }
    if (snapshot.run.status !== 'QUEUED' && snapshot.run.status !== 'RUNNING') {
      return snapshot.run.status;
    }

    await admitNormalWork(snapshot);
    snapshot = await repository.loadSnapshot(claim.id);
    if (!snapshot) return undefined;
    if (snapshot.run.status !== 'QUEUED' && snapshot.run.status !== 'RUNNING') {
      return snapshot.run.status;
    }

    const decision = decideRunningState(snapshot, lagMs, now());
    const applied = await repository.applyState({
      runId: snapshot.run.id,
      expectedStatus: snapshot.run.status,
      expectedReconcileAfter: snapshot.run.reconcileAfter,
      status: decision.status,
      attentionCode: decision.attentionCode,
      attentionDetail: decision.attentionDetail,
      reconcileAfter: decision.reconcileAfter,
      markFirstImported: decision.markFirstImported,
      markFirstIndexed: decision.markFirstIndexed,
      markFirstAnalysed: decision.markFirstAnalysed,
      markCoreReady: decision.markCoreReady,
      markAnalysisCompleted: decision.markAnalysisCompleted,
      targetMilestones: decision.targetMilestones,
    });

    if (!applied) {
      logger.info('Preparation reconcile lost a lifecycle-state or wake-fence race; persisted state wins.', {
        runId: snapshot.run.id,
        expectedStatus: snapshot.run.status,
      });
    }

    logOperationalTelemetry(snapshot, lagMs, decision.attentionCode, decision.status);
    return applied ? decision.status : (await repository.loadSnapshot(claim.id))?.run.status;
  }

  async function reconcileImportAttention(snapshot: PreparationReconcileSnapshot): Promise<void> {
    if (
      snapshot.run.attentionCode === null
      || !RECOVERABLE_IMPORT_ATTENTION_CODES.has(snapshot.run.attentionCode)
    ) {
      return;
    }

    const resolved = isImportAttentionResolved(snapshot);
    const applied = await repository.applyState({
      runId: snapshot.run.id,
      expectedStatus: 'NEEDS_ATTENTION',
      expectedReconcileAfter: snapshot.run.reconcileAfter,
      status: resolved ? 'RUNNING' : 'NEEDS_ATTENTION',
      attentionCode: resolved ? null : snapshot.run.attentionCode,
      attentionDetail: resolved ? null : snapshot.run.attentionDetail,
      reconcileAfter: resolved
        ? new Date(now().getTime() + config.reconcileActiveMs)
        : null,
      markFirstImported: false,
      markFirstIndexed: false,
      markFirstAnalysed: false,
      markCoreReady: false,
      markAnalysisCompleted: false,
      targetMilestones: [],
    });
    if (!applied || resolved) return;

    // Re-read once after an unresolved attention write. A concurrent import
    // resume/relink either invalidates the wake fence above or persists a new
    // wake after this transaction, so this is only a low-latency recovery path.
    const refreshed = await repository.loadSnapshot(snapshot.run.id);
    if (
      !refreshed
      || refreshed.run.status !== 'NEEDS_ATTENTION'
      || refreshed.run.attentionCode === null
      || !RECOVERABLE_IMPORT_ATTENTION_CODES.has(refreshed.run.attentionCode)
      || !isImportAttentionResolved(refreshed)
    ) {
      return;
    }
    await repository.applyState({
      runId: refreshed.run.id,
      expectedStatus: 'NEEDS_ATTENTION',
      expectedReconcileAfter: refreshed.run.reconcileAfter,
      status: 'RUNNING',
      attentionCode: null,
      attentionDetail: null,
      reconcileAfter: new Date(now().getTime() + config.reconcileActiveMs),
      markFirstImported: false,
      markFirstIndexed: false,
      markFirstAnalysed: false,
      markCoreReady: false,
      markAnalysisCompleted: false,
      targetMilestones: [],
    });
  }

  async function admitNormalWork(snapshot: PreparationReconcileSnapshot): Promise<void> {
    const hasActiveIndex = snapshot.activeBatches.some((batch) => batch.stage === 'INDEX');
    if (!hasActiveIndex) {
      const target = pickIndexTarget(snapshot.targets);
      if (target) {
        await admitBatch(snapshot, target, 'INDEX', target.normalIndexBatches === 0
          ? 'FIRST_INDEX'
          : 'INDEX_CONTINUATION');
      }
    }

    const refreshed = await repository.loadSnapshot(snapshot.run.id);
    if (!refreshed || !['QUEUED', 'RUNNING'].includes(refreshed.run.status)) return;
    const hasActiveAnalysis = refreshed.activeBatches.some((batch) => batch.stage === 'ANALYSIS');
    if (hasActiveAnalysis) return;

    const target = pickAnalysisTarget(refreshed.targets, config);
    if (!target) return;
    const lane = target.normalAnalysisBatches === 0 ? 'FIRST_ANALYSIS' : 'ANALYSIS_TAIL';
    const maxTasks = lane === 'FIRST_ANALYSIS'
      && target.analysisPendingCount < config.firstAnalysisMinIndexed
      ? config.firstAnalysisSmallAccountFallback
      : undefined;
    await admitBatch(refreshed, target, 'ANALYSIS', lane, maxTasks);
  }

  async function admitBatch(
    snapshot: PreparationReconcileSnapshot,
    target: PreparationTargetSnapshot,
    stage: PreparationStage,
    lane: PreparationLane,
    maxTasks?: number,
  ): Promise<void> {
    const result = await batchRepository.admitNextBatch({
      userId: snapshot.run.userId,
      preparationRunId: snapshot.run.id,
      targetId: target.id,
      stage,
      lane,
      ...(maxTasks === undefined ? {} : { maxTasks }),
    });
    if (result.outcome === 'CREATED') {
      logger.info('Preparation batch admitted.', {
        runId: snapshot.run.id,
        targetId: target.id,
        stage,
        lane,
        batchId: result.batchId,
        jobRunId: result.jobRunId,
        taskCount: result.importedGameIds.length,
      });
    }
  }

  async function reconcilePause(snapshot: PreparationReconcileSnapshot): Promise<void> {
    for (const target of snapshot.targets) {
      if (
        target.currentImportRunId !== null
        && target.importStatus !== null
        && IMPORT_PAUSABLE_STATUSES.has(target.importStatus)
      ) {
        await importRepository.requestPause(snapshot.run.userId, target.currentImportRunId);
      }
    }

    const refreshed = await repository.loadSnapshot(snapshot.run.id);
    if (!refreshed || refreshed.run.status !== 'PAUSE_REQUESTED') return;
    const importCanMutate = refreshed.targets.some((target) => (
      target.importWorkKey !== null
      || (target.importStatus !== null
        && !IMPORT_TERMINAL_STATUSES.has(target.importStatus)
        && target.importStatus !== 'PAUSED')
    ));
    const childCanMutate = refreshed.activeBatches.length > 0;

    await repository.applyState({
      runId: refreshed.run.id,
      expectedStatus: 'PAUSE_REQUESTED',
      expectedReconcileAfter: refreshed.run.reconcileAfter,
      status: importCanMutate || childCanMutate ? 'PAUSE_REQUESTED' : 'PAUSED',
      attentionCode: null,
      attentionDetail: null,
      reconcileAfter: importCanMutate || childCanMutate
        ? new Date(now().getTime() + config.reconcileActiveMs)
        : null,
      markFirstImported: false,
      markFirstIndexed: false,
      markFirstAnalysed: false,
      markCoreReady: false,
      markAnalysisCompleted: false,
      targetMilestones: [],
    });
  }

  async function reconcileCancellation(snapshot: PreparationReconcileSnapshot): Promise<void> {
    for (const target of snapshot.targets) {
      if (
        target.currentImportRunId !== null
        && target.importStatus !== null
        && IMPORT_CANCELLABLE_STATUSES.has(target.importStatus)
      ) {
        await importRepository.requestCancel(snapshot.run.userId, target.currentImportRunId);
      }
    }
    for (const batch of snapshot.activeBatches) {
      if (batch.jobRunId !== null) {
        await jobControl.cancelForUser(snapshot.run.userId, batch.jobRunId);
      }
    }

    const refreshed = await repository.loadSnapshot(snapshot.run.id);
    if (!refreshed || refreshed.run.status !== 'CANCEL_REQUESTED') return;
    const importCanMutate = refreshed.targets.some((target) => (
      target.importWorkKey !== null
      || (target.importStatus !== null && !IMPORT_TERMINAL_STATUSES.has(target.importStatus))
    ));
    const childCanMutate = refreshed.activeBatches.length > 0;

    await repository.applyState({
      runId: refreshed.run.id,
      expectedStatus: 'CANCEL_REQUESTED',
      expectedReconcileAfter: refreshed.run.reconcileAfter,
      status: importCanMutate || childCanMutate ? 'CANCEL_REQUESTED' : 'CANCELLED',
      attentionCode: null,
      attentionDetail: null,
      reconcileAfter: importCanMutate || childCanMutate
        ? new Date(now().getTime() + config.reconcileActiveMs)
        : null,
      markFirstImported: false,
      markFirstIndexed: false,
      markFirstAnalysed: false,
      markCoreReady: false,
      markAnalysisCompleted: false,
      targetMilestones: [],
    });
  }

  function decideRunningState(
    snapshot: PreparationReconcileSnapshot,
    lagMs: number,
    observedAt: Date,
  ) {
    const totals = snapshot.targets.reduce((acc, target) => ({
      imported: acc.imported + target.importedCount,
      indexed: acc.indexed + target.indexedCount,
      indexPending: acc.indexPending + target.indexPendingCount,
      indexFailed: acc.indexFailed + target.indexFailedCount,
      analysed: acc.analysed + target.analysedCount,
      analysisPending: acc.analysisPending + target.analysisPendingCount,
      analysisRunning: acc.analysisRunning + target.analysisRunningCount,
      analysisFailed: acc.analysisFailed + target.analysisFailedCount,
    }), {
      imported: 0,
      indexed: 0,
      indexPending: 0,
      indexFailed: 0,
      analysed: 0,
      analysisPending: 0,
      analysisRunning: 0,
      analysisFailed: 0,
    });

    const activeIndex = snapshot.activeBatches.some((batch) => batch.stage === 'INDEX');
    const activeAnalysis = snapshot.activeBatches.some((batch) => batch.stage === 'ANALYSIS');
    const importsCompleted = snapshot.targets.length > 0
      && snapshot.targets.every((target) => target.importStatus === 'COMPLETED');
    const importFailure = snapshot.targets.find((target) => (
      target.importStatus === 'FAILED' || target.importStatus === 'CANCELLED' || target.importStatus === 'PAUSED'
    ));
    const coreReady = importsCompleted
      && !activeIndex
      && totals.indexPending === 0
      && totals.indexed > 0;
    const analysisTerminal = coreReady
      && !activeAnalysis
      && totals.analysisPending === 0
      && totals.analysisRunning === 0;

    let status: PreparationRunStatus = 'RUNNING';
    let deterministicAttention: { code: string; detail: string } | null = null;
    if (importsCompleted && !activeIndex && totals.imported === 0) {
      deterministicAttention = {
        code: 'NO_RECENT_GAMES',
        detail: 'The requested import scope completed without eligible games.',
      };
    } else if (
      importsCompleted
      && !activeIndex
      && totals.imported > 0
      && totals.indexPending === 0
      && totals.indexed === 0
      && totals.indexFailed > 0
    ) {
      deterministicAttention = {
        code: 'ALL_INDEXING_FAILED',
        detail: 'Every eligible imported game has a terminal indexing failure.',
      };
    } else if (importFailure && !activeIndex && totals.indexPending === 0) {
      deterministicAttention = {
        code: importFailure.importStatus === 'PAUSED' ? 'IMPORT_PAUSED' : 'IMPORT_RETRY_AVAILABLE',
        detail: `Linked import is ${importFailure.importStatus?.toLowerCase()}.`,
      };
    }

    if (deterministicAttention) {
      status = 'NEEDS_ATTENTION';
    } else if (analysisTerminal) {
      status = 'COMPLETED';
    }

    const operational = deterministicAttention || status !== 'RUNNING'
      ? null
      : selectOperationalAttention(snapshot.activeBatches, lagMs, observedAt, config);
    const partialAttention = totals.indexFailed > 0 && totals.indexed > 0
      ? {
          code: 'INDEXING_PARTIAL',
          detail: `${totals.indexFailed} eligible game(s) have terminal indexing failures.`,
        }
      : totals.analysisFailed > 0
        ? {
            code: 'ANALYSIS_PARTIAL',
            detail: `${totals.analysisFailed} indexed game(s) have terminal analysis failures.`,
          }
        : null;
    const attention = deterministicAttention ?? operational ?? partialAttention;
    const recoverableImportAttention = deterministicAttention !== null
      && RECOVERABLE_IMPORT_ATTENTION_CODES.has(deterministicAttention.code);

    return {
      status,
      attentionCode: attention?.code ?? null,
      attentionDetail: attention?.detail ?? null,
      reconcileAfter: status === 'RUNNING'
        ? new Date(observedAt.getTime() + config.reconcileActiveMs)
        : recoverableImportAttention
          ? new Date(observedAt.getTime() + config.reconcileIdleMs)
          : null,
      markFirstImported: totals.imported > 0,
      markFirstIndexed: totals.indexed > 0,
      markFirstAnalysed: totals.analysed > 0,
      markCoreReady: coreReady,
      markAnalysisCompleted: analysisTerminal,
      targetMilestones: snapshot.targets.map((target) => ({
        targetId: target.id,
        firstImported: target.importedCount > 0,
        firstIndexed: target.indexedCount > 0,
        firstAnalysed: target.analysedCount > 0,
        coreReady: target.importStatus === 'COMPLETED'
          && !snapshot.activeBatches.some((batch) => batch.stage === 'INDEX' && batch.targetId === target.id)
          && target.indexPendingCount === 0
          && target.indexedCount > 0,
      })),
    };
  }

  function logOperationalTelemetry(
    snapshot: PreparationReconcileSnapshot,
    lagMs: number,
    attentionCode: string | null,
    decisionStatus: PreparationRunStatus,
  ): void {
    const details = {
      runId: snapshot.run.id,
      reconcileLagMs: lagMs,
      activeBatchCount: snapshot.activeBatches.length,
      batchCount: snapshot.telemetry.batchCount,
      maxQueueWaitMs: snapshot.telemetry.maxQueueWaitMs,
      maxFirstSettlementMs: snapshot.telemetry.maxFirstSettlementMs,
      maxTotalSettlementMs: snapshot.telemetry.maxTotalSettlementMs,
      attentionCode,
      decisionStatus,
    };
    if (attentionCode !== null || lagMs >= config.reconcileDueWarningMs) {
      logger.warn('Preparation reconciliation telemetry warning.', details);
    } else {
      logger.info('Preparation reconciliation telemetry.', details);
    }
  }

  return api;
}

export function pickIndexTarget(targets: PreparationTargetSnapshot[]): PreparationTargetSnapshot | null {
  return [...targets]
    .filter((target) => target.indexPendingCount > 0)
    .sort((left, right) => (
      left.normalIndexBatches - right.normalIndexBatches
      || left.ordinal - right.ordinal
      || left.id - right.id
    ))[0] ?? null;
}

export function pickAnalysisTarget(
  targets: PreparationTargetSnapshot[],
  config: Pick<PreparationConfig, 'firstAnalysisMinIndexed'>,
): PreparationTargetSnapshot | null {
  return [...targets]
    .filter((target) => {
      if (target.analysisPendingCount <= 0) return false;
      if (target.normalAnalysisBatches > 0) return true;
      if (target.analysisPendingCount >= config.firstAnalysisMinIndexed) return true;
      return target.importStatus === 'COMPLETED' && target.indexPendingCount === 0;
    })
    .sort((left, right) => (
      left.normalAnalysisBatches - right.normalAnalysisBatches
      || left.ordinal - right.ordinal
      || left.id - right.id
    ))[0] ?? null;
}

export function selectOperationalAttention(
  activeBatches: PreparationActiveBatchSnapshot[],
  lagMs: number,
  observedAt: Date,
  config: Pick<PreparationConfig, 'reconcileDueWarningMs'>,
): { code: string; detail: string } | null {
  if (lagMs >= RECONCILE_ATTENTION_MS) {
    return {
      code: 'RECONCILE_DUE_CRITICAL',
      detail: `Preparation reconciliation was due ${Math.floor(lagMs / 1000)} seconds ago.`,
    };
  }
  if (lagMs >= config.reconcileDueWarningMs) {
    return {
      code: 'RECONCILE_DUE_WARNING',
      detail: `Preparation reconciliation was due ${Math.floor(lagMs / 1000)} seconds ago.`,
    };
  }

  for (const batch of activeBatches) {
    const createdAgeMs = observedAt.getTime() - batch.createdAt.getTime();
    if (batch.startedAt === null) {
      if (
        createdAgeMs >= CHILD_START_WARNING_MS
        && batch.workerCapacityAvailable
        && !batch.higherPriorityRunnable
      ) {
        return {
          code: 'PREPARATION_TASK_START_DELAY',
          detail: `${batch.stage.toLowerCase()} batch ${batch.id} has waited ${Math.floor(createdAgeMs / 1000)} seconds to start.`,
        };
      }
      continue;
    }
    if (batch.firstSettledAt !== null) continue;
    const runningAgeMs = observedAt.getTime() - batch.startedAt.getTime();
    const threshold = batch.stage === 'INDEX'
      ? INDEX_FIRST_SETTLEMENT_WARNING_MS
      : ANALYSIS_FIRST_SETTLEMENT_WARNING_MS;
    if (runningAgeMs >= threshold) {
      return {
        code: batch.stage === 'INDEX'
          ? 'INDEX_NO_SETTLEMENT_WARNING'
          : 'ANALYSIS_NO_SETTLEMENT_WARNING',
        detail: `${batch.stage.toLowerCase()} batch ${batch.id} has no settled task after ${Math.floor(runningAgeMs / 1000)} seconds.`,
      };
    }
  }
  return null;
}

function pickRetryTarget(
  targets: PreparationTargetSnapshot[],
): { target: PreparationTargetSnapshot; stage: PreparationStage } | null {
  const indexTarget = [...targets]
    .filter((target) => target.indexFailedCount > 0)
    .sort((left, right) => (
      left.normalIndexBatches - right.normalIndexBatches
      || left.ordinal - right.ordinal
      || left.id - right.id
    ))[0];
  if (indexTarget) return { target: indexTarget, stage: 'INDEX' };

  const analysisTarget = [...targets]
    .filter((target) => target.analysisFailedCount > 0)
    .sort((left, right) => (
      left.normalAnalysisBatches - right.normalAnalysisBatches
      || left.ordinal - right.ordinal
      || left.id - right.id
    ))[0];
  return analysisTarget ? { target: analysisTarget, stage: 'ANALYSIS' } : null;
}

function isImportAttentionResolved(snapshot: PreparationReconcileSnapshot): boolean {
  return snapshot.targets.length > 0 && snapshot.targets.every((target) => (
    target.currentImportRunId !== null
    && target.importStatus !== null
    && !IMPORT_ATTENTION_BLOCKING_STATUSES.has(target.importStatus)
  ));
}

const consoleLogger: PreparationReconcilerLogger = {
  info(message, details) {
    console.info(message, details ?? {});
  },
  warn(message, details) {
    console.warn(message, details ?? {});
  },
  error(message, details) {
    console.error(message, details ?? {});
  },
};

function formatError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
