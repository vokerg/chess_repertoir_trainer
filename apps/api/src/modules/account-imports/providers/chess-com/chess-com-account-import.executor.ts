import {
  PlayedGameActivityReconciliationService,
} from '../../../activity-feed/played-game-activity.service';
import type { AccountImportExecutor } from '../../account-import.executor';
import {
  AccountImportRepository,
  type AccountImportRepository as AccountImportRepositoryBoundary,
} from '../../account-import.repository.prisma';
import {
  AccountImportProviderCommitRepository,
  type AccountImportProviderCommitRepository as AccountImportProviderCommitRepositoryBoundary,
} from '../../account-import.provider-commit.repository.prisma';
import type {
  NormalizedAccountImportGame,
  StoredAccountImportCoverage,
} from '../../account-import.types';
import {
  ChessComAccountRepository,
  type ChessComAccountRepository as ChessComAccountRepositoryBoundary,
} from './chess-com-account.repository.prisma';
import {
  ChessComRateLimitError,
  archiveMonthKey,
  chessComGameMatchesImportScope,
  defaultChessComPubApiClient,
  normalizeChessComGame,
  parseChessComArchiveMonth,
  planChessComImportWindows,
  type ChessComImportWindow,
  type ChessComPubApiClient,
} from './chess-com.provider';

const WRITE_BATCH_SIZE = 100;

interface PlayedGameActivityBoundary {
  reconcileCommittedRange(input: {
    userId: number;
    accountId: number;
    from: Date;
    to: Date;
  }): Promise<unknown>;
}

export interface ChessComAccountImportExecutorDependencies {
  repository?: Pick<AccountImportRepositoryBoundary, 'getCoverage'>;
  commitRepository?: AccountImportProviderCommitRepositoryBoundary;
  accountRepository?: ChessComAccountRepositoryBoundary;
  client?: ChessComPubApiClient;
  activity?: PlayedGameActivityBoundary;
  now?: () => number;
}

export function createChessComAccountImportExecutor(
  dependencies: ChessComAccountImportExecutorDependencies = {},
): AccountImportExecutor {
  const repository = dependencies.repository ?? AccountImportRepository;
  const commitRepository = dependencies.commitRepository ?? AccountImportProviderCommitRepository;
  const accountRepository = dependencies.accountRepository ?? ChessComAccountRepository;
  const client = dependencies.client ?? defaultChessComPubApiClient;
  const activity = dependencies.activity ?? PlayedGameActivityReconciliationService;
  const now = dependencies.now ?? Date.now;

  return {
    provider: 'CHESS_COM',

    async execute(run, context) {
      if (!run.scope || !run.requestedFrom || !run.requestedTo || run.mode === 'LEGACY_SYNC') {
        throw new Error('Durable Chess.com import is missing immutable scope or range metadata.');
      }

      const account = await accountRepository.getActiveOwnedAccount(run.userId, run.accountId);
      if (!account) throw new Error('Active owned Chess.com account not found.');

      const windows = planChessComImportWindows({
        username: account.username,
        mode: run.mode,
        requestedFrom: run.requestedFrom,
        requestedTo: run.requestedTo,
      });
      if (run.windowsTotal !== null && run.windowsTotal !== windows.length) {
        throw new Error('Chess.com import window denominator no longer matches the immutable range.');
      }

      const coverage = await repository.getCoverage(run.userId, run.accountId, run.scope);
      const coveredPrefix = countCoveredWindowPrefix(windows, coverage);
      if (run.windowsCompleted > coveredPrefix) {
        throw new Error('Chess.com import checkpoint exceeds proved account coverage.');
      }
      await context.checkpoint({
        windowsTotal: windows.length,
        windowsCompleted: coveredPrefix,
      });
      if (coveredPrefix === windows.length) return { kind: 'COMPLETED' };

      let archives;
      const archiveStartedAt = now();
      try {
        archives = await client.fetchArchives(account.username, context.signal);
      } catch (error) {
        if (error instanceof ChessComRateLimitError) return rateLimitResult(error);
        throw error;
      } finally {
        context.recordStageTiming('DISCOVERY', Math.max(0, now() - archiveStartedAt));
      }

      if (!Array.isArray(archives.archives)) {
        throw new Error('Chess.com archive index did not contain an archives array.');
      }
      const availableMonths = new Set<string>();
      for (const archiveUrl of archives.archives) {
        if (typeof archiveUrl !== 'string') {
          throw new Error('Chess.com archive index contained a non-string archive URL.');
        }
        const archiveMonth = parseChessComArchiveMonth(archiveUrl);
        if (!archiveMonth) {
          throw new Error('Chess.com archive index contained an invalid archive URL.');
        }
        availableMonths.add(archiveMonth.key);
      }

      let completed = coveredPrefix;
      for (const window of windows.slice(coveredPrefix)) {
        const windowStartedAt = now();
        try {
          throwIfAborted(context.signal);
          if (!availableMonths.has(archiveMonthKey(window.year, window.month))) {
            await completeWindow(run, context, commitRepository, window, completed + 1, windows.length, now);
            completed += 1;
            continue;
          }

          let monthlyArchive;
          const providerStartedAt = now();
          try {
            monthlyArchive = await client.fetchMonthlyArchive(
              account.username,
              window.year,
              window.month,
              context.signal,
            );
          } catch (error) {
            if (error instanceof ChessComRateLimitError) return rateLimitResult(error);
            throw error;
          } finally {
            context.recordStageTiming('PROVIDER', Math.max(0, now() - providerStartedAt));
          }

          if (!Array.isArray(monthlyArchive.games)) {
            throw new Error('Chess.com monthly archive did not contain a games array.');
          }
          const providerGames = monthlyArchive.games;
          for (let offset = 0; offset < providerGames.length; offset += WRITE_BATCH_SIZE) {
            throwIfAborted(context.signal);
            const parseStartedAt = now();
            const batch: NormalizedAccountImportGame[] = [];
            let gamesSeen = 0;
            let gamesSkippedOutOfScope = 0;
            let gamesFailed = 0;
            let parseError: unknown = null;
            for (const providerGame of providerGames.slice(offset, offset + WRITE_BATCH_SIZE)) {
              throwIfAborted(context.signal);
              gamesSeen += 1;
              try {
                const normalized = normalizeChessComGame(providerGame, account);
                if (!chessComGameMatchesImportScope(normalized, run.scope, window.from, window.to)) {
                  gamesSkippedOutOfScope += 1;
                  continue;
                }
                batch.push(normalized);
              } catch (error) {
                gamesFailed = 1;
                parseError = error;
                break;
              }
            }
            context.recordStageTiming('PARSE', Math.max(0, now() - parseStartedAt));
            await persistBatch(
              run,
              context.signal,
              context.recordStageTiming,
              commitRepository,
              batch,
              gamesSeen,
              gamesSkippedOutOfScope,
              gamesFailed,
              now,
            );
            if (batch.length > 0) {
              const activityRange = getCommittedBatchActivityRange(batch);
              if (activityRange) {
                await activity.reconcileCommittedRange({
                  userId: run.userId,
                  accountId: run.accountId,
                  ...activityRange,
                });
              }
            }
            if (parseError !== null) throw parseError;
          }

          throwIfAborted(context.signal);
          await completeWindow(
            run,
            context,
            commitRepository,
            window,
            completed + 1,
            windows.length,
            now,
          );
          completed += 1;
        } finally {
          context.recordStageTiming('WINDOW', Math.max(0, now() - windowStartedAt));
        }
      }

      return { kind: 'COMPLETED' };
    },
  };
}

