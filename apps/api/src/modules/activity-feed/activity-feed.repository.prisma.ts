import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import type {
  ActivityAggregateRecord,
  ActivityIncrementInput,
  ActivityReconcileInput,
} from './activity-feed.types';

export type ActivityFeedTransaction = Prisma.TransactionClient;

type ActivityFeedDatabase = Pick<
  Prisma.TransactionClient,
  'appUser' | 'userActivityDailyAggregate' | '$queryRaw'
>;

type TimeZoneRow = {
  timeZone: string;
};

function firstRow<T>(rows: readonly T[], message: string): T {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

export function createActivityFeedRepository(database: PrismaClient = prisma) {
  async function getTimeZoneForWrite(
    userId: number,
    transaction: ActivityFeedTransaction,
  ): Promise<string> {
    const rows = await transaction.$queryRaw<TimeZoneRow[]>(Prisma.sql`
      SELECT "timeZone"
      FROM "AppUser"
      WHERE "id" = ${userId}
      FOR UPDATE
    `);
    return firstRow(rows, `App user ${userId} not found`).timeZone;
  }

  return {
    transaction<T>(work: (tx: ActivityFeedTransaction) => Promise<T>): Promise<T> {
      return database.$transaction(work);
    },

    async getTimeZone(
      userId: number,
      client: ActivityFeedDatabase = database,
    ): Promise<string> {
      const user = await client.appUser.findUnique({
        where: { id: userId },
        select: { timeZone: true },
      });
      if (!user) throw new Error(`App user ${userId} not found`);
      return user.timeZone;
    },

    getTimeZoneForWrite,

    async updateTimeZoneIfActivityEmpty(userId: number, timeZone: string): Promise<string | null> {
      return database.$transaction(async (transaction) => {
        const currentTimeZone = await getTimeZoneForWrite(userId, transaction);
        if (currentTimeZone === timeZone) return timeZone;

        const existing = await transaction.userActivityDailyAggregate.findFirst({
          where: { userId },
          select: { id: true },
        });
        if (existing) return null;

        const updated = await transaction.appUser.update({
          where: { id: userId },
          data: { timeZone },
          select: { timeZone: true },
        });
        return updated.timeZone;
      });
    },

    async list(
      userId: number,
      from: Date,
      to: Date,
      client: ActivityFeedDatabase = database,
    ): Promise<ActivityAggregateRecord[]> {
      return client.userActivityDailyAggregate.findMany({
        where: {
          userId,
          activityDate: { gte: from, lte: to },
        },
        orderBy: [
          { activityDate: 'desc' },
          { type: 'asc' },
        ],
      });
    },

    async increment(
      input: ActivityIncrementInput,
      client: ActivityFeedDatabase = database,
    ): Promise<ActivityAggregateRecord> {
      const activityDate = input.activityDate.toISOString().slice(0, 10);
      const rows = await client.$queryRaw<ActivityAggregateRecord[]>(Prisma.sql`
        INSERT INTO "UserActivityDailyAggregate" (
          "userId",
          "activityDate",
          "type",
          "count",
          "firstOccurredAt",
          "lastOccurredAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${input.userId},
          CAST(${activityDate} AS DATE),
          CAST(${input.type} AS "ActivityType"),
          ${input.amount},
          ${input.occurredAt},
          ${input.occurredAt},
          NOW(),
          NOW()
        )
        ON CONFLICT ("userId", "activityDate", "type")
        DO UPDATE SET
          "count" = "UserActivityDailyAggregate"."count" + EXCLUDED."count",
          "firstOccurredAt" = LEAST(
            COALESCE("UserActivityDailyAggregate"."firstOccurredAt", EXCLUDED."firstOccurredAt"),
            EXCLUDED."firstOccurredAt"
          ),
          "lastOccurredAt" = GREATEST(
            COALESCE("UserActivityDailyAggregate"."lastOccurredAt", EXCLUDED."lastOccurredAt"),
            EXCLUDED."lastOccurredAt"
          ),
          "updatedAt" = NOW()
        RETURNING
          "id",
          "userId",
          "activityDate",
          "type",
          "count",
          "firstOccurredAt",
          "lastOccurredAt",
          "createdAt",
          "updatedAt"
      `);
      return firstRow(rows, 'Activity increment did not return an aggregate');
    },

    async reconcile(
      input: ActivityReconcileInput,
      client: ActivityFeedDatabase = database,
    ): Promise<ActivityAggregateRecord> {
      const activityDate = input.activityDate.toISOString().slice(0, 10);
      const rows = await client.$queryRaw<ActivityAggregateRecord[]>(Prisma.sql`
        INSERT INTO "UserActivityDailyAggregate" (
          "userId",
          "activityDate",
          "type",
          "count",
          "firstOccurredAt",
          "lastOccurredAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${input.userId},
          CAST(${activityDate} AS DATE),
          CAST(${input.type} AS "ActivityType"),
          ${input.count},
          ${input.firstOccurredAt},
          ${input.lastOccurredAt},
          NOW(),
          NOW()
        )
        ON CONFLICT ("userId", "activityDate", "type")
        DO UPDATE SET
          "count" = EXCLUDED."count",
          "firstOccurredAt" = EXCLUDED."firstOccurredAt",
          "lastOccurredAt" = EXCLUDED."lastOccurredAt",
          "updatedAt" = NOW()
        RETURNING
          "id",
          "userId",
          "activityDate",
          "type",
          "count",
          "firstOccurredAt",
          "lastOccurredAt",
          "createdAt",
          "updatedAt"
      `);
      return firstRow(rows, 'Activity reconciliation did not return an aggregate');
    },
  };
}

export const ActivityFeedRepository = createActivityFeedRepository();
