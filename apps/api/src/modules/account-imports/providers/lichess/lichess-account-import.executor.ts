import prisma from '../../../../prisma';
import {
  PlayedGameActivityReconciliationService,
} from '../../../activity-feed/played-game-activity.service';
import {
  AccountImportProviderCommitRepository,
  type AccountImportProviderCommitRepository as AccountImportProviderCommitRepositoryBoundary,
} from '../../account-import.provider-commit.repository.prisma';
import {
  AccountImportRepository,
  type AccountImportRepository as AccountImportRepositoryBoundary,
} from '../../account-import.repository.prisma';
import type {
  AccountImportExecutionContext,
  AccountImportExecutionResult,
  AccountImportExecutor,
} from '../../account-import.executor';
import type {
  NormalizedAccountImportGame,
  StoredAccountImportCoverage,
  StoredAccountImportRun,
} from '../../account-import.types';
import {
  LICHESS_RATE_LIMIT_COOLDOWN_MS,
  loadLichessAccountImportConfig,
  type LichessAccountImportConfig,
} from './lichess-account-import.config';
import {
  LichessNdjsonRecordError,
  buildLichessGamesRequestUrl,
  canExtendCoverageWithLichessWindow,
  isLichessImportWindowCovered,
  matchesLichessImportScope,
  normalizeLichessGame,
  planLichessImportWindows,
  readLichessNdjson,
  type LichessImportWindow,
} from './lichess-account-import';

const CHECKPOINT_VERSION = 1 as const;
const PROVIDER = 'LICHESS' as const;

interface LichessImportCheckpointV1 {
  version: typeof CHECKPOINT_VERSION;
  provider: typeof PROVIDER;
  windowDays: number;
  currentWindow: {
    index: number;
    from: string;
    to: string;
  } | null;
}

interface LichessAccountImportExecutorDependencies {
  repository?: Pick<AccountImportRepositoryBoundary, 'getCoverage'>;
  commitRepository?: Pick<
    AccountImportProviderCommitRepositoryBoundary,
    'initializePlan' | 'persistBatch' | 'completeWindow'
  >;
  fetch?: typeof fetch;
  now?: () => number;
  config?: LichessAccountImportConfig;
  baseUrl?: string;
  loadAccount?: (userId: number, accountId: number) => Promise<{ username: string } | null>;
  reconcileCommittedRange?: typeof PlayedGameActivityReconciliationService.reconcileCommittedRange;
}

export function createLichessAccountImportExecutor(
  dependencies: LichessAccountImportExecutorDependencies = {},
): AccountImportExecutor {
  const repository = dependencies.repository ?? AccountImportRepository;
  const commitRepository = dependencies.commitRepository ?? AccountImportProviderCommitRepository;
  const fetchImpl = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const config = dependencies.config ?? loadLichessAccountImportConfig();
  const loadAccount = dependencies.loadAccount ?? defaultLoadAccount;
  const reconcileCommittedRange = dependencies.reconcileCommittedRange
    ?? PlayedGameActivityReconciliationService.reconcileCommittedRange;

  return {
    provider: PROVIDER,
    async execute(run, context) {
      const durable = requireDurableRun(run);
      const account = await loadAccount(run.userId, run.accountId);
      if (!account) {
        return {
          kind: 'FAILED',
          errorCode: 'LICHESS_ACCOUNT_UNAVAILABLE',
          safeError: 'Active Lichess account is unavailable for durable import.',
        };
      }

      const previousCheckpoint = parseCheckpoint(run.checkpoint);
      const windowDays = previousCheckpoint?.windowDays ?? config.windowDays;
      const windows = planLichessImportWindows({
        requestedFrom: durable.requestedFrom,
        requestedTo: durable.requestedTo,
        mode: durable.mode,
        windowDays,
      });
      validateCheckpointAgainstPlan(previousCheckpoint, windows);
      if (run.windowsTotal !== null && run.windowsTotal !== windows.length) {
        throw new Error('Lichess import window plan does not match the persisted denominator.');
      }

      let coverage = await repository.getCoverage(run.userId, run.accountId, durable.scope);
      let completed = countCoveredWindows(windows, coverage);
      if (completed < run.windowsCompleted) {
        throw new Error('Lichess import completed-window progress exceeds proved coverage.');
      }
      await initializePlan(
        run,
        context,
        commitRepository,
        windows.length,
        completed,
        checkpoint(windowDays, null),
        now,
      );
      if (completed === windows.length) return { kind: 'COMPLETED' };

      while (completed < windows.length) {
        throwIfAborted(context.signal);
        const next = selectNextWindow(windows, coverage);
        if (!next) {
          throw new Error('Lichess import coverage cannot be extended contiguously for the requested range.');
        }

        const windowIndex = windows.indexOf(next);
        const activeCheckpoint = checkpoint(windowDays, next, windowIndex);
        const windowStartedAt = now();
        try {
          await initializePlan(
            run,
            context,
            commitRepository,
            windows.length,
            completed,
            activeCheckpoint,
            now,
          );

          const outcome = await executeWindow({
            run,
            durable,
            accountUsername: account.username,
            window: next,
            windowIndex,
            windowDays,
            commitRepository,
            context,
            fetchImpl,
            now,
            config,
            baseUrl: dependencies.baseUrl,
            reconcileCommittedRange,
          });
          if (outcome) return outcome;
          throwIfAborted(context.signal);

          const checkpointStartedAt = now();
          await commitRepository.completeWindow({
            userId: run.userId,
            importRunId: run.id,
            workKey: durable.workKey,
            coveredFrom: next.from,
            coveredThrough: next.to,
            windowsTotal: windows.length,
            windowsCompleted: completed + 1,
            checkpoint: checkpoint(windowDays, null),
          });
          context.recordStageTiming('CHECKPOINT', Math.max(0, now() - checkpointStartedAt));
          throwIfAborted(context.signal);

          coverage = await repository.getCoverage(run.userId, run.accountId, durable.scope);
          completed = countCoveredWindows(windows, coverage);
          if (completed < windowIndex + 1 && !isLichessImportWindowCovered(next, coverage)) {
            throw new Error('Lichess import window completion did not produce proved coverage.');
          }
        } finally {
          context.recordStageTiming('WINDOW', Math.max(0, now() - windowStartedAt));
        }
      }

      return { kind: 'COMPLETED' };
    },
  };
}

