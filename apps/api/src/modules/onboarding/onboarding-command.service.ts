import { createHash } from 'node:crypto';
import type {
  AccountImportScope,
  DurableAccountImportMode,
} from '@chess-trainer/contracts';
import type {
  OnboardingDispositionCommandResponse,
  OnboardingExpandBody,
  OnboardingRunCommandResponse,
} from '@chess-trainer/contracts/onboarding';
import { AccountImportAdmissionBlockedError } from '../account-imports/account-import-admission.guard';
import {
  AccountImportLifecycleRepository,
  AccountImportInvalidStateError,
  type AccountImportLifecycleRepository as AccountImportLifecycleRepositoryBoundary,
} from '../account-imports/account-import.lifecycle.repository.prisma';
import {
  AccountImportAccountNotFoundError,
  AccountImportActiveRunError,
  AccountImportInvalidRetryError,
  AccountImportRepository,
  AccountImportRunNotFoundError,
  type AccountImportRepository as AccountImportRepositoryBoundary,
} from '../account-imports/account-import.repository.prisma';
import { PreparationAdmissionBlockedError } from '../preparation/preparation-admission.guard';
import {
  createPreparationReconciler,
  type PreparationReconciler,
} from '../preparation/preparation-reconciler.service';
import type { PreparationScopeSnapshot } from '../preparation/preparation.types';
import {
  OnboardingCommandAdmissionRepository,
  OnboardingCommandFirstRunStateChangedError,
  OnboardingCommandSourceStateChangedError,
  type OnboardingCommandAdmissionRepository as OnboardingCommandAdmissionRepositoryBoundary,
  type OnboardingImportAdmissionRequest,
  type OnboardingPreparationAdmissionInput,
  type OnboardingPreparationAdmissionTarget,
} from './onboarding-command-admission.repository.prisma';
import {
  OnboardingCommandRepository,
  type OnboardingCommandRepository as OnboardingCommandRepositoryBoundary,
  type OnboardingCommandRunRecord,
  type OnboardingCommandTargetRecord,
} from './onboarding-command.repository.prisma';
import {
  OnboardingImportAttentionRepository,
  type OnboardingImportAttentionRepository as OnboardingImportAttentionRepositoryBoundary,
} from './onboarding-import-attention.repository.prisma';

const RECIPE_VERSION = 1;
const PREPARATION_SCOPE_VERSION = 1;
const DEFAULT_IMPORT_SCOPE: AccountImportScope = {
  variant: 'STANDARD',
  speeds: ['BLITZ', 'RAPID'],
  rated: 'BOTH',
};
const DEFAULT_PREPARATION_SCOPE: PreparationScopeSnapshot = {
  rated: 'ANY',
  speedCategories: ['BLITZ', 'RAPID'],
  variants: ['STANDARD'],
};
const IMPORT_ATTENTION_BLOCKING_STATUSES = new Set([
  'FAILED',
  'CANCELLED',
  'PAUSED',
  'PAUSE_REQUESTED',
  'CANCEL_REQUESTED',
]);

interface Dependencies {
  repository?: OnboardingCommandRepositoryBoundary;
  admissionRepository?: OnboardingCommandAdmissionRepositoryBoundary;
  accountImportRepository?: Pick<AccountImportRepositoryBoundary, 'getRun'>;
  accountImportLifecycleRepository?: Pick<AccountImportLifecycleRepositoryBoundary, 'resume'>;
  importAttentionRepository?: OnboardingImportAttentionRepositoryBoundary;
  reconciler?: PreparationReconciler;
  now?: () => Date;
}

export type OnboardingCommandServiceBoundary = ReturnType<typeof createOnboardingCommandService>;

interface ImportRequest extends OnboardingImportAdmissionRequest {
  mode: DurableAccountImportMode;
}

export class OnboardingCommandNotFoundError extends Error {
  readonly code = 'ONBOARDING_NOT_FOUND' as const;

  constructor(message = 'Owned onboarding preparation run not found.') {
    super(message);
    this.name = 'OnboardingCommandNotFoundError';
  }
}

