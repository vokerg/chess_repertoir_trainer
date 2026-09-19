import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export interface PlayedGameDaySummary {
  activityDate: string;
  count: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
}

export interface PlayedGameHistoryBounds {
  firstEndedAt: Date | null;
  lastEndedAt: Date | null;
  firstAggregateDate: Date | null;
  lastAggregateDate: Date | null;
}

interface SummarizePlayedGameDaysInput {
  userId: number;
  timeZone: string;
  fromDate: string;
  toDate: string;
  fromUtc: Date;
  toUtcExclusive: Date;
}

type PlayedGameActivityDatabase = Pick<
  Prisma.TransactionClient,
  'appUser' | 'importedGame' | 'userActivityDailyAggregate' | '$queryRaw'
>;

export function createPlayedGameActivityRepository(database: PlayedGameActivityDatabase = prisma) {
  return {
    async summarizeDays(
      input: SummarizePlayedGameDaysInput,
      client: PlayedGameActivityDatabase = database,
    ): Promise<PlayedGameDaySummary[]> {
      return client.$queryRaw<PlayedGameDaySummary[]>(Prisma.sql`
        SELECT
          TO_CHAR((("endedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${input.timeZone})::date, 'YYYY-MM-DD') AS "activityDate",
          COUNT(DISTINCT "id")::int AS "count",
          MIN("endedAt") AS "firstOccurredAt",
          MAX("endedAt") AS "lastOccurredAt"
        FROM "ImportedGame"
        WHERE "userId" = ${input.userId}
          AND "endedAt" IS NOT NULL
          AND "endedAt" >= (CAST(${input.fromUtc} AS timestamptz) AT TIME ZONE 'UTC')
          AND "endedAt" < (CAST(${input.toUtcExclusive} AS timestamptz) AT TIME ZONE 'UTC')
          AND (("endedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${input.timeZone})::date
            BETWEEN CAST(${input.fromDate} AS date) AND CAST(${input.toDate} AS date)
        GROUP BY 1
        ORDER BY 1 ASC
      `);
    },

    async listExistingAggregateDates(
      userId: number,
      fromDate: string,
      toDate: string,
      client: PlayedGameActivityDatabase = database,
    ): Promise<string[]> {
      const aggregates = await client.userActivityDailyAggregate.findMany({
        where: {
          userId,
          type: 'GAMES_PLAYED',
          activityDate: {
            gte: new Date(`${fromDate}T00:00:00.000Z`),
            lte: new Date(`${toDate}T00:00:00.000Z`),
          },
        },
        select: { activityDate: true },
        orderBy: { activityDate: 'asc' },
      });
      return aggregates.map((aggregate) => aggregate.activityDate.toISOString().slice(0, 10));
    },

    async getHistoryBounds(userId: number): Promise<PlayedGameHistoryBounds> {
      const [gameBounds, aggregateBounds] = await Promise.all([
        database.importedGame.aggregate({
          where: { userId, endedAt: { not: null } },
          _min: { endedAt: true },
          _max: { endedAt: true },
        }),
        database.userActivityDailyAggregate.aggregate({
          where: { userId, type: 'GAMES_PLAYED' },
          _min: { activityDate: true },
          _max: { activityDate: true },
        }),
      ]);

      return {
        firstEndedAt: gameBounds._min.endedAt,
        lastEndedAt: gameBounds._max.endedAt,
        firstAggregateDate: aggregateBounds._min.activityDate,
        lastAggregateDate: aggregateBounds._max.activityDate,
      };
    },

    async listBackfillUserIds(afterUserId: number, limit: number): Promise<number[]> {
      const users = await database.appUser.findMany({
        where: {
          id: { gt: afterUserId },
          OR: [
            { importedGames: { some: { endedAt: { not: null } } } },
            { activityDailyAggregates: { some: { type: 'GAMES_PLAYED' } } },
          ],
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: limit,
      });
      return users.map((user) => user.id);
    },
  };
}

export const PlayedGameActivityRepository = createPlayedGameActivityRepository();
