import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { encodeUciMove, decodeUciMove } from 'chess-domain';
import { restoreImportedPlyMoveUci } from '../../dist/scripts/restore-imported-ply-move-uci.js';

const schema = `ply_restore_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: url.toString() });
const table = Prisma.raw(`"${schema}"."ImportedGamePly"`);
const options = { log() {} };
try {
  await database.$executeRaw(Prisma.sql`CREATE SCHEMA ${Prisma.raw(`"${schema}"`)}`);
  await database.$executeRaw(Prisma.sql`
    CREATE TABLE ${table} (
      "importedGameId" integer NOT NULL, "plyNumber" smallint NOT NULL,
      "moveCode" smallint NOT NULL, PRIMARY KEY ("importedGameId", "plyNumber")
    )
  `);
  const moves = ['e2e4', 'e1g1', 'e1c1', 'e5d6', 'a7a8n', 'b7b8b', 'c2c1r', 'e7e8q'];
  const values = Array.from({ length: 2107 }, (_, i) => Prisma.sql`
    (${Math.floor(i / 1100) + 1}, ${i % 1100 + 1}, ${encodeUciMove(moves[i % moves.length])})
  `);
  await database.$executeRaw(Prisma.sql`
    INSERT INTO ${table} ("importedGameId", "plyNumber", "moveCode") VALUES ${Prisma.join(values)}
  `);
  await database.$executeRaw`UPDATE "ImportedGamePly" SET "moveCode" = 32767 WHERE "importedGameId" = 2 AND "plyNumber" = 1007`;
  await assert.rejects(restoreImportedPlyMoveUci(database, options), /importedGameId=2 plyNumber=1007 moveCode=32767/);
  const [columns] = await database.$queryRaw`
    SELECT COUNT(*)::integer AS count FROM information_schema.columns
    WHERE table_schema = ${schema} AND table_name = 'ImportedGamePly' AND column_name = 'moveUci'
  `;
  assert.equal(columns.count, 0, 'invalid code in the final batch aborts before adding the column');
  await database.$executeRaw`UPDATE "ImportedGamePly" SET "moveCode" = ${encodeUciMove(moves[2106 % moves.length])} WHERE "importedGameId" = 2 AND "plyNumber" = 1007`;

  assert.deepEqual(await restoreImportedPlyMoveUci(database, options), { prevalidated: 2107, updated: 2107, validated: 2107 });
  assert.deepEqual(await restoreImportedPlyMoveUci(database, options), { prevalidated: 2107, updated: 0, validated: 2107 });
  const rows = await database.$queryRaw`SELECT "moveCode", "moveUci" FROM "ImportedGamePly"`;
  for (const row of rows) assert.equal(row.moveUci, decodeUciMove(row.moveCode));
  const [column] = await database.$queryRaw`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_schema = ${schema} AND table_name = 'ImportedGamePly' AND column_name = 'moveUci'
  `;
  assert.equal(column.is_nullable, 'NO', 'completed restoration recovers the legacy required column');

  // An interrupted restoration leaves nullable strings and committed batches.
  await database.$executeRaw`ALTER TABLE "ImportedGamePly" ALTER COLUMN "moveUci" DROP NOT NULL`;
  await database.$executeRaw`UPDATE "ImportedGamePly" SET "moveUci" = NULL WHERE "importedGameId" = 2`;
  assert.deepEqual(await restoreImportedPlyMoveUci(database, options), { prevalidated: 2107, updated: 1007, validated: 2107 });
  await database.$executeRaw`UPDATE "ImportedGamePly" SET "moveUci" = 'e7e8q' WHERE "importedGameId" = 1 AND "plyNumber" = 1`;
  await assert.rejects(restoreImportedPlyMoveUci(database, options), /importedGameId=1 plyNumber=1.*Restored UCI mismatch/);
  assert.equal((await database.$queryRaw`SELECT "moveUci" FROM "ImportedGamePly" WHERE "importedGameId" = 1 AND "plyNumber" = 1`)[0].moveUci, 'e7e8q',
    'restoration never silently overwrites conflicting existing strings');
  console.log('UCI restoration: all promotions, multi-batch recovery, restart, invalid-code prevalidation, and mismatch checks passed.');
} finally {
  await database.$executeRaw(Prisma.sql`DROP SCHEMA IF EXISTS ${Prisma.raw(`"${schema}"`)} CASCADE`);
  await database.$disconnect();
}
