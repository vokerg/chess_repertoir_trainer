import {
  ACTIVITY_FEED_CONTRACT_VERSION,
  type ActivityHistoryQuery,
  type ActivityHistoryResponse,
  type ActivityPreferencesResponse,
  type ActivityType,
  type TodayActivityResponse,
  type UpdateActivityPreferences,
} from '@chess-trainer/contracts/activity-feed';
import {
  ActivityRangeTooLargeError,
  InvalidActivityTypeError,
  InvalidActivityValueError,
  InvalidTimeZoneError,
  TimeZoneChangeRequiresRebuildError,
} from './activity-feed.errors';
import { databaseDateToDateOnly, mapActivityAggregate } from './activity-feed.mappers';
import {
  ActivityFeedRepository,
  type ActivityFeedTransaction,
} from './activity-feed.repository.prisma';
import {
  ACTIVITY_TYPE_ORDER,
  type ActivityAggregateRecord,
  type ActivityIncrementInput,
  type ActivityReconcileInput,
  type StaticDailyGoalDefinition,
} from './activity-feed.types';

const MAX_HISTORY_DAYS = 366;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVITY_TYPE_SET = new Set<string>(ACTIVITY_TYPE_ORDER);
const ACTIVITY_TYPE_INDEX = new Map(
  ACTIVITY_TYPE_ORDER.map((type, index) => [type, index] as const),
);

const DAILY_GOALS: readonly StaticDailyGoalDefinition[] = [
  { id: 'PLAY_GAME', activityType: 'GAMES_PLAYED', label: 'Play a game', target: 1 },
  {
    id: 'TRAIN_REPERTOIRE_LINES',
    activityType: 'REPERTOIRE_LINES_TRAINED',
    label: 'Train repertoire lines',
    target: 5,
  },
  {
    id: 'COMPLETE_LICHESS_PUZZLES',
    activityType: 'LICHESS_PUZZLES_COMPLETED',
    label: 'Complete Lichess puzzles',
    target: 3,
  },
  {
    id: 'COMPLETE_TACTICAL_SCENARIO',
    activityType: 'TACTICAL_SCENARIOS_COMPLETED',
    label: 'Complete a tactical scenario',
    target: 1,
  },
  {
    id: 'COMPLETE_GAME_ANALYSIS',
    activityType: 'GAME_ANALYSES_COMPLETED',
    label: 'Complete a game analysis',
    target: 1,
  },
];

interface RepositoryBoundary {
  transaction<T>(work: (transaction: ActivityFeedTransaction) => Promise<T>): Promise<T>;
  getTimeZone(userId: number): Promise<string>;
  getTimeZoneForWrite(userId: number, transaction: ActivityFeedTransaction): Promise<string>;
  updateTimeZoneIfActivityEmpty(userId: number, timeZone: string): Promise<string | null>;
  list(userId: number, from: Date, to: Date): Promise<ActivityAggregateRecord[]>;
  increment(
    input: ActivityIncrementInput,
    transaction: ActivityFeedTransaction,
  ): Promise<ActivityAggregateRecord>;
  reconcile(
    input: ActivityReconcileInput,
    transaction: ActivityFeedTransaction,
  ): Promise<ActivityAggregateRecord>;
}

interface Dependencies {
  repository?: RepositoryBoundary;
  clock?: () => Date;
}

function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InvalidActivityValueError(`Invalid ISO date-only value: ${value}`);
  }
  return date;
}

function inclusiveDays(from: string, to: string): number {
  return Math.floor((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / MILLISECONDS_PER_DAY) + 1;
}

function assertActivityType(value: string): asserts value is ActivityType {
  if (!ACTIVITY_TYPE_SET.has(value)) throw new InvalidActivityTypeError(value);
}

function assertValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new InvalidActivityValueError(`${label} must be a valid date`);
  }
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function dateOnlyInTimeZone(value: Date, timeZone: string): string {
  assertValidDate(value, 'occurrence timestamp');
  if (!isValidIanaTimeZone(timeZone)) throw new InvalidTimeZoneError(timeZone);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get('year');
  const month = values.get('month');
  const day = values.get('day');
  if (!year || !month || !day) {
    throw new InvalidActivityValueError('Unable to derive the activity calendar day');
  }
  return `${year}-${month}-${day}`;
}

function sortedRecords(records: readonly ActivityAggregateRecord[]): ActivityAggregateRecord[] {
  return [...records].sort((left, right) => {
    const dateOrder = databaseDateToDateOnly(right.activityDate)
      .localeCompare(databaseDateToDateOnly(left.activityDate));
    if (dateOrder !== 0) return dateOrder;
    return (ACTIVITY_TYPE_INDEX.get(left.type) ?? Number.MAX_SAFE_INTEGER)
      - (ACTIVITY_TYPE_INDEX.get(right.type) ?? Number.MAX_SAFE_INTEGER);
  });
}

