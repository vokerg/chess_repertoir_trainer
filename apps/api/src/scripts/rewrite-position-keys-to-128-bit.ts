import 'dotenv/config';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import {
  POSITION_KEY_BYTES,
  positionKeyForNormalizedFen,
  positionKeyHex,
} from '../modules/positions/position-key';

const BATCH_SIZE = 1000;

type PositionRow = {
  id: number;
  normalizedFen: string;
};

async function validateNoCollisions() {
  console.log('Validating 16-byte position keys before writing...');

  const seen = new Map<string, PositionRow>();
  let cursorId = 0;
  let checked = 0;

  for (;;) {
    const rows = await prisma.position.findMany({
      where: { id: { gt: cursorId } },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: {
        id: true,
        normalizedFen: true,
      },
    });

    if (!rows.length) break;

    for (const row of rows) {
      cursorId = row.id;
      checked += 1;

      const key = positionKeyForNormalizedFen(row.normalizedFen);

      if (key.length !== POSITION_KEY_BYTES) {
        throw new Error(
          `Expected ${POSITION_KEY_BYTES}-byte key for position ${row.id}, got ${key.length}`,
        );
      }

      const keyHex = positionKeyHex(key);
      const existing = seen.get(keyHex);

      if (existing && existing.normalizedFen !== row.normalizedFen) {
        throw new Error(
          [
            '16-byte position key collision detected before DB update.',
            `key=${keyHex}`,
            `positionA=${existing.id} fenA=${existing.normalizedFen}`,
            `positionB=${row.id} fenB=${row.normalizedFen}`,
          ].join('\n'),
        );
      }

      seen.set(keyHex, row);
    }

    console.log(`Validated ${checked} positions`);
  }

  console.log(`Collision validation complete. Checked ${checked} positions.`);
}

async function rewriteKeys() {
  console.log('Rewriting ImportedGamePosition.positionKey values in place...');

  let cursorId = 0;
  let updated = 0;

  for (;;) {
    const rows = await prisma.position.findMany({
      where: { id: { gt: cursorId } },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: {
        id: true,
        normalizedFen: true,
      },
    });

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

    cursorId = rows[rows.length - 1].id;
    updated += rows.length;
    console.log(`Updated ${updated} positions`);
  }

  console.log(`positionKey rewrite complete. Updated ${updated} positions.`);
}

async function validateAfterRewrite() {
  console.log('Validating rewritten keys...');

  const lengthRows = await prisma.$queryRaw<
    Array<{ key_bytes: number | null; rows: bigint }>
  >`
    SELECT octet_length("positionKey") AS key_bytes, COUNT(*) AS rows
    FROM "ImportedGamePosition"
    GROUP BY octet_length("positionKey")
    ORDER BY key_bytes
  `;

  console.log('Key length distribution:', lengthRows);

  const invalidLength = lengthRows.some((row) => row.key_bytes !== POSITION_KEY_BYTES);

  if (invalidLength) {
    throw new Error(`Some positionKey values are not ${POSITION_KEY_BYTES} bytes`);
  }

  const duplicateRows = await prisma.$queryRaw<
    Array<{ key_hex: string; count: bigint }>
  >`
    SELECT encode("positionKey", 'hex') AS key_hex, COUNT(*) AS count
    FROM "ImportedGamePosition"
    GROUP BY "positionKey"
    HAVING COUNT(*) > 1
  `;

  if (duplicateRows.length) {
    console.error(duplicateRows.slice(0, 20));
    throw new Error(`Found ${duplicateRows.length} duplicate positionKey values`);
  }

  const mismatchRows = await prisma.$queryRaw<
    Array<{ id: number; normalizedFen: string; stored_key: Buffer | Uint8Array }>
  >`
    SELECT
      id,
      "normalizedFen",
      "positionKey" AS stored_key
    FROM "ImportedGamePosition"
    ORDER BY id ASC
  `;

  for (const row of mismatchRows) {
    const expected = positionKeyForNormalizedFen(row.normalizedFen);
    const storedHex = positionKeyHex(row.stored_key);
    const expectedHex = positionKeyHex(expected);

    if (storedHex !== expectedHex) {
      throw new Error(
        `positionKey mismatch for position ${row.id}: stored=${storedHex}, expected=${expectedHex}`,
      );
    }
  }

  console.log('Post-rewrite validation complete.');
}

async function main() {
  await validateNoCollisions();
  await rewriteKeys();
  await validateAfterRewrite();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
