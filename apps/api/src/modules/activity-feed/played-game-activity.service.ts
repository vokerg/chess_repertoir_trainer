import type { ActivityAggregateRecord } from './activity-feed.types';
import {
  ActivityFeedRepository,
  type ActivityFeedTransaction,
} from './activity-feed.repository.prisma';
import {
  ActivityFeedService,
  dateOnlyInTimeZone,
} from './activity-feed.service';
import {
  PlayedGameActivityRepository,
  type PlayedGameDaySummary,
  type PlayedGameHistoryBounds,
} from './played-game-activity.repository.prisma';
import { assertDataLifecycleWriteAllowed } from '../data-lifecycle/data-lifecycle.guard';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const PLAYED_GAME_RECONCILIATION_CHUNK_DAYS = 31;
const UTC_BOUND_PADDING_DAYS = 2;

interface PlayedGameRepositoryBoundary {
  summarizeDays(input: {
    userId: number;
    timeZone: string;
    fromDate: string;
    toDate: string;
    fromUtc: Date;
    toUtcExclusive: Date;
  }, transaction?: ActivityFeedTransaction): Promise<PlayedGameDaySummary[]>;
  listExistingAggregateDates(
    userId: number,
    fromDate: string,
    toDate: string,
    transaction?: ActivityFeedTransaction,
  ): Promise<string[]>;
  getHistoryBounds(userId: number): Promise<PlayedGameHistoryBounds>;
  listBackfillUserIds(afterUserId: number, limit: number): Promise<number[]>;
}

interface ActivityFeedBoundary {
  reconcileDaily(input: {
    userId: number;
    type: string;
    activityDate: string;
    count: number;
    firstOccurredAt: Date | null;
    lastOccurredAt: Date | null;
  }, transaction?: ActivityFeedTransaction): Promise<ActivityAggregateRecord>;
}

interface ActivityRepositoryBoundary {
  transaction<T>(work: (transaction: ActivityFeedTransaction) => Promise<T>): Promise<T>;
  getDatabaseTime(): Promise<Date>;
  getTimeZone(userId: number): Promise<string>;
  getTimeZoneForWrite(
    userId: number,
    transaction: ActivityFeedTransaction,
  ): Promise<string>;
}

export interface PlayedGameActivityWriteScope {
  userId: number;
  snapshotStartedAt: Date;
  reason: 'PLAYED_GAME_ACTIVITY_RECONCILIATION';
}

export interface PlayedGameActivityWriteGuard {
  run<T>(
    scope: PlayedGameActivityWriteScope,
    work: (transaction: ActivityFeedTransaction) => Promise<T>,
  ): Promise<T>;
}

export interface CommittedImportReconciliationRange {
  from: Date;
  to: Date;
}

export function resolveCommittedImportReconciliationRange(input: {
  syncSince: Date | null;
  firstPersistedEndedAt: Date | null;
  lastPersistedEndedAt: Date | null;
}): CommittedImportReconciliationRange | null {
  const fromCandidates = [input.syncSince, input.firstPersistedEndedAt]
    .filter((value): value is Date => value !== null);
  const to = input.lastPersistedEndedAt;
  if (fromCandidates.length === 0 || !to) return null;

  const from = fromCandidates.reduce((earliest, candidate) => (
    candidate.getTime() < earliest.getTime() ? candidate : earliest
  ));
  if (from.getTime() > to.getTime()) return null;
  return { from, to };
}

export interface PlayedGameActivityReconciliationResult {
  userId: number;
  fromDate: string | null;
  toDate: string | null;
  daysReconciled: number;
  gamesCounted: number;
  chunksProcessed: number;
}

interface Dependencies {
  repository?: PlayedGameRepositoryBoundary;
  activityFeed?: ActivityFeedBoundary;
  activityRepository?: ActivityRepositoryBoundary;
  writeGuard?: PlayedGameActivityWriteGuard;
}