export class OnboardingCommandInvalidStateError extends Error {
  readonly code = 'ONBOARDING_INVALID_STATE' as const;

  constructor(message: string) {
    super(message);
    this.name = 'OnboardingCommandInvalidStateError';
  }
}

export class OnboardingCommandActiveRunError extends Error {
  readonly code = 'ONBOARDING_ACTIVE_RUN' as const;

  constructor(public readonly activeRunId: number) {
    super(`Preparation run ${activeRunId} is already active for this user.`);
    this.name = 'OnboardingCommandActiveRunError';
  }
}

export class OnboardingCommandAccountNotFoundError extends Error {
  readonly code = 'ONBOARDING_ACCOUNT_NOT_FOUND' as const;

  constructor() {
    super('Owned external account not found.');
    this.name = 'OnboardingCommandAccountNotFoundError';
  }
}

export class OnboardingCommandImportActiveError extends Error {
  readonly code = 'ONBOARDING_IMPORT_ACTIVE' as const;

  constructor(public readonly activeImportRunId: number) {
    super(`Account import ${activeImportRunId} is already active with a different immutable scope.`);
    this.name = 'OnboardingCommandImportActiveError';
  }
}

export function createOnboardingCommandService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? OnboardingCommandRepository;
  const admissionRepository = dependencies.admissionRepository ?? OnboardingCommandAdmissionRepository;
  const accountImportRepository = dependencies.accountImportRepository ?? AccountImportRepository;
  const accountImportLifecycleRepository = dependencies.accountImportLifecycleRepository
    ?? AccountImportLifecycleRepository;
  const importAttentionRepository = dependencies.importAttentionRepository
    ?? OnboardingImportAttentionRepository;
  const reconciler = dependencies.reconciler ?? createPreparationReconciler();
  const now = dependencies.now ?? (() => new Date());

  async function getRun(userId: number, runId: number): Promise<OnboardingCommandRunRecord> {
    const run = await repository.getRun(userId, runId);
    if (!run) throw new OnboardingCommandNotFoundError();
    return run;
  }

  async function admitPreparation(
    input: OnboardingPreparationAdmissionInput,
    equivalent: (run: OnboardingCommandRunRecord) => boolean,
  ): Promise<{ run: OnboardingCommandRunRecord; idempotent: boolean }> {
    try {
      const admitted = await admissionRepository.admit(input);
      const run = await getRun(input.userId, admitted.runId);
      if (admitted.outcome === 'ACTIVE') {
        if (equivalent(run)) return { run, idempotent: true };
        throw new OnboardingCommandActiveRunError(run.id);
      }
      return { run, idempotent: false };
    } catch (error) {
      if (error instanceof AccountImportAccountNotFoundError) {
        throw new OnboardingCommandAccountNotFoundError();
      }
      if (error instanceof AccountImportAdmissionBlockedError || error instanceof PreparationAdmissionBlockedError) {
        throw new OnboardingCommandInvalidStateError(error.message);
      }
      if (error instanceof AccountImportActiveRunError) {
        throw new OnboardingCommandImportActiveError(error.activeImportRunId);
      }
      if (
        error instanceof AccountImportInvalidRetryError
        || error instanceof AccountImportRunNotFoundError
        || error instanceof OnboardingCommandSourceStateChangedError
        || error instanceof OnboardingCommandFirstRunStateChangedError
      ) {
        throw new OnboardingCommandInvalidStateError(error.message);
      }
      throw error;
    }
  }

  async function start(userId: number, accountId: number): Promise<OnboardingRunCommandResponse> {
    const active = await repository.getActiveRun(userId);
    if (active) {
      if (isSameSingleAccountRun(active, 'ONBOARDING', accountId)) return runResponse(active, true);
      throw new OnboardingCommandActiveRunError(active.id);
    }

    const disposition = await repository.getDisposition(userId);
    if (disposition.disposition === 'COMPLETED') {
      throw new OnboardingCommandInvalidStateError(
        'Completed onboarding uses expansion or recovery commands rather than starting a new first-run preparation.',
      );
    }
    const latest = await repository.getLatestRun(userId);
    if (latest && (latest.status === 'FAILED' || latest.status === 'CANCELLED')) {
      throw new OnboardingCommandInvalidStateError(
        `Preparation run ${latest.id} must be restarted as recovery rather than replaced by a new onboarding run.`,
      );
    }

    const range = defaultRange(now());
    const preparationScope = canonicalizePreparationScope(DEFAULT_PREPARATION_SCOPE);
    const result = await admitPreparation({
      userId,
      requireFirstRunEligible: true,
      preparation: {
        purpose: 'ONBOARDING',
        recipeVersion: RECIPE_VERSION,
        recipe: defaultRecipe(accountId, range.from, range.to),
      },
      targets: [{
        target: {
          accountId,
          ordinal: 0,
          ...preparationScope,
          requestedFrom: range.from,
          requestedTo: range.to,
        },
        importBinding: {
          kind: 'ENSURE',
          request: {
            accountId,
            mode: 'BOUNDED_INITIAL',
            scope: DEFAULT_IMPORT_SCOPE,
            requestedFrom: range.from,
            requestedTo: range.to,
          },
        },
      }],
    }, (run) => isSameSingleAccountRun(run, 'ONBOARDING', accountId));
    return runResponse(result.run, result.idempotent);
  }

  async function skip(userId: number): Promise<OnboardingDispositionCommandResponse> {
    const current = await repository.getDisposition(userId);
    if (current.disposition === 'COMPLETED') {
      throw new OnboardingCommandInvalidStateError('Completed onboarding cannot be skipped.');
    }
    if (current.disposition === 'SKIPPED') return dispositionResponse(current, true);
    const skipped = await repository.skip(userId, now());
    if (skipped.disposition.disposition === 'COMPLETED') {
      throw new OnboardingCommandInvalidStateError('Completed onboarding cannot be skipped.');
    }
    return dispositionResponse(skipped.disposition, !skipped.changed);
  }

  async function finish(userId: number, runId: number): Promise<OnboardingDispositionCommandResponse> {
    // Ownership is part of the command identity, including idempotent replays after completion.
    await getRun(userId, runId);
    const current = await repository.getDisposition(userId);
    if (current.disposition === 'COMPLETED') return dispositionResponse(current, true);
    if (current.disposition === 'SKIPPED') {
      throw new OnboardingCommandInvalidStateError('Skipped onboarding cannot be finished.');
    }
    const completed = await repository.finishWithAttention(userId, runId, now());
    if (!completed) {
      throw new OnboardingCommandInvalidStateError(
        'Onboarding can be explicitly finished only from a server-advertised finishable attention outcome.',
      );
    }
    return dispositionResponse(completed.disposition, !completed.changed);
  }

  async function pause(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (before.status === 'PAUSE_REQUESTED' || before.status === 'PAUSED') return runResponse(before, true);
    if (!['QUEUED', 'RUNNING', 'NEEDS_ATTENTION'].includes(before.status)) {
      throw invalidControlState('pause', before.status);
    }
    if (!await reconciler.requestPause(userId, runId)) throw invalidControlState('pause', before.status);
    return runResponse(await getRun(userId, runId), false);
  }

  async function resume(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (before.status === 'QUEUED' || before.status === 'RUNNING') return runResponse(before, true);

    try {
      if (before.status === 'NEEDS_ATTENTION' && before.attentionCode === 'IMPORT_PAUSED') {
        const resumed = await resumeLinkedPausedImports(userId, before);
        if (!resumed && hasBlockingImportAttention(before)) {
          throw new OnboardingCommandInvalidStateError(
            'No paused linked import is currently eligible to resume.',
          );
        }
        return runResponse(await getRun(userId, runId), !resumed);
      }

      if (before.status !== 'PAUSED') throw invalidControlState('resume', before.status);

      // Resume linked imports before the parent so an admission fence cannot leave
      // the parent RUNNING while its durable import remains paused.
      await resumeLinkedPausedImports(userId, before);
      if (!await reconciler.resume(userId, runId)) throw invalidControlState('resume', before.status);
      return runResponse(await getRun(userId, runId), false);
    } catch (error) {
      if (error instanceof OnboardingCommandInvalidStateError) throw error;
      if (error instanceof AccountImportAdmissionBlockedError || error instanceof AccountImportInvalidStateError) {
        throw new OnboardingCommandInvalidStateError(error.message);
      }
      throw error;
    }
  }

  async function cancel(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (before.status === 'CANCEL_REQUESTED' || before.status === 'CANCELLED') return runResponse(before, true);
    if (!['QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'NEEDS_ATTENTION'].includes(before.status)) {
      throw invalidControlState('cancel', before.status);
    }
    if (!await reconciler.requestCancel(userId, runId)) throw invalidControlState('cancel', before.status);
    return runResponse(await getRun(userId, runId), false);
  }

  async function retry(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (!['RUNNING', 'NEEDS_ATTENTION'].includes(before.status)) {
      throw invalidControlState('retry', before.status);
    }

    if (before.status === 'NEEDS_ATTENTION' && before.attentionCode === 'IMPORT_RETRY_AVAILABLE') {
      try {
        const retried = await importAttentionRepository.retryFailedImports(userId, runId);
        if (!retried) {
          throw new OnboardingCommandInvalidStateError(
            'No failed linked import is currently eligible for retry.',
          );
        }
        return runResponse(await getRun(userId, runId), retried.idempotent);
      } catch (error) {
        if (error instanceof OnboardingCommandInvalidStateError) throw error;
        if (error instanceof AccountImportActiveRunError) {
          throw new OnboardingCommandImportActiveError(error.activeImportRunId);
        }
        if (error instanceof AccountImportAdmissionBlockedError || error instanceof AccountImportInvalidRetryError) {
          throw new OnboardingCommandInvalidStateError(error.message);
        }
        throw error;
      }
    }

    // Once reconciliation has consumed an accepted retry and moved the parent
    // back to RUNNING, retryGeneration is the durable replay marker. Recovery
    // runs inherit the source generation, so only a generation above that
    // baseline proves a retry was accepted on this run itself.
    if (before.status === 'RUNNING' && await hasAcceptedRetryGeneration(userId, before)) {
      return runResponse(before, true);
    }

    try {
      const generation = await reconciler.retry(userId, runId);
      const after = await getRun(userId, runId);
      if (generation === null) {
        if (after.retryGeneration > before.retryGeneration) return runResponse(after, true);
        if (await repository.hasActiveRetryBatch(userId, runId)) return runResponse(after, true);
        throw new OnboardingCommandInvalidStateError(
          'No failed preparation evidence is currently eligible for retry.',
        );
      }
      return runResponse(after, false);
    } catch (error) {
      if (error instanceof OnboardingCommandInvalidStateError) throw error;
      if (error instanceof PreparationAdmissionBlockedError) {
        throw new OnboardingCommandInvalidStateError(error.message);
      }
      throw error;
    }
  }

  async function restart(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const source = await getRun(userId, runId);
    if (!['FAILED', 'CANCELLED'].includes(source.status)) {
      throw new OnboardingCommandInvalidStateError('Only failed or cancelled preparation can be restarted.');
    }

    const previousRecovery = await repository.findRecoveryForSource(userId, source.id);
    if (previousRecovery) return runResponse(previousRecovery, true);

    const active = await repository.getActiveRun(userId);
    if (active) {
      if (active.purpose === 'RECOVERY' && active.retryOfRunId === source.id) return runResponse(active, true);
      throw new OnboardingCommandActiveRunError(active.id);
    }

    const targets: OnboardingPreparationAdmissionTarget[] = [];
    for (const target of source.targets) {
      if (target.accountId === null) {
        throw new OnboardingCommandInvalidStateError(
          'A source preparation account was deleted; restart cannot recreate work for the detached target.',
        );
      }
      const currentImport = target.currentImportRunId === null
        ? null
        : await accountImportRepository.getRun(userId, target.currentImportRunId);
      let importBinding: OnboardingPreparationAdmissionTarget['importBinding'];
      if (currentImport?.status === 'FAILED' || currentImport?.status === 'CANCELLED') {
        if (
          currentImport.mode === 'LEGACY_SYNC'
          || currentImport.scope === null
          || currentImport.requestedFrom === null
          || currentImport.requestedTo === null
        ) {
          throw new OnboardingCommandInvalidStateError('Legacy import attempts cannot be restarted as onboarding preparation.');
        }
        importBinding = {
          kind: 'ENSURE',
          request: {
            accountId: target.accountId,
            mode: currentImport.mode,
            scope: currentImport.scope,
            requestedFrom: currentImport.requestedFrom,
            requestedTo: currentImport.requestedTo,
            retryOfImportRunId: currentImport.id,
          },
        };
      } else if (currentImport && currentImport.status !== 'COMPLETED') {
        throw new OnboardingCommandImportActiveError(currentImport.id);
      } else if (currentImport) {
        importBinding = { kind: 'REUSE', importRunId: currentImport.id };
      } else {
        importBinding = {
          kind: 'ENSURE',
          request: {
            accountId: target.accountId,
            mode: 'BOUNDED_INITIAL',
            scope: toAccountImportScope(target.scope),
            requestedFrom: target.requestedFrom,
            requestedTo: target.requestedTo,
          },
        };
      }

      targets.push({
        target: {
          accountId: target.accountId,
          ordinal: target.ordinal,
          scopeVersion: target.scopeVersion,
          scopeHash: target.scopeHash,
          scope: target.scope,
          requestedFrom: target.requestedFrom,
          requestedTo: target.requestedTo,
        },
        importBinding,
      });
    }

    const result = await admitPreparation({
      userId,
      preparation: {
        purpose: 'RECOVERY',
        recipeVersion: source.recipeVersion,
        recipe: {
          kind: 'ONBOARDING_RECOVERY',
          retryOfRunId: source.id,
          originalRecipe: source.recipe,
        },
        retryOfRunId: source.id,
        retryGeneration: source.retryGeneration,
      },
      targets,
    }, (run) => run.purpose === 'RECOVERY' && run.retryOfRunId === source.id);
    return runResponse(result.run, result.idempotent);
  }

  async function expand(
    userId: number,
    sourceRunId: number,
    body: OnboardingExpandBody,
  ): Promise<OnboardingRunCommandResponse> {
    const previousExpansion = await repository.findExpansion(userId, sourceRunId, body);
    if (previousExpansion) return runResponse(previousExpansion, true);

    const source = await getRun(userId, sourceRunId);
    const active = await repository.getActiveRun(userId);
    const replacesNoRecent = active?.id === source.id
      && source.status === 'NEEDS_ATTENTION'
      && source.attentionCode === 'NO_RECENT_GAMES';
    if (active && !replacesNoRecent) {
      if (isEquivalentExpansion(active, source.id, body)) return runResponse(active, true);
      throw new OnboardingCommandActiveRunError(active.id);
    }
    if (!replacesNoRecent && source.status !== 'COMPLETED') {
      throw new OnboardingCommandInvalidStateError(
        'Expansion requires completed preparation or the active NO_RECENT_GAMES attention outcome.',
      );
    }

    const sourceTarget = source.targets.find((target) => target.accountId === body.accountId);
    if (body.kind !== 'ADD_ACCOUNT' && !sourceTarget) {
      throw new OnboardingCommandInvalidStateError('Expansion account is not part of the source preparation run.');
    }

    const expansion = expansionRequest(sourceTarget ?? null, body, now());
    const scope = canonicalizePreparationScope(expansion.preparationScope);
    const result = await admitPreparation({
      userId,
      preparation: {
        purpose: 'EXPANSION',
        recipeVersion: RECIPE_VERSION,
        recipe: {
          kind: 'ONBOARDING_EXPANSION',
          expansionKind: body.kind,
          sourceRunId: source.id,
          accountId: body.accountId,
          requestedFrom: expansion.importRequest.requestedFrom.toISOString(),
          requestedTo: expansion.importRequest.requestedTo.toISOString(),
          importScope: expansion.importRequest.scope,
        },
      },
      targets: [{
        target: {
          accountId: body.accountId,
          ordinal: 0,
          ...scope,
          requestedFrom: expansion.importRequest.requestedFrom,
          requestedTo: expansion.importRequest.requestedTo,
        },
        importBinding: { kind: 'ENSURE', request: expansion.importRequest },
      }],
      replaceNoRecentRunId: replacesNoRecent ? source.id : null,
    }, (run) => isEquivalentExpansion(run, source.id, body));
    return runResponse(result.run, result.idempotent);
  }

  async function resumeLinkedPausedImports(
    userId: number,
    run: OnboardingCommandRunRecord,
  ): Promise<boolean> {
    let resumed = false;
    for (const target of run.targets) {
      if (target.currentImportRunId === null || target.importStatus !== 'PAUSED') continue;
      const found = await accountImportLifecycleRepository.resume(userId, target.currentImportRunId);
      if (!found) {
        throw new OnboardingCommandInvalidStateError(
          'A linked paused import disappeared while onboarding resume was being applied.',
        );
      }
      resumed = true;
    }
    return resumed;
  }

  async function hasAcceptedRetryGeneration(
    userId: number,
    run: OnboardingCommandRunRecord,
  ): Promise<boolean> {
    if (run.purpose !== 'RECOVERY') return run.retryGeneration > 0;
    if (run.retryOfRunId === null) return false;
    const source = await repository.getRun(userId, run.retryOfRunId);
    return source !== null && run.retryGeneration > source.retryGeneration;
  }

  return { start, skip, finish, pause, resume, cancel, retry, restart, expand };
}