export function createActivityFeedService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? ActivityFeedRepository;
  const clock = dependencies.clock ?? (() => new Date());

  async function inWriteTransaction<T>(
    transaction: ActivityFeedTransaction | undefined,
    work: (activeTransaction: ActivityFeedTransaction) => Promise<T>,
  ): Promise<T> {
    return transaction ? work(transaction) : repository.transaction(work);
  }

  return {
    async history(userId: number, query: ActivityHistoryQuery): Promise<ActivityHistoryResponse> {
      if (inclusiveDays(query.from, query.to) > MAX_HISTORY_DAYS) {
        throw new ActivityRangeTooLargeError(MAX_HISTORY_DAYS);
      }

      const [timeZone, records] = await Promise.all([
        repository.getTimeZone(userId),
        repository.list(userId, parseDateOnly(query.from), parseDateOnly(query.to)),
      ]);
      const days = new Map<string, ActivityAggregateRecord[]>();
      for (const record of sortedRecords(records)) {
        const date = databaseDateToDateOnly(record.activityDate);
        const day = days.get(date) ?? [];
        day.push(record);
        days.set(date, day);
      }

      return {
        contractVersion: ACTIVITY_FEED_CONTRACT_VERSION,
        timeZone,
        from: query.from,
        to: query.to,
        days: [...days.entries()].map(([date, activities]) => ({
          date,
          activities: activities.map(mapActivityAggregate),
        })),
      };
    },

    async today(userId: number): Promise<TodayActivityResponse> {
      const timeZone = await repository.getTimeZone(userId);
      const date = dateOnlyInTimeZone(clock(), timeZone);
      const records = await repository.list(userId, parseDateOnly(date), parseDateOnly(date));
      const byType = new Map(records.map((record) => [record.type, record] as const));
      const activities = ACTIVITY_TYPE_ORDER.map((type) => {
        const record = byType.get(type);
        return record
          ? mapActivityAggregate(record)
          : { type, count: 0, firstOccurredAt: null, lastOccurredAt: null };
      });
      const counts = new Map(activities.map((activity) => [activity.type, activity.count] as const));

      return {
        contractVersion: ACTIVITY_FEED_CONTRACT_VERSION,
        timeZone,
        date,
        activities,
        goals: DAILY_GOALS.map((goal) => {
          const current = counts.get(goal.activityType) ?? 0;
          return {
            ...goal,
            current,
            completed: current >= goal.target,
          };
        }),
      };
    },

    async preferences(userId: number): Promise<ActivityPreferencesResponse> {
      return {
        contractVersion: ACTIVITY_FEED_CONTRACT_VERSION,
        timeZone: await repository.getTimeZone(userId),
      };
    },

    async updatePreferences(
      userId: number,
      input: UpdateActivityPreferences,
    ): Promise<ActivityPreferencesResponse> {
      if (!isValidIanaTimeZone(input.timeZone)) throw new InvalidTimeZoneError(input.timeZone);
      const timeZone = await repository.updateTimeZoneIfActivityEmpty(userId, input.timeZone);
      if (!timeZone) throw new TimeZoneChangeRequiresRebuildError();
      return { contractVersion: ACTIVITY_FEED_CONTRACT_VERSION, timeZone };
    },

    async recordIncrement(input: {
      userId: number;
      type: string;
      occurredAt: Date;
      amount?: number;
    }, transaction?: ActivityFeedTransaction): Promise<ActivityAggregateRecord> {
      const activityType = input.type;
      assertActivityType(activityType);
      assertValidDate(input.occurredAt, 'occurredAt');
      const amount = input.amount ?? 1;
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new InvalidActivityValueError('Activity increment amount must be a positive integer');
      }

      return inWriteTransaction(transaction, async (activeTransaction) => {
        const timeZone = await repository.getTimeZoneForWrite(input.userId, activeTransaction);
        return repository.increment({
          userId: input.userId,
          type: activityType,
          amount,
          occurredAt: input.occurredAt,
          activityDate: parseDateOnly(dateOnlyInTimeZone(input.occurredAt, timeZone)),
        }, activeTransaction);
      });
    },

    async reconcileDaily(input: {
      userId: number;
      type: string;
      activityDate: string;
      count: number;
      firstOccurredAt: Date | null;
      lastOccurredAt: Date | null;
    }, transaction?: ActivityFeedTransaction): Promise<ActivityAggregateRecord> {
      const activityType = input.type;
      assertActivityType(activityType);
      if (!Number.isInteger(input.count) || input.count < 0) {
        throw new InvalidActivityValueError('Reconciled activity count must be a non-negative integer');
      }
      if (input.firstOccurredAt) assertValidDate(input.firstOccurredAt, 'firstOccurredAt');
      if (input.lastOccurredAt) assertValidDate(input.lastOccurredAt, 'lastOccurredAt');
      if (input.count > 0 && (!input.firstOccurredAt || !input.lastOccurredAt)) {
        throw new InvalidActivityValueError('Positive reconciled counts require first and last occurrence timestamps');
      }
      if (
        input.firstOccurredAt
        && input.lastOccurredAt
        && input.firstOccurredAt.getTime() > input.lastOccurredAt.getTime()
      ) {
        throw new InvalidActivityValueError('firstOccurredAt must not be after lastOccurredAt');
      }

      const activityDate = parseDateOnly(input.activityDate);
      return inWriteTransaction(transaction, async (activeTransaction) => {
        const timeZone = await repository.getTimeZoneForWrite(input.userId, activeTransaction);
        if (input.firstOccurredAt && dateOnlyInTimeZone(input.firstOccurredAt, timeZone) !== input.activityDate) {
          throw new InvalidActivityValueError('firstOccurredAt must belong to activityDate in the effective time zone');
        }
        if (input.lastOccurredAt && dateOnlyInTimeZone(input.lastOccurredAt, timeZone) !== input.activityDate) {
          throw new InvalidActivityValueError('lastOccurredAt must belong to activityDate in the effective time zone');
        }

        return repository.reconcile({
          userId: input.userId,
          type: activityType,
          count: input.count,
          activityDate,
          firstOccurredAt: input.count === 0 ? null : input.firstOccurredAt,
          lastOccurredAt: input.count === 0 ? null : input.lastOccurredAt,
        }, activeTransaction);
      });
    },
  };
}

export const ActivityFeedService = createActivityFeedService();
