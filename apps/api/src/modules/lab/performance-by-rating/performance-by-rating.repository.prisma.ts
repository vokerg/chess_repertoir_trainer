import { Prisma } from '@prisma/client';
import prisma from '../../../prisma';
import { GAME_TAG } from '../../imported-games/game-tags';

export type PerformanceProvider = 'LICHESS' | 'CHESS_COM';
export type PerformanceSpeed = 'blitz' | 'rapid';

export interface PerformanceByRatingAggregateRow {
  provider: PerformanceProvider;
  speed: PerformanceSpeed;
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

export async function findPerformanceByRatingRows(
  userId: number,
  fromDate: Date,
  toExclusive: Date,
): Promise<PerformanceByRatingAggregateRow[]> {
  return prisma.$queryRaw<PerformanceByRatingAggregateRow[]>(Prisma.sql`
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
        AND "endedAt" >= ${fromDate}
        AND "endedAt" < ${toExclusive}
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
}
