import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { CurrentUserService } from '../../services/currentUserService';
import { SINGLETON_USER_ID } from '../../services/currentUserService';

interface TopOpponentRow {
  opponentUsername: string;
  games: number | bigint;
}

interface MonthlyGamesRow {
  year: number;
  month: number;
  monthStart: Date;
  games: number | bigint;
  wins: number | bigint | null;
  draws: number | bigint | null;
  losses: number | bigint | null;
  avgOpponentRatingLichess: number | null;
  avgOpponentRatingChessCom: number | null;
  highestRatedLichess: number | null;
  highestRatedChessCom: number | null;
}

function toNumber(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function toNullableNumber(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function scorePct(wins: number, draws: number, games: number) {
  return games > 0 ? ((wins + draws * 0.5) / games) * 100 : null;
}

function excludeBulletSql(excludeBullet: boolean) {
  return excludeBullet ? Prisma.sql`AND lower(coalesce("speedCategory", '')) <> 'bullet'` : Prisma.empty;
}

export const LabService = {
  topOpponents: async (limit: number) => {
    await CurrentUserService.getOrCreate();

    const rows = await prisma.$queryRaw<TopOpponentRow[]>(Prisma.sql`
      SELECT
        "opponentUsername",
        count(*)::int AS "games"
      FROM "ImportedGame"
      WHERE "userId" = ${SINGLETON_USER_ID}
        AND "opponentUsername" IS NOT NULL
        AND "opponentUsername" <> ''
      GROUP BY "opponentUsername"
      ORDER BY "games" DESC, "opponentUsername" ASC
      LIMIT ${limit}
    `);

    return {
      items: rows.map((row) => ({
        opponentUsername: row.opponentUsername,
        games: toNumber(row.games),
      })),
    };
  },

  monthlyGames: async (options: { excludeBullet: boolean }) => {
    await CurrentUserService.getOrCreate();

    const rows = await prisma.$queryRaw<MonthlyGamesRow[]>(Prisma.sql`
      WITH games AS (
        SELECT
          "provider",
          "resultForUser",
          "endedAt",
          CASE
            WHEN "userColor" = 'WHITE' THEN "blackRating"
            WHEN "userColor" = 'BLACK' THEN "whiteRating"
            ELSE NULL
          END AS "opponentRating"
        FROM "ImportedGame"
        WHERE "userId" = ${SINGLETON_USER_ID}
          AND "endedAt" IS NOT NULL
          ${excludeBulletSql(options.excludeBullet)}
      )
      SELECT
        extract(year from "endedAt")::int AS "year",
        extract(month from "endedAt")::int AS "month",
        date_trunc('month', "endedAt") AS "monthStart",
        count(*)::int AS "games",
        sum(CASE WHEN "resultForUser" = 'WIN' THEN 1 ELSE 0 END)::int AS "wins",
        sum(CASE WHEN "resultForUser" = 'DRAW' THEN 1 ELSE 0 END)::int AS "draws",
        sum(CASE WHEN "resultForUser" = 'LOSS' THEN 1 ELSE 0 END)::int AS "losses",
        avg(CASE WHEN "provider" = 'LICHESS' THEN "opponentRating" END)::float AS "avgOpponentRatingLichess",
        avg(CASE WHEN "provider" = 'CHESS_COM' THEN "opponentRating" END)::float AS "avgOpponentRatingChessCom",
        max(CASE WHEN "provider" = 'LICHESS' THEN "opponentRating" END)::int AS "highestRatedLichess",
        max(CASE WHEN "provider" = 'CHESS_COM' THEN "opponentRating" END)::int AS "highestRatedChessCom"
      FROM games
      GROUP BY "year", "month", "monthStart"
      ORDER BY "monthStart" DESC
    `);

    return {
      excludeBullet: options.excludeBullet,
      items: rows.map((row) => {
        const games = toNumber(row.games);
        const wins = toNumber(row.wins);
        const draws = toNumber(row.draws);
        const losses = toNumber(row.losses);
        return {
          year: row.year,
          month: row.month,
          monthStart: row.monthStart,
          games,
          wins,
          draws,
          losses,
          scorePct: scorePct(wins, draws, games),
          avgOpponentRatingLichess: toNullableNumber(row.avgOpponentRatingLichess),
          avgOpponentRatingChessCom: toNullableNumber(row.avgOpponentRatingChessCom),
          highestRatedLichess: toNullableNumber(row.highestRatedLichess),
          highestRatedChessCom: toNullableNumber(row.highestRatedChessCom),
        };
      }),
    };
  },
};