async function initializePlan(
  run: Parameters<AccountImportExecutor['execute']>[0],
  context: AccountImportExecutionContext,
  repository: Pick<AccountImportProviderCommitRepositoryBoundary, 'initializePlan'>,
  windowsTotal: number,
  windowsCompleted: number,
  checkpointValue: LichessImportCheckpointV1,
  now: () => number,
): Promise<void> {
  throwIfAborted(context.signal);
  const startedAt = now();
  await repository.initializePlan({
    userId: run.userId,
    importRunId: run.id,
    workKey: run.workKey,
    windowsTotal,
    windowsCompleted,
    checkpoint: checkpointValue,
  });
  context.recordStageTiming('CHECKPOINT', Math.max(0, now() - startedAt));
  throwIfAborted(context.signal);
}

interface ExecuteWindowInput {
  run: StoredAccountImportRun & { workKey: string };
  durable: DurableRun;
  accountUsername: string;
  window: LichessImportWindow;
  windowIndex: number;
  windowDays: number;
  commitRepository: Pick<AccountImportProviderCommitRepositoryBoundary, 'persistBatch'>;
  context: AccountImportExecutionContext;
  fetchImpl: typeof fetch;
  now: () => number;
  config: LichessAccountImportConfig;
  baseUrl?: string;
  reconcileCommittedRange: typeof PlayedGameActivityReconciliationService.reconcileCommittedRange;
}

