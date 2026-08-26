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
import {
  AccountImportAccountNotFoundError,
  AccountImportActiveRunError,
  AccountImportRepository,
  type AccountImportRepository as AccountImportRepositoryBoundary,
} from '../account-imports/account-import.repository.prisma';
import { canonicalizeAccountImportScope } from '../account-imports/account-import.scope';
import type { StoredAccountImportRun } from '../account-imports/account-import.types';
import {
  PreparationRepository,
  type PreparationRepository as PreparationRepositoryBoundary,
} from '../preparation/preparation.repository.prisma';
import {
  createPreparationReconciler,
  type PreparationReconciler,
} from '../preparation/preparation-reconciler.service';
import type {
  CreatePreparationRunInput,
  PreparationScopeSnapshot,
} from '../preparation/preparation.types';
import {
  OnboardingCommandRepository,
  type OnboardingCommandRepository as OnboardingCommandRepositoryBoundary,
  type OnboardingCommandRunRecord,
  type OnboardingCommandTargetRecord,
} from './onboarding-command.repository.prisma';

const RECIPE_VERSION = 1;
const IMPORT_PRIORITY = 100;
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

interface Dependencies {
  repository?: OnboardingCommandRepositoryBoundary;
  preparationRepository?: PreparationRepositoryBoundary;
  accountImportRepository?: AccountImportRepositoryBoundary;
  reconciler?: PreparationReconciler;
  now?: () => Date;
}

interface ImportRequest {
  accountId: number;
  mode: DurableAccountImportMode;
  scope: AccountImportScope;
  requestedFrom: Date;
  requestedTo: Date;
  retryOfImportRunId?: number | null;
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
  const preparationRepository = dependencies.preparationRepository ?? PreparationRepository;
  const accountImportRepository = dependencies.accountImportRepository ?? AccountImportRepository;
  const reconciler = dependencies.reconciler ?? createPreparationReconciler();
  const now = dependencies.now ?? (() => new Date());

  async function getRun(userId: number, runId: number): Promise<OnboardingCommandRunRecord> {
    const run = await repository.getRun(userId, runId);
    if (!run) throw new OnboardingCommandNotFoundError();
    return run;
  }

  async function ensureImport(userId: number, request: ImportRequest): Promise<StoredAccountImportRun> {
    const canonical = canonicalizeAccountImportScope(request.scope);
    const matches = (run: StoredAccountImportRun) => (
      run.accountId === request.accountId
      && run.mode === request.mode
      && run.source === 'ONBOARDING'
      && run.scopeHash === canonical.scopeHash
      && sameDate(run.requestedFrom, request.requestedFrom)
      && sameDate(run.requestedTo, request.requestedTo)
      && run.retryOfImportRunId === (request.retryOfImportRunId ?? null)
    );

    const active = await accountImportRepository.getActiveRunForAccount(userId, request.accountId);
    if (active) {
      if (matches(active)) return active;
      throw new OnboardingCommandImportActiveError(active.id);
    }

    try {
      return await accountImportRepository.createRun({
        userId,
        accountId: request.accountId,
        mode: request.mode,
        source: 'ONBOARDING',
        scope: canonical.scope,
        requestedFrom: request.requestedFrom,
        requestedTo: request.requestedTo,
        priority: IMPORT_PRIORITY,
        retryOfImportRunId: request.retryOfImportRunId ?? null,
      });
    } catch (error) {
      if (error instanceof AccountImportAccountNotFoundError) {
        throw new OnboardingCommandAccountNotFoundError();
      }
      if (!(error instanceof AccountImportActiveRunError)) throw error;
      const raced = await accountImportRepository.getActiveRunForAccount(userId, request.accountId);
      if (raced && matches(raced)) return raced;
      throw new OnboardingCommandImportActiveError(error.activeImportRunId);
    }
  }

  async function createPreparation(
    input: CreatePreparationRunInput,
    equivalent: (run: OnboardingCommandRunRecord) => boolean,
  ): Promise<{ run: OnboardingCommandRunRecord; idempotent: boolean }> {
    const active = await repository.getActiveRun(input.userId);
    if (active) {
      if (equivalent(active)) return { run: active, idempotent: true };
      throw new OnboardingCommandActiveRunError(active.id);
    }

    try {
      const created = await preparationRepository.createRun(input);
      const run = await repository.getRun(input.userId, created.run.id);
      if (!run) throw new Error('Created preparation run could not be reloaded.');
      return { run, idempotent: false };
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;
      const raced = await repository.getActiveRun(input.userId);
      if (raced && equivalent(raced)) return { run: raced, idempotent: true };
      if (raced) throw new OnboardingCommandActiveRunError(raced.id);
      throw error;
    }
  }