function runResponse(run: OnboardingCommandRunRecord, idempotent: boolean): OnboardingRunCommandResponse {
  return {
    runId: run.id,
    purpose: run.purpose,
    status: run.status,
    retryGeneration: run.retryGeneration,
    idempotent,
  };
}

function dispositionResponse(
  disposition: { disposition: 'PENDING' | 'COMPLETED' | 'SKIPPED'; reason: string | null; changedAt: Date | null },
  idempotent: boolean,
): OnboardingDispositionCommandResponse {
  return {
    disposition: disposition.disposition,
    reason: disposition.reason,
    changedAt: disposition.changedAt?.toISOString() ?? null,
    idempotent,
  };
}

function defaultRange(observedAt: Date): { from: Date; to: Date } {
  const start = new Date(Date.UTC(
    observedAt.getUTCFullYear(),
    observedAt.getUTCMonth(),
    observedAt.getUTCDate(),
  ));
  return {
    from: shiftUtcCalendarMonths(start, -3),
    to: new Date(start.getTime() + 24 * 60 * 60_000),
  };
}

function shiftUtcCalendarMonths(value: Date, months: number): Date {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const anchor = new Date(Date.UTC(year, month + months, 1));
  const lastDay = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), Math.min(day, lastDay)));
}

function defaultRecipe(accountId: number, requestedFrom: Date, requestedTo: Date) {
  return {
    kind: 'DEFAULT_ONBOARDING',
    accountId,
    dateRange: {
      requestedFrom: requestedFrom.toISOString(),
      requestedTo: requestedTo.toISOString(),
      semantics: 'HALF_OPEN_UTC_DERIVED_FROM_INCLUSIVE_DATE_RANGE',
    },
    scope: DEFAULT_IMPORT_SCOPE,
    ordering: 'NEWEST_FIRST',
    indexing: { enabled: true },
    analysis: { enabled: true, blocksCoreReadiness: false },
    aiReview: { enabled: false },
    generation: { repertoire: false, course: false },
  };
}

