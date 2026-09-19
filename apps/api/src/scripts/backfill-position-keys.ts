import 'dotenv/config';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { positionKeyForNormalizedFen } from '../modules/positions/position-key';

const BATCH_SIZE = 1000;

type PositionBackfillRow = {
  id: number;
  normalizedFen: string;
};

async function main() {
  let total = 0;

  for (;;) {
    const rows = await prisma.$queryRaw<PositionBackfillRow[]>`
      SELECT "id", "normalizedFen"
      FROM "ImportedGamePosition"
      WHERE "positionKey" IS NULL
      ORDER BY "id" ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (!rows.length) break;

    const values = rows.map((row) => Prisma.sql`
      (${row.id}::integer, ${new Uint8Array(positionKeyForNormalizedFen(row.normalizedFen))}::bytea)
    `);

    await prisma.$executeRaw`
      UPDATE "ImportedGamePosition" AS position
      SET "positionKey" = payload."positionKey"
      FROM (
        VALUES ${Prisma.join(values)}
      ) AS payload("id", "positionKey")
      WHERE position."id" = payload."id"
    `;

    total += rows.length;
    console.log(`Backfilled ${total} positions`);
  }

  const remainingRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "ImportedGamePosition"
    WHERE "positionKey" IS NULL
  `;
  const remaining = remainingRows[0]?.count ?? 0;

  if (remaining !== 0) {
    throw new Error(`Backfill incomplete: ${remaining} positions still have null positionKey`);
  }

  console.log(`Position key backfill complete. Total updated: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