function parseDateOnly(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ISO date-only value: ${value}`);
  }
  return parsed;
}

function addDays(value: string, days: number): string {
  return new Date(parseDateOnly(value).getTime() + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function minDateOnly(left: string, right: string): string {
  return left <= right ? left : right;
}

function maxDateOnly(left: string, right: string): string {
  return left >= right ? left : right;
}

function databaseDateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function paddedUtcBounds(fromDate: string, toDate: string): {
  fromUtc: Date;
  toUtcExclusive: Date;
} {
  const padding = UTC_BOUND_PADDING_DAYS * MILLISECONDS_PER_DAY;
  return {
    fromUtc: new Date(parseDateOnly(fromDate).getTime() - padding),
    toUtcExclusive: new Date(parseDateOnly(addDays(toDate, 1)).getTime() + padding),
  };
}

function assertValidRange(from: Date, to: Date): void {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('Played-game reconciliation requires valid timestamps');
  }
  if (from.getTime() > to.getTime()) {
    throw new Error('Played-game reconciliation range must be ordered');
  }
}

export function createPlayedGameActivityReconciliationService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? PlayedGameActivityRepository;
  const activityFeed = dependencies.activityFeed ?? ActivityFeedService;
  const activityRepository = dependencies.activityRepository ?? ActivityFeedRepository;
  const writeGuard = dependencies.writeGuard ?? {
    run<T>(
      scope: PlayedGameActivityWriteScope,
      work: (transaction: ActivityFeedTransaction) => Promise<T>,
    ): Promise<T> {
      return activityRepository.transaction(async (transaction) => {
        // GAMES_PLAYED is a user-wide aggregate across every account, so any
        // user/account/game lifecycle fence for this user invalidates the snapshot.
        await assertDataLifecycleWriteAllowed(transaction, {
          userId: scope.userId,
          snapshotStartedAt: scope.snapshotStartedAt,
        });
        return work(transaction);
      });
    },
  };

  async function reconcileDateRange(input: {
    userId: number;
    timeZone: string;
    fromDate: string;
    toDate: string;
  }): Promise<PlayedGameActivityReconciliationResult> {
    parseDateOnly(input.fromDate);
    parseDateOnly(input.toDate);
    if (input.fromDate > input.toDate) {
      throw new Error('Played-game reconciliation date range must be ordered');
    }

    let chunkStart = input.fromDate;
    let daysReconciled = 0;
    let gamesCounted = 0;
    let chunksProcessed = 0;

    while (chunkStart <= input.toDate) {
      const chunkEnd = minDateOnly(
        addDays(chunkStart, PLAYED_GAME_RECONCILIATION_CHUNK_DAYS - 1),
        input.toDate,
      );
      const bounds = paddedUtcBounds(chunkStart, chunkEnd);
      const snapshotStartedAt = await activityRepository.getDatabaseTime();
      const [summaries, existingAggregateDates] = await Promise.all([
        repository.summarizeDays({
          userId: input.userId,
          timeZone: input.timeZone,
          fromDate: chunkStart,
          toDate: chunkEnd,
          ...bounds,
        }),
        repository.listExistingAggregateDates(
          input.userId,
          chunkStart,
          chunkEnd,
        ),
      ]);
      const summariesByDate = new Map(
        summaries.map((summary) => [summary.activityDate, summary]),
      );
      const datesToReconcile = [...new Set([
        ...summariesByDate.keys(),
        ...existingAggregateDates,
      ])].sort();

      const chunkResult = await writeGuard.run({
        userId: input.userId,
        snapshotStartedAt,
        reason: 'PLAYED_GAME_ACTIVITY_RECONCILIATION',
      }, async (transaction) => {
        const activeTimeZone = await activityRepository.getTimeZoneForWrite(
          input.userId,
          transaction,
        );
        if (activeTimeZone !== input.timeZone) {
          throw new Error('Effective time zone changed during played-game reconciliation');
        }

        for (const date of datesToReconcile) {
          const summary = summariesByDate.get(date);
          await activityFeed.reconcileDaily({
            userId: input.userId,
            type: 'GAMES_PLAYED',
            activityDate: date,
            count: summary?.count ?? 0,
            firstOccurredAt: summary?.firstOccurredAt ?? null,
            lastOccurredAt: summary?.lastOccurredAt ?? null,
          }, transaction);
        }

        return {
          daysReconciled: datesToReconcile.length,
          gamesCounted: summaries.reduce((total, summary) => total + summary.count, 0),
        };
      });

      daysReconciled += chunkResult.daysReconciled;
      gamesCounted += chunkResult.gamesCounted;
      chunksProcessed += 1;
      chunkStart = addDays(chunkEnd, 1);
    }

    return {
      userId: input.userId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      daysReconciled,
      gamesCounted,
      chunksProcessed,
    };
  }

  return {
    async reconcileCommittedRange(input: {
      userId: number;
      accountId: number;
      from: Date;
      to: Date;
    }): Promise<PlayedGameActivityReconciliationResult> {
      assertValidRange(input.from, input.to);
      const timeZone = await activityRepository.getTimeZone(input.userId);
      return reconcileDateRange({
        userId: input.userId,
        timeZone,
        fromDate: dateOnlyInTimeZone(input.from, timeZone),
        toDate: dateOnlyInTimeZone(input.to, timeZone),
      });
    },

    async reconcileAllForUser(userId: number): Promise<PlayedGameActivityReconciliationResult> {
      const [timeZone, bounds] = await Promise.all([
        activityRepository.getTimeZone(userId),
        repository.getHistoryBounds(userId),
      ]);

      const firstDates = [
        bounds.firstEndedAt ? dateOnlyInTimeZone(bounds.firstEndedAt, timeZone) : null,
        bounds.firstAggregateDate ? databaseDateToDateOnly(bounds.firstAggregateDate) : null,
      ].filter((value): value is string => value !== null);
      const lastDates = [
        bounds.lastEndedAt ? dateOnlyInTimeZone(bounds.lastEndedAt, timeZone) : null,
        bounds.lastAggregateDate ? databaseDateToDateOnly(bounds.lastAggregateDate) : null,
      ].filter((value): value is string => value !== null);

      if (firstDates.length === 0 || lastDates.length === 0) {
        return {
          userId,
          fromDate: null,
          toDate: null,
          daysReconciled: 0,
          gamesCounted: 0,
          chunksProcessed: 0,
        };
      }

      return reconcileDateRange({
        userId,
        timeZone,
        fromDate: firstDates.reduce(minDateOnly),
        toDate: lastDates.reduce(maxDateOnly),
      });
    },

    async listBackfillUserIds(afterUserId: number, limit: number): Promise<number[]> {
      if (!Number.isInteger(afterUserId) || afterUserId < 0) {
        throw new Error('afterUserId must be a non-negative integer');
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Backfill limit must be between 1 and 100');
      }
      return repository.listBackfillUserIds(afterUserId, limit);
    },
  };
}

export const PlayedGameActivityReconciliationService =
  createPlayedGameActivityReconciliationService();
