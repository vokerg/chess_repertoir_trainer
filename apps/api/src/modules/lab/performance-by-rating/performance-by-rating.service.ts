import { Prisma } from '@prisma/client';
import prisma from '../../../prisma';
import { GAME_TAG } from '../../imported-games/game-tags';
import type {
  PerformanceByRatingQuery,
  PerformanceByRatingResponse,
} from './performance-by-rating.schema';

type Provider = 'LICHESS' | 'CHESS_COM';
type Speed = 'blitz' | 'rapid';
type ReportType = PerformanceByRatingResponse['items'][number]['type'];

interface PerformanceByRatingRow {
  provider: Provider;
  speed: Speed;
  ratingFrom: number;
  games: number | bigint;
  analysedGames: number | bigint;
  accuracyGames: number | bigint;
  wins: number | bigint;
  draws: number | bigint;
  losses: number | bigint;
  whiteWins: number | bigint;
  whiteDraws: number | bigint;
  whiteLosses: number | bigint;
  blackWins: number | bigint;
  blackDraws: number | bigint;
  blackLosses: number | bigint;
  openingSuccess: number | bigint;
  openingTrouble: number | bigint;
  wasWinningAndLost: number | bigint;
  wasLosingAndWon: number | bigint;
  flaggedInWinningPosition: number | bigint;
  opponentFlaggedInWinningPosition: number | bigint;
  slowBleedLosses: number | bigint;
  slowBleedWins: number | bigint;
  averageAccuracy: number | null;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function subtractUtcMonths(date: Date, months: number): Date {
  const originalDay = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
  const lastTargetDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(originalDay, lastTargetDay));
  return target;
}

export function resolvePerformanceByRatingRange(
  query: PerformanceByRatingQuery,
  now = new Date(),
): { from: string; to: string; fromDate: Date; toExclusive: Date } {
  const today = dateOnly(now);
  const to = query.to ?? today;
  const toDate = parseDateOnly(to);
  const from = query.from ?? dateOnly(subtractUtcMonths(toDate, 3));
  const fromDate = parseDateOnly(from);

  if (fromDate > toDate) throw new Error('From date must not be after to date');

  return {
    from,
    to,
    fromDate,
    toExclusive: addUtcDays(toDate, 1),
  };
}

function toNumber(value: number | bigint): number {
  return Number(value);
}

function scorePercent(wins: number, draws: number, games: number): number | null {
  return games > 0 ? Math.round((((wins + draws * 0.5) / games) * 100) * 10) / 10 : null;
}

function reportType(provider: Provider, speed: Speed): ReportType {
  if (provider === 'LICHESS') return speed === 'blitz' ? 'LICHESS_BLITZ' : 'LICHESS_RAPID';
  return speed === 'blitz' ? 'CHESS_COM_BLITZ' : 'CHESS_COM_RAPID';
}