async function executeWindow(input: ExecuteWindowInput): Promise<AccountImportExecutionResult | null> {
  const url = buildLichessGamesRequestUrl({
    username: input.accountUsername,
    window: input.window,
    scope: input.durable.scope,
    mode: input.durable.mode,
    baseUrl: input.baseUrl,
  });
  const requestStartedAt = input.now();
  let response: Response;
  let providerMs = 0;
  try {
    response = await input.fetchImpl(url, {
      headers: { Accept: 'application/x-ndjson' },
      signal: input.context.signal,
    });
    providerMs = Math.max(0, input.now() - requestStartedAt);
  } catch (error) {
    providerMs = Math.max(0, input.now() - requestStartedAt);
    input.context.recordStageTiming('PROVIDER', providerMs);
    throw error;
  }
  throwIfAborted(input.context.signal);
  let parseMs = 0;
  let writeMs = 0;

  if (response.status === 429) {
    input.context.recordStageTiming('PROVIDER', providerMs);
    await response.body?.cancel().catch(() => undefined);
    throwIfAborted(input.context.signal);
    const retryAt = resolveRateLimitRetryAt(response, input.now());
    return {
      kind: 'RETRY_AT',
      retryAt,
      rateLimitUntil: retryAt,
      errorCode: 'LICHESS_HTTP_429',
      safeError: 'Lichess rate limited the account import.',
    };
  }
  if (!response.ok) {
    input.context.recordStageTiming('PROVIDER', providerMs);
    await response.body?.cancel().catch(() => undefined);
    throwIfAborted(input.context.signal);
    return {
      kind: 'FAILED',
      errorCode: `LICHESS_HTTP_${response.status}`,
      safeError: `Lichess account import request failed with HTTP ${response.status}.`,
    };
  }

  const activeCheckpoint = checkpoint(input.windowDays, input.window, input.windowIndex);
  let games: NormalizedAccountImportGame[] = [];
  let gamesSeenDelta = 0;
  let skippedOutOfScopeDelta = 0;

  const flush = async () => {
    if (games.length === 0 && gamesSeenDelta === 0 && skippedOutOfScopeDelta === 0) return;
    throwIfAborted(input.context.signal);
    const batch = games;
    const seenDelta = gamesSeenDelta;
    const skippedDelta = skippedOutOfScopeDelta;
    const persistStartedAt = input.now();
    await input.commitRepository.persistBatch({
      userId: input.run.userId,
      importRunId: input.run.id,
      workKey: input.durable.workKey,
      scopeHash: input.durable.scopeHash,
      checkpoint: activeCheckpoint,
      games: batch,
      gamesSeenDelta: seenDelta,
      gamesSkippedOutOfScopeDelta: skippedDelta,
      gamesFailedDelta: 0,
    });
    writeMs += Math.max(0, input.now() - persistStartedAt);
    throwIfAborted(input.context.signal);

    if (batch.length > 0) {
      const reconciliationRange = endedAtRange(batch);
      if (reconciliationRange) {
        const reconciliationStartedAt = input.now();
        await input.reconcileCommittedRange({
          userId: input.run.userId,
          accountId: input.run.accountId,
          ...reconciliationRange,
        });
        writeMs += Math.max(0, input.now() - reconciliationStartedAt);
      }
    }

    games = [];
    gamesSeenDelta = 0;
    skippedOutOfScopeDelta = 0;
  };

  try {
    for await (const game of readLichessNdjson(response, input.context.signal, {
      now: input.now,
      onProviderWaitMs: (durationMs) => { providerMs += durationMs; },
      onParseMs: (durationMs) => { parseMs += durationMs; },
    })) {
      throwIfAborted(input.context.signal);
      gamesSeenDelta += 1;
      const normalizationStartedAt = input.now();
      if (!matchesLichessImportScope(game, input.durable.scope)) {
        skippedOutOfScopeDelta += 1;
      } else {
        games.push(normalizeLichessGame(game, input.accountUsername));
      }
      parseMs += Math.max(0, input.now() - normalizationStartedAt);

      if (
        games.length >= input.config.databaseWriteBatchSize
        || gamesSeenDelta >= input.config.databaseWriteBatchSize
      ) {
        await flush();
      }
    }
    await flush();
  } catch (error) {
    if (error instanceof LichessNdjsonRecordError && !input.context.signal.aborted) {
      await flush();
      const failedStartedAt = input.now();
      await input.commitRepository.persistBatch({
        userId: input.run.userId,
        importRunId: input.run.id,
        workKey: input.durable.workKey,
        scopeHash: input.durable.scopeHash,
        checkpoint: activeCheckpoint,
        games: [],
        gamesSeenDelta: 1,
        gamesSkippedOutOfScopeDelta: 0,
        gamesFailedDelta: 1,
      });
      writeMs += Math.max(0, input.now() - failedStartedAt);
      return {
        kind: 'FAILED',
        errorCode: 'LICHESS_MALFORMED_NDJSON',
        safeError: 'Lichess returned a malformed game record.',
      };
    }
    throw error;
  } finally {
    input.context.recordStageTiming('PROVIDER', providerMs);
    input.context.recordStageTiming('PARSE', parseMs);
    input.context.recordStageTiming('WRITE', writeMs);
  }

  return null;
}

interface DurableRun {
  mode: 'BOUNDED_INITIAL' | 'INCREMENTAL_FORWARD' | 'HISTORICAL_BACKFILL' | 'FULL_HISTORY';
  scope: NonNullable<StoredAccountImportRun['scope']>;
  scopeHash: string;
  requestedFrom: Date;
  requestedTo: Date;
  workKey: string;
}