function expansionRequest(
  sourceTarget: OnboardingCommandTargetRecord | null,
  body: OnboardingExpandBody,
  observedAt: Date,
): { importRequest: ImportRequest; preparationScope: PreparationScopeSnapshot } {
  if (body.kind === 'ADD_ACCOUNT') {
    const range = defaultRange(observedAt);
    return {
      importRequest: {
        accountId: body.accountId,
        mode: 'BOUNDED_INITIAL',
        scope: DEFAULT_IMPORT_SCOPE,
        requestedFrom: range.from,
        requestedTo: range.to,
      },
      preparationScope: DEFAULT_PREPARATION_SCOPE,
    };
  }
  if (!sourceTarget || sourceTarget.accountId === null) {
    throw new OnboardingCommandInvalidStateError('Expansion source target is missing or detached.');
  }

  if (body.kind === 'INCLUDE_BULLET') {
    return {
      importRequest: {
        accountId: body.accountId,
        mode: 'BOUNDED_INITIAL',
        scope: { variant: 'STANDARD', speeds: ['BULLET'], rated: toImportRated(sourceTarget.scope.rated) },
        requestedFrom: sourceTarget.requestedFrom,
        requestedTo: sourceTarget.requestedTo,
      },
      preparationScope: {
        rated: sourceTarget.scope.rated ?? 'ANY',
        speedCategories: ['BULLET'],
        variants: ['STANDARD'],
      },
    };
  }

  const requestedTo = sourceTarget.requestedFrom;
  const requestedFrom = shiftUtcCalendarMonths(requestedTo, -3);
  return {
    importRequest: {
      accountId: body.accountId,
      mode: 'HISTORICAL_BACKFILL',
      scope: toAccountImportScope(sourceTarget.scope),
      requestedFrom,
      requestedTo,
    },
    preparationScope: sourceTarget.scope,
  };
}