  async function start(userId: number, accountId: number): Promise<OnboardingRunCommandResponse> {
    const range = defaultRange(now());
    const active = await repository.getActiveRun(userId);
    if (active) {
      if (isSameSingleAccountRun(active, 'ONBOARDING', accountId)) {
        return runResponse(active, true);
      }
      throw new OnboardingCommandActiveRunError(active.id);
    }

    const importRun = await ensureImport(userId, {
      accountId,
      mode: 'BOUNDED_INITIAL',
      scope: DEFAULT_IMPORT_SCOPE,
      requestedFrom: range.from,
      requestedTo: range.to,
    });
    const preparationScope = canonicalizePreparationScope(DEFAULT_PREPARATION_SCOPE);
    const recipe = defaultRecipe(accountId, range.from, range.to);
    const result = await createPreparation({
      userId,
      purpose: 'ONBOARDING',
      recipeVersion: RECIPE_VERSION,
      recipe,
      targets: [{
        accountId,
        ordinal: 0,
        ...preparationScope,
        requestedFrom: range.from,
        requestedTo: range.to,
        currentImportRunId: importRun.id,
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
    return dispositionResponse(await repository.skip(userId, now()), false);
  }

  async function finish(userId: number, runId: number): Promise<OnboardingDispositionCommandResponse> {
    const current = await repository.getDisposition(userId);
    if (current.disposition === 'COMPLETED') return dispositionResponse(current, true);
    const completed = await repository.finishNoRecentGames(userId, runId, now());
    if (!completed) {
      await getRun(userId, runId);
      throw new OnboardingCommandInvalidStateError(
        'Onboarding can be explicitly finished without prepared games only from NO_RECENT_GAMES attention.',
      );
    }
    return dispositionResponse(completed, false);
  }

  async function pause(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (before.status === 'PAUSE_REQUESTED' || before.status === 'PAUSED') {
      return runResponse(before, true);
    }
    if (!['QUEUED', 'RUNNING', 'NEEDS_ATTENTION'].includes(before.status)) {
      throw invalidControlState('pause', before.status);
    }
    if (!await reconciler.requestPause(userId, runId)) throw invalidControlState('pause', before.status);
    return runResponse(await getRun(userId, runId), false);
  }

  async function resume(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (before.status === 'QUEUED' || before.status === 'RUNNING') return runResponse(before, true);
    if (before.status !== 'PAUSED') throw invalidControlState('resume', before.status);
    if (!await reconciler.resume(userId, runId)) throw invalidControlState('resume', before.status);
    return runResponse(await getRun(userId, runId), false);
  }

  async function cancel(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const before = await getRun(userId, runId);
    if (before.status === 'CANCEL_REQUESTED' || before.status === 'CANCELLED') {
      return runResponse(before, true);
    }
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
    const generation = await reconciler.retry(userId, runId);
    const after = await getRun(userId, runId);
    if (generation === null) {
      if (after.retryGeneration > before.retryGeneration) return runResponse(after, true);
      throw new OnboardingCommandInvalidStateError('No failed preparation evidence is currently eligible for retry.');
    }
    return runResponse(after, false);
  }

  async function restart(userId: number, runId: number): Promise<OnboardingRunCommandResponse> {
    const source = await getRun(userId, runId);
    if (!['FAILED', 'CANCELLED'].includes(source.status)) {
      throw new OnboardingCommandInvalidStateError('Only failed or cancelled preparation can be restarted.');
    }

    const active = await repository.getActiveRun(userId);
    if (active) {
      if (active.purpose === 'RECOVERY' && active.retryOfRunId === source.id) return runResponse(active, true);
      throw new OnboardingCommandActiveRunError(active.id);
    }

    const targets = [] as CreatePreparationRunInput['targets'];
    for (const target of source.targets) {
      const currentImport = target.currentImportRunId === null
        ? null
        : await accountImportRepository.getRun(userId, target.currentImportRunId);
      let importRunId: number | null = target.currentImportRunId;
      if (currentImport?.status === 'FAILED' || currentImport?.status === 'CANCELLED') {
        if (
          currentImport.mode === 'LEGACY_SYNC'
          || currentImport.scope === null
          || currentImport.requestedFrom === null
          || currentImport.requestedTo === null
        ) {
          throw new OnboardingCommandInvalidStateError('Legacy import attempts cannot be restarted as onboarding preparation.');
        }
        const retryImport = await ensureImport(userId, {
          accountId: target.accountId,
          mode: currentImport.mode,
          scope: currentImport.scope,
          requestedFrom: currentImport.requestedFrom,
          requestedTo: currentImport.requestedTo,
          retryOfImportRunId: currentImport.id,
        });
        importRunId = retryImport.id;
      } else if (currentImport && !['COMPLETED'].includes(currentImport.status)) {
        throw new OnboardingCommandImportActiveError(currentImport.id);
      } else if (!currentImport) {
        const scope = toAccountImportScope(target.scope);
        const importRun = await ensureImport(userId, {
          accountId: target.accountId,
          mode: 'BOUNDED_INITIAL',
          scope,
          requestedFrom: target.requestedFrom,
          requestedTo: target.requestedTo,
        });
        importRunId = importRun.id;
      }

      targets.push({
        accountId: target.accountId,
        ordinal: target.ordinal,
        scopeVersion: target.scopeVersion,
        scopeHash: target.scopeHash,
        scope: target.scope,
        requestedFrom: target.requestedFrom,
        requestedTo: target.requestedTo,
        currentImportRunId: importRunId,
      });
    }

    const result = await createPreparation({
      userId,
      purpose: 'RECOVERY',
      recipeVersion: source.recipeVersion,
      recipe: {
        kind: 'ONBOARDING_RECOVERY',
        retryOfRunId: source.id,
        originalRecipe: source.recipe,
      },
      retryOfRunId: source.id,
      retryGeneration: source.retryGeneration,
      targets,
    }, (run) => run.purpose === 'RECOVERY' && run.retryOfRunId === source.id);
    return runResponse(result.run, result.idempotent);
  }

  async function expand(
    userId: number,
    sourceRunId: number,
    body: OnboardingExpandBody,
  ): Promise<OnboardingRunCommandResponse> {
    let source = await getRun(userId, sourceRunId);
    const active = await repository.getActiveRun(userId);
    if (active?.id === source.id && source.status === 'NEEDS_ATTENTION' && source.attentionCode === 'NO_RECENT_GAMES') {
      const retired = await repository.completeNoRecentRunForExpansion(userId, source.id, now());
      if (!retired) {
        source = await getRun(userId, sourceRunId);
        if (source.status !== 'COMPLETED') throw new OnboardingCommandActiveRunError(source.id);
      } else {
        source = await getRun(userId, sourceRunId);
      }
    } else if (active) {
      if (isEquivalentExpansion(active, source.id, body)) return runResponse(active, true);
      throw new OnboardingCommandActiveRunError(active.id);
    }

    const sourceTarget = source.targets.find((target) => target.accountId === body.accountId);
    if (body.kind !== 'ADD_ACCOUNT' && !sourceTarget) {
      throw new OnboardingCommandInvalidStateError('Expansion account is not part of the source preparation run.');
    }

    const expansion = expansionRequest(source, sourceTarget ?? null, body, now());
    const importRun = await ensureImport(userId, expansion.importRequest);
    const scope = canonicalizePreparationScope(expansion.preparationScope);
    const result = await createPreparation({
      userId,
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
      targets: [{
        accountId: body.accountId,
        ordinal: 0,
        ...scope,
        requestedFrom: expansion.importRequest.requestedFrom,
        requestedTo: expansion.importRequest.requestedTo,
        currentImportRunId: importRun.id,
      }],
    }, (run) => isEquivalentExpansion(run, source.id, body));
    return runResponse(result.run, result.idempotent);
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
  const from = shiftUtcCalendarMonths(start, -3);
  const to = new Date(start.getTime() + 24 * 60 * 60_000);
  return { from, to };
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
  source: OnboardingCommandRunRecord,
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
  if (!sourceTarget) throw new OnboardingCommandInvalidStateError('Expansion source target is missing.');

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
  const accountScope = toAccountImportScope(sourceTarget.scope);
  return {
    importRequest: {
      accountId: body.accountId,
      mode: 'HISTORICAL_BACKFILL',
      scope: accountScope,
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
    && recipe?.kind === 'ONBOARDING_EXPANSION'
    && recipe?.sourceRunId === sourceRunId
    && recipe?.expansionKind === body.kind
    && recipe?.accountId === body.accountId;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function sameDate(left: Date | null, right: Date): boolean {
  return left !== null && left.getTime() === right.getTime();
}

function invalidControlState(action: string, status: string): OnboardingCommandInvalidStateError {
  return new OnboardingCommandInvalidStateError(
    `Cannot ${action} onboarding preparation while it is ${status}.`,
  );
}

function isUniqueConstraintViolation(error: unknown): boolean {
  const candidate = error as { code?: unknown; meta?: { code?: unknown }; message?: unknown };
  return candidate?.code === 'P2002'
    || candidate?.meta?.code === '23505'
    || (candidate?.code === 'P2010' && String(candidate?.message ?? '').includes('23505'));
}

export const OnboardingCommandService = createOnboardingCommandService();
