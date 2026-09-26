import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { decodeUciMove, encodeUciMove } from 'chess-domain';
import prisma from '../prisma';

const BATCH_SIZE = 1000;
type PlyRow = { importedGameId: number; plyNumber: number; moveUci: string; moveCode: number | null };
type Cursor = Pick<PlyRow, 'importedGameId' | 'plyNumber'>;

function identifyingKeys(row: PlyRow): string {
  return `importedGameId=${row.importedGameId} plyNumber=${row.plyNumber} moveUci=${JSON.stringify(row.moveUci)} moveCode=${row.moveCode}`;
}

async function readBatch(database: PrismaClient, cursor: Cursor | null, onlyNull: boolean): Promise<PlyRow[]> {
  return database.$queryRaw<PlyRow[]>(Prisma.sql`
    SELECT "importedGameId", "plyNumber", "moveUci", "moveCode"
    FROM "ImportedGamePly"
    WHERE ${cursor ? Prisma.sql`("importedGameId", "plyNumber") > (${cursor.importedGameId}::integer, ${cursor.plyNumber}::smallint)` : Prisma.sql`TRUE`}
      ${onlyNull ? Prisma.sql`AND "moveCode" IS NULL` : Prisma.empty}
    ORDER BY "importedGameId", "plyNumber"
    LIMIT ${BATCH_SIZE}
  `);
}

async function validate(database: PrismaClient, roundTrip: boolean, log: (message: string) => void): Promise<number> {
  let cursor: Cursor | null = null;
  let validated = 0;
  for (;;) {
    const rows = await readBatch(database, cursor, false);
    if (!rows.length) break;
    for (const row of rows) {
      try {
        encodeUciMove(row.moveUci);
        if (roundTrip && (row.moveCode === null || decodeUciMove(row.moveCode) !== row.moveUci)) {
          throw new Error('Missing code or round-trip mismatch');
        }
      } catch (error) {
        throw new Error(`${roundTrip ? 'Post-backfill' : 'Pre-backfill'} validation failed: ${identifyingKeys(row)}: ${String(error)}`);
      }
    }
    validated += rows.length;
    cursor = rows[rows.length - 1];
    log(`${roundTrip ? 'Round-trip' : 'UCI'} validated ${validated} plies`);
  }
  if (roundTrip) {
    const [{ remaining }] = await database.$queryRaw<Array<{ remaining: number }>>`
      SELECT COUNT(*)::integer AS remaining FROM "ImportedGamePly" WHERE "moveCode" IS NULL
    `;
    if (remaining !== 0) throw new Error(`Post-backfill validation failed: ${remaining} plies have moveCode IS NULL`);
  }
  return validated;
}

/** Run with ply writers paused; resumable updates never overwrite an existing code. */
export async function backfillImportedPlyMoveCodes(
  database: PrismaClient = prisma,
  options: { validateOnly?: boolean; log?: (message: string) => void } = {},
) {
  const log = options.log ?? console.log;
  const prevalidated = await validate(database, false, log);
  let updated = 0;
  if (!options.validateOnly) {
    let cursor: Cursor | null = null;
    for (;;) {
      const rows = await readBatch(database, cursor, true);
      if (!rows.length) break;
      const values = rows.map((row) => Prisma.sql`
        (${row.importedGameId}::integer, ${row.plyNumber}::smallint,
         ${row.moveUci}::varchar(5), ${encodeUciMove(row.moveUci)}::smallint)
      `);
      updated += await database.$executeRaw(Prisma.sql`
        UPDATE "ImportedGamePly" AS ply
        SET "moveCode" = payload."moveCode"
        FROM (VALUES ${Prisma.join(values)}) AS payload("importedGameId", "plyNumber", "moveUci", "moveCode")
        WHERE ply."importedGameId" = payload."importedGameId"
          AND ply."plyNumber" = payload."plyNumber"
          AND ply."moveUci" = payload."moveUci"
          AND ply."moveCode" IS NULL
      `);
      cursor = rows[rows.length - 1];
      log(`Updated ${updated} plies`);
    }
  }
  const validated = await validate(database, true, log);
  log(`Move-code ${options.validateOnly ? 'validation' : 'backfill'} complete: prevalidated=${prevalidated} updated=${updated} validated=${validated}; zero null codes; 100% exact UCI equality.`);
  return { prevalidated, updated, validated };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  Promise.resolve().then(() => {
    if (args.some((arg) => arg !== '--validate-only')) throw new Error('Usage: backfill-imported-ply-move-codes.ts [--validate-only]');
    return backfillImportedPlyMoveCodes(prisma, { validateOnly: args.includes('--validate-only') });
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