function canonicalizePreparationScope(scope: PreparationScopeSnapshot) {
  const canonical: PreparationScopeSnapshot = {
    ...(scope.rated === undefined ? {} : { rated: scope.rated }),
    speedCategories: [...(scope.speedCategories ?? [])],
    variants: [...(scope.variants ?? [])],
  };
  const serialized = JSON.stringify({ scopeVersion: PREPARATION_SCOPE_VERSION, ...canonical });
  return {
    scopeVersion: PREPARATION_SCOPE_VERSION,
    scopeHash: createHash('sha256').update(serialized).digest('hex'),
    scope: canonical,
  };
}

function toAccountImportScope(scope: PreparationScopeSnapshot): AccountImportScope {
  const speeds = (scope.speedCategories ?? [])
    .map((speed) => speed.toUpperCase())
    .filter((speed): speed is 'BULLET' | 'BLITZ' | 'RAPID' => (
      speed === 'BULLET' || speed === 'BLITZ' || speed === 'RAPID'
    ));
  if (speeds.length === 0) {
    throw new OnboardingCommandInvalidStateError('Preparation scope has no importable speed categories.');
  }
  return {
    variant: 'STANDARD',
    speeds: [...new Set(speeds)],
    rated: toImportRated(scope.rated),
  };
}