function requireDurableRun(run: StoredAccountImportRun): DurableRun {
  if (
    run.mode === 'LEGACY_SYNC'
    || run.scope === null
    || run.scopeHash === null
    || run.requestedFrom === null
    || run.requestedTo === null
    || run.workKey === null
  ) {
    throw new Error('Lichess durable import is missing immutable run metadata.');
  }
  return {
    mode: run.mode,
    scope: run.scope,
    scopeHash: run.scopeHash,
    requestedFrom: run.requestedFrom,
    requestedTo: run.requestedTo,
    workKey: run.workKey,
  };
}

function selectNextWindow(
  windows: LichessImportWindow[],
  coverage: StoredAccountImportCoverage | null,
): LichessImportWindow | null {
  const pending = windows.filter((window) => !isLichessImportWindowCovered(window, coverage));
  if (pending.length === 0) return null;
  if (!coverage?.coveredFrom || !coverage.coveredThrough) return pending[0] ?? null;
  return pending.find((window) => canExtendCoverageWithLichessWindow(window, coverage)) ?? null;
}

function countCoveredWindows(
  windows: LichessImportWindow[],
  coverage: StoredAccountImportCoverage | null,
): number {
  return windows.filter((window) => isLichessImportWindowCovered(window, coverage)).length;
}

function checkpoint(
  windowDays: number,
  window: LichessImportWindow | null,
  index?: number,
): LichessImportCheckpointV1 {
  return {
    version: CHECKPOINT_VERSION,
    provider: PROVIDER,
    windowDays,
    currentWindow: window && index !== undefined
      ? { index, from: window.from.toISOString(), to: window.to.toISOString() }
      : null,
  };
}

function parseCheckpoint(value: unknown): LichessImportCheckpointV1 | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error('Lichess import checkpoint is invalid.');
  if (value['version'] !== CHECKPOINT_VERSION || value['provider'] !== PROVIDER) {
    throw new Error('Lichess import checkpoint version is unsupported.');
  }
  const windowDays = value['windowDays'];
  if (!Number.isSafeInteger(windowDays) || (windowDays as number) <= 0) {
    throw new Error('Lichess import checkpoint windowDays is invalid.');
  }

  const current = value['currentWindow'];
  if (current !== null) {
    if (!isRecord(current)) throw new Error('Lichess import checkpoint currentWindow is invalid.');
    const index = current['index'];
    const from = current['from'];
    const to = current['to'];
    if (!Number.isSafeInteger(index) || (index as number) < 0) {
      throw new Error('Lichess import checkpoint currentWindow index is invalid.');
    }
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw new Error('Lichess import checkpoint currentWindow range is invalid.');
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime()) || fromDate >= toDate) {
      throw new Error('Lichess import checkpoint currentWindow range is invalid.');
    }
  }

  return value as unknown as LichessImportCheckpointV1;
}

function validateCheckpointAgainstPlan(
  checkpointValue: LichessImportCheckpointV1 | null,
  windows: LichessImportWindow[],
): void {
  const current = checkpointValue?.currentWindow;
  if (!current) return;
  const planned = windows[current.index];
  if (
    !planned
    || planned.from.toISOString() !== current.from
    || planned.to.toISOString() !== current.to
  ) {
    throw new Error('Lichess import checkpoint currentWindow does not match the persisted window plan.');
  }
}

function endedAtRange(games: NormalizedAccountImportGame[]): { from: Date; to: Date } | null {
  const ended = games
    .map((game) => game.endedAt)
    .filter((value): value is Date => value instanceof Date && Number.isFinite(value.getTime()));
  if (ended.length === 0) return null;
  return {
    from: ended.reduce((earliest, candidate) => candidate < earliest ? candidate : earliest),
    to: ended.reduce((latest, candidate) => candidate > latest ? candidate : latest),
  };
}

function resolveRateLimitRetryAt(response: Response, nowMs: number): Date {
  const minimum = nowMs + LICHESS_RATE_LIMIT_COOLDOWN_MS;
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return new Date(minimum);
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return new Date(Math.max(minimum, nowMs + seconds * 1000));
  }
  const absolute = Date.parse(retryAfter);
  return new Date(Math.max(minimum, Number.isFinite(absolute) ? absolute : minimum));
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new Error('Lichess account import was aborted.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function defaultLoadAccount(
  userId: number,
  accountId: number,
): Promise<{ username: string } | null> {
  return prisma.externalAccount.findFirst({
    where: {
      id: accountId,
      userId,
      provider: PROVIDER,
      isActive: true,
    },
    select: { username: true },
  });
}