export const ChessComAccountImportExecutor = createChessComAccountImportExecutor();

async function persistBatch(
  run: Parameters<AccountImportExecutor['execute']>[0],
  signal: AbortSignal,
  recordStageTiming: Parameters<AccountImportExecutor['execute']>[1]['recordStageTiming'],
  repository: AccountImportProviderCommitRepositoryBoundary,
  games: NormalizedAccountImportGame[],
  gamesSeenDelta: number,
  gamesSkippedOutOfScopeDelta: number,
  gamesFailedDelta: number,
  now: () => number,
): Promise<void> {
  throwIfAborted(signal);
  const writeStartedAt = now();
  await repository.persistBatch({
    userId: run.userId,
    importRunId: run.id,
    workKey: run.workKey,
    games,
    gamesSeenDelta,
    gamesSkippedOutOfScopeDelta,
    gamesFailedDelta,
  });
  recordStageTiming('WRITE', Math.max(0, now() - writeStartedAt));
  throwIfAborted(signal);
}

async function completeWindow(
  run: Parameters<AccountImportExecutor['execute']>[0],
  context: Parameters<AccountImportExecutor['execute']>[1],
  repository: AccountImportProviderCommitRepositoryBoundary,
  window: ChessComImportWindow,
  windowsCompleted: number,
  windowsTotal: number,
  now: () => number,
): Promise<void> {
  throwIfAborted(context.signal);
  const checkpointStartedAt = now();
  await repository.completeWindow({
    userId: run.userId,
    importRunId: run.id,
    workKey: run.workKey,
    coveredFrom: window.from,
    coveredThrough: window.to,
    windowsTotal,
    windowsCompleted,
    checkpoint: {
      provider: 'CHESS_COM',
      completedMonth: window.key,
      coveredFrom: window.from.toISOString(),
      coveredThrough: window.to.toISOString(),
    },
  });
  context.recordStageTiming('CHECKPOINT', Math.max(0, now() - checkpointStartedAt));
  throwIfAborted(context.signal);
}

function getCommittedBatchActivityRange(
  games: NormalizedAccountImportGame[],
): { from: Date; to: Date } | null {
  const endedAt = games
    .map((game) => game.endedAt)
    .filter((value): value is Date => value instanceof Date && Number.isFinite(value.getTime()));
  if (endedAt.length === 0) return null;
  return {
    from: endedAt.reduce((earliest, value) => value < earliest ? value : earliest),
    to: endedAt.reduce((latest, value) => value > latest ? value : latest),
  };
}

function countCoveredWindowPrefix(
  windows: ChessComImportWindow[],
  coverage: StoredAccountImportCoverage | null,
): number {
  if (!coverage?.coveredFrom || !coverage.coveredThrough) return 0;
  let completed = 0;
  for (const window of windows) {
    if (coverage.coveredFrom <= window.from && coverage.coveredThrough >= window.to) {
      completed += 1;
      continue;
    }
    break;
  }
  return completed;
}

function rateLimitResult(error: ChessComRateLimitError) {
  return {
    kind: 'RETRY_AT' as const,
    retryAt: error.retryAt,
    rateLimitUntil: error.retryAt,
    errorCode: 'CHESS_COM_HTTP_429',
    safeError: 'Chess.com rate limit encountered; retry scheduled.',
  };
}

function throwIfAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error('Chess.com import aborted.');
}
