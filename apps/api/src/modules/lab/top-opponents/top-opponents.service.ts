import { Prisma } from '@prisma/client';
import prisma from '../../../prisma';

interface TopOpponentRow {
  opponentUsername: string;
  games: number | bigint;
}

export async function getTopOpponents(userId: number, limit: number) {
  const rows = await prisma.$queryRaw<TopOpponentRow[]>(Prisma.sql`
    SELECT
      "opponentUsername",
      count(*)::int AS "games"
    FROM "ImportedGame"
    WHERE "userId" = ${userId}
      AND "opponentUsername" IS NOT NULL
      AND "opponentUsername" <> ''
    GROUP BY "opponentUsername"
    ORDER BY "games" DESC, "opponentUsername" ASC
    LIMIT ${limit}
  `);

  return {
    items: rows.map((row) => ({
      opponentUsername: row.opponentUsername,
      games: Number(row.games),
    })),
  };
}
