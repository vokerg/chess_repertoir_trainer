import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { decodeUciMove } from 'chess-domain';
import prisma from '../prisma';

const BATCH_SIZE = 1000;
type Row = { importedGameId: number; plyNumber: number; moveCode: number; moveUci?: string | null };
type Cursor = Pick<Row, 'importedGameId' | 'plyNumber'>;

async function readBatch(database: PrismaClient, cursor: Cursor | null, includeUci: boolean, onlyNull = false): Promise<Row[]> {
  return database.$queryRaw<Row[]>(Prisma.sql`
    SELECT "importedGameId", "plyNumber", "moveCode" ${includeUci ? Prisma.sql`, "moveUci"` : Prisma.empty}
    FROM "ImportedGamePly"
    WHERE ${cursor ? Prisma.sql`("importedGameId", "plyNumber") > (${cursor.importedGameId}::integer, ${cursor.plyNumber}::smallint)` : Prisma.sql`TRUE`}
      ${onlyNull ? Prisma.sql`AND "moveUci" IS NULL` : Prisma.empty}
    ORDER BY "importedGameId", "plyNumber"
    LIMIT ${BATCH_SIZE}
  `);
}

async function validate(database: PrismaClient, includeUci: boolean, log: (message: string) => void): Promise<number> {
  let cursor: Cursor | null = null;
  let validated = 0;
  for (;;) {
    const rows = await readBatch(database, cursor, includeUci);
    if (!rows.length) break;
    for (const row of rows) {
      try {
        const uci = decodeUciMove(row.moveCode);
        if (includeUci && row.moveUci !== uci) throw new Error(`Restored UCI mismatch: ${JSON.stringify(row.moveUci)}`);
      } catch (error) {
        throw new Error(`UCI restoration validation failed: importedGameId=${row.importedGameId} plyNumber=${row.plyNumber} moveCode=${row.moveCode}: ${String(error)}`);
      }
    }
    validated += rows.length;
    cursor = rows[rows.length - 1];
    log(`${includeUci ? 'Restored UCI' : 'Move code'} validated ${validated} plies`);
  }
  return validated;
}

/** Optional rollback: run with all ply writers paused and enough storage for UCI restoration. */
export async function restoreImportedPlyMoveUci(
  database: PrismaClient = prisma,
  options: { log?: (message: string) => void } = {},
) {
  const log = options.log ?? console.log;
  // Check every code before any schema or data mutation. The domain codec is the only decoder.
  const prevalidated = await validate(database, false, log);
  await database.$executeRaw`ALTER TABLE "ImportedGamePly" ADD COLUMN IF NOT EXISTS "moveUci" VARCHAR(5)`;
  let cursor: Cursor | null = null;
  let updated = 0;
  for (;;) {
    const rows = await readBatch(database, cursor, true, true);
    if (!rows.length) break;
    const values = rows.map((row) => Prisma.sql`
      (${row.importedGameId}::integer, ${row.plyNumber}::smallint, ${row.moveCode}::smallint, ${decodeUciMove(row.moveCode)}::varchar(5))
    `);
    updated += await database.$executeRaw(Prisma.sql`
      UPDATE "ImportedGamePly" AS ply SET "moveUci" = payload.uci
      FROM (VALUES ${Prisma.join(values)}) AS payload(game, ply, code, uci)
      WHERE ply."importedGameId" = payload.game AND ply."plyNumber" = payload.ply
        AND ply."moveCode" = payload.code AND ply."moveUci" IS NULL
    `);
    cursor = rows[rows.length - 1];
    log(`Restored ${updated} plies`);
  }
  const validated = await validate(database, true, log);
  await database.$executeRaw`ALTER TABLE "ImportedGamePly" ALTER COLUMN "moveUci" SET NOT NULL`;
  log(`UCI restoration complete: prevalidated=${prevalidated} updated=${updated} validated=${validated}; 100% exact decoded UCI equality.`);
  return { prevalidated, updated, validated };
}

if (require.main === module) {
  Promise.resolve().then(() => {
    if (process.argv.length > 2) throw new Error('Usage: restore-imported-ply-move-uci.ts');
    return restoreImportedPlyMoveUci();
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