function toImportRated(rated: PreparationScopeSnapshot['rated']): AccountImportScope['rated'] {
  if (rated === 'RATED' || rated === 'UNRATED') return rated;
  return 'BOTH';
}

function isSameSingleAccountRun(
  run: OnboardingCommandRunRecord,
  purpose: OnboardingCommandRunRecord['purpose'],
  accountId: number,
): boolean {
  return run.purpose === purpose
    && run.targets.length === 1
    && run.targets[0]?.accountId === accountId;
}

function isEquivalentExpansion(
  run: OnboardingCommandRunRecord,
  sourceRunId: number,
  body: OnboardingExpandBody,
): boolean {
  const recipe = asRecord(run.recipe);
  return run.purpose === 'EXPANSION'
    && recipe?.['kind'] === 'ONBOARDING_EXPANSION'
    && recipe?.['sourceRunId'] === sourceRunId
    && recipe?.['expansionKind'] === body.kind
    && recipe?.['accountId'] === body.accountId;
}

function hasBlockingImportAttention(run: OnboardingCommandRunRecord): boolean {
  return run.targets.some((target) => (
    target.importStatus !== null && IMPORT_ATTENTION_BLOCKING_STATUSES.has(target.importStatus)
  ));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function invalidControlState(action: string, status: string): OnboardingCommandInvalidStateError {
  return new OnboardingCommandInvalidStateError(
    `Cannot ${action} onboarding preparation while it is ${status}.`,
  );
}

export const OnboardingCommandService = createOnboardingCommandService();