export async function getPerformanceByRating(
  userId: number,
  query: PerformanceByRatingQuery,
): Promise<PerformanceByRatingResponse> {
  const range = resolvePerformanceByRatingRange(query);
  const rows = await prisma.$queryRaw<PerformanceByRatingRow[]>(Prisma.sql`
    WITH eligible_games AS (
      SELECT
        "provider",
        lower("speedCategory") AS "speed",
        "userColor",
        "resultForUser",
        "tagCodes",
        "latestAnalysisCompletedAt",
        CASE
          WHEN "userColor" = 'WHITE' THEN "blackRating"
          WHEN "userColor" = 'BLACK' THEN "whiteRating"
          ELSE NULL
        END AS "opponentRating",
        CASE
          WHEN "userColor" = 'WHITE' THEN "latestWhiteAccuracy"
          WHEN "userColor" = 'BLACK' THEN "latestBlackAccuracy"
          ELSE NULL
        END AS "userAccuracy"
      FROM "ImportedGame"
      WHERE "userId" = ${userId}
        AND "endedAt" >= ${range.fromDate}
        AND "endedAt" < ${range.toExclusive}
        AND "provider" IN ('LICHESS', 'CHESS_COM')
        AND lower(coalesce("speedCategory", '')) IN ('blitz', 'rapid')
        AND "userColor" IN ('WHITE', 'BLACK')
        AND "resultForUser" IN ('WIN', 'DRAW', 'LOSS')
    ), rated_games AS (
      SELECT
        *,
        (floor("opponentRating"::numeric / 100) * 100)::int AS "ratingFrom"
      FROM eligible_games
      WHERE "opponentRating" IS NOT NULL
    )
    SELECT
      "provider",
      "speed",
      "ratingFrom",
      count(*)::int AS "games",
      count(*) FILTER (WHERE "latestAnalysisCompletedAt" IS NOT NULL)::int AS "analysedGames",
      count("userAccuracy")::int AS "accuracyGames",
      count(*) FILTER (WHERE "resultForUser" = 'WIN')::int AS "wins",
      count(*) FILTER (WHERE "resultForUser" = 'DRAW')::int AS "draws",
      count(*) FILTER (WHERE "resultForUser" = 'LOSS')::int AS "losses",
      count(*) FILTER (WHERE "userColor" = 'WHITE' AND "resultForUser" = 'WIN')::int AS "whiteWins",
      count(*) FILTER (WHERE "userColor" = 'WHITE' AND "resultForUser" = 'DRAW')::int AS "whiteDraws",
      count(*) FILTER (WHERE "userColor" = 'WHITE' AND "resultForUser" = 'LOSS')::int AS "whiteLosses",
      count(*) FILTER (WHERE "userColor" = 'BLACK' AND "resultForUser" = 'WIN')::int AS "blackWins",
      count(*) FILTER (WHERE "userColor" = 'BLACK' AND "resultForUser" = 'DRAW')::int AS "blackDraws",
      count(*) FILTER (WHERE "userColor" = 'BLACK' AND "resultForUser" = 'LOSS')::int AS "blackLosses",
      count(*) FILTER (WHERE "tagCodes" && ARRAY[${GAME_TAG.OPENING_ADVANTAGE}, ${GAME_TAG.OPENING_SUCCESS}]::integer[])::int AS "openingSuccess",
      count(*) FILTER (WHERE "tagCodes" && ARRAY[${GAME_TAG.OPENING_DISASTER}, ${GAME_TAG.OPENING_TROUBLE}]::integer[])::int AS "openingTrouble",
      count(*) FILTER (WHERE "resultForUser" = 'LOSS' AND "tagCodes" && ARRAY[${GAME_TAG.WAS_MUCH_BETTER}, ${GAME_TAG.WAS_WINNING}]::integer[])::int AS "wasWinningAndLost",
      count(*) FILTER (WHERE "resultForUser" = 'WIN' AND "tagCodes" && ARRAY[${GAME_TAG.WAS_MUCH_WORSE}, ${GAME_TAG.WAS_LOST}]::integer[])::int AS "wasLosingAndWon",
      count(*) FILTER (WHERE ${GAME_TAG.FLAGGED_IN_WINNING_POSITION} = ANY("tagCodes"))::int AS "flaggedInWinningPosition",
      count(*) FILTER (WHERE ${GAME_TAG.OPPONENT_FLAGGED_IN_WINNING_POSITION} = ANY("tagCodes"))::int AS "opponentFlaggedInWinningPosition",
      count(*) FILTER (WHERE ${GAME_TAG.SLOW_BLEED_LOSS} = ANY("tagCodes"))::int AS "slowBleedLosses",
      count(*) FILTER (WHERE ${GAME_TAG.SLOW_BLEED_WIN} = ANY("tagCodes"))::int AS "slowBleedWins",
      avg("userAccuracy")::float AS "averageAccuracy"
    FROM rated_games
    GROUP BY "provider", "speed", "ratingFrom"
    ORDER BY
      CASE "provider" WHEN 'LICHESS' THEN 0 ELSE 1 END,
      CASE "speed" WHEN 'blitz' THEN 0 ELSE 1 END,
      "ratingFrom"
  `);

  return {
    range: { from: range.from, to: range.to },
    items: rows.map((row) => {
      const games = toNumber(row.games);
      const wins = toNumber(row.wins);
      const draws = toNumber(row.draws);
      return {
        provider: row.provider,
        speed: row.speed,
        type: reportType(row.provider, row.speed),
        ratingFrom: row.ratingFrom,
        ratingTo: row.ratingFrom + 99,
        games,
        analysedGames: toNumber(row.analysedGames),
        accuracyGames: toNumber(row.accuracyGames),
        wdl: { wins, draws, losses: toNumber(row.losses) },
        whiteWdl: {
          wins: toNumber(row.whiteWins),
          draws: toNumber(row.whiteDraws),
          losses: toNumber(row.whiteLosses),
        },
        blackWdl: {
          wins: toNumber(row.blackWins),
          draws: toNumber(row.blackDraws),
          losses: toNumber(row.blackLosses),
        },
        scorePercent: scorePercent(wins, draws, games),
        openingSuccess: toNumber(row.openingSuccess),
        openingTrouble: toNumber(row.openingTrouble),
        wasWinningAndLost: toNumber(row.wasWinningAndLost),
        wasLosingAndWon: toNumber(row.wasLosingAndWon),
        flaggedInWinningPosition: toNumber(row.flaggedInWinningPosition),
        opponentFlaggedInWinningPosition: toNumber(row.opponentFlaggedInWinningPosition),
        slowBleedLosses: toNumber(row.slowBleedLosses),
        slowBleedWins: toNumber(row.slowBleedWins),
        averageAccuracy: row.averageAccuracy === null
          ? null
          : Math.round(row.averageAccuracy * 10) / 10,
      };
    }),
  };
}
