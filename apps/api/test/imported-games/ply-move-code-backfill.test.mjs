import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient, Prisma } from '@prisma/client';
import { encodeUciMove, decodeUciMove } from 'chess-domain';
import { backfillImportedPlyMoveCodes } from '../../dist/scripts/backfill-imported-ply-move-codes.js';

// A private schema keeps the full-table one-off script away from other fixtures.
const schema = `ply_code_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: url.toString() });
const table = Prisma.raw(`"${schema}"."ImportedGamePly"`);
const messages = [];
const options = { log: (message) => messages.push(message) };
try {
  await database.$executeRaw(Prisma.sql`CREATE SCHEMA ${Prisma.raw(`"${schema}"`)}`);
  await database.$executeRaw(Prisma.sql`
    CREATE TABLE ${table} (
      "importedGameId" integer NOT NULL, "plyNumber" smallint NOT NULL,
      "positionId" integer NOT NULL, "moveUci" varchar(5) NOT NULL,
      "scoreLossCp" smallint, "classificationCode" smallint,
      PRIMARY KEY ("importedGameId", "plyNumber")
    )
  `);
  await database.$executeRaw(Prisma.sql`
    CREATE INDEX "ImportedGamePly_positionId_moveUci_importedGameId_plyNumber_idx"
    ON ${table} ("positionId", "moveUci", "importedGameId", "plyNumber")
  `);
  const moves = ['e2e4', 'e1g1', 'e5d6', 'a7a8n', 'b7b8b', 'c2c1r', 'e7e8q'];
  const values = Array.from({ length: 2107 }, (_, i) => Prisma.sql`
    (${Math.floor(i / 1100) + 1}, ${i % 1100 + 1}, 1, ${moves[i % moves.length]})
  `);
  await database.$executeRaw(Prisma.sql`
    INSERT INTO ${table} ("importedGameId", "plyNumber", "positionId", "moveUci") VALUES ${Prisma.join(values)}
  `);
  const migration = await readFile(new URL('../../prisma/migrations/20260926120000_expand_imported_ply_move_code/migration.sql', import.meta.url), 'utf8');
  await database.$executeRawUnsafe(migration);
  assert.equal(await database.importedGamePly.count(), 2107, 'expand preserves every existing row');
  const indexes = await database.$queryRaw(Prisma.sql`SELECT indexname FROM pg_indexes WHERE schemaname = ${schema}`);
  assert.ok(indexes.some((row) => row.indexname.includes('positionId_moveUci')), 'expand preserves legacy index');

  await database.importedGamePly.update({ where: { importedGameId_plyNumber: { importedGameId: 2, plyNumber: 1007 } }, data: { moveUci: 'bad' } });
  await assert.rejects(backfillImportedPlyMoveCodes(database, options), /Pre-backfill.*importedGameId=2 plyNumber=1007 moveUci="bad" moveCode=null/);
  assert.equal(await database.importedGamePly.count({ where: { moveCode: { not: null } } }), 0, 'prevalidation aborts before any writes, even for bad data in the last batch');
  await database.importedGamePly.update({ where: { importedGameId_plyNumber: { importedGameId: 2, plyNumber: 1007 } }, data: { moveUci: moves[2106 % moves.length] } });

  // Simulate one committed batch from an interrupted earlier run.
  const first = await database.importedGamePly.findMany({ orderBy: [{ importedGameId: 'asc' }, { plyNumber: 'asc' }], take: 1000 });
  await database.$executeRaw(Prisma.sql`
    UPDATE ${table} AS ply SET "moveCode" = input.code
    FROM (VALUES ${Prisma.join(first.map((row) => Prisma.sql`(${row.importedGameId}, ${row.plyNumber}, ${encodeUciMove(row.moveUci)})`))}) AS input(game, ply, code)
    WHERE ply."importedGameId" = input.game AND ply."plyNumber" = input.ply
  `);
  assert.deepEqual(await backfillImportedPlyMoveCodes(database, options), { prevalidated: 2107, updated: 1107, validated: 2107 });
  assert.deepEqual(await backfillImportedPlyMoveCodes(database, options), { prevalidated: 2107, updated: 0, validated: 2107 });
  assert.deepEqual(await backfillImportedPlyMoveCodes(database, { ...options, validateOnly: true }), { prevalidated: 2107, updated: 0, validated: 2107 });
  assert.equal(await database.importedGamePly.count({ where: { moveCode: null } }), 0);
  for (const row of await database.importedGamePly.findMany()) assert.equal(decodeUciMove(row.moveCode), row.moveUci);
  assert.ok(messages.some((message) => message.includes('100% exact UCI equality')));

  const key = { importedGameId_plyNumber: { importedGameId: 1, plyNumber: 1 } };
  await database.importedGamePly.update({ where: key, data: { moveCode: encodeUciMove('e7e8q') } });
  await assert.rejects(backfillImportedPlyMoveCodes(database, options), /Post-backfill.*importedGameId=1 plyNumber=1 moveUci="e2e4" moveCode=20276/);
  assert.equal((await database.importedGamePly.findUnique({ where: key })).moveCode, 20276, 'existing codes are never overwritten');
  await database.importedGamePly.update({ where: key, data: { moveCode: 32767 } });
  await assert.rejects(backfillImportedPlyMoveCodes(database, { ...options, validateOnly: true }), /Post-backfill.*moveCode=32767/);
  await database.importedGamePly.update({ where: key, data: { moveCode: null } });
  await assert.rejects(backfillImportedPlyMoveCodes(database, { ...options, validateOnly: true }), /Post-backfill.*moveCode=null/);
  console.log('Expand migration and resumable batched move-code backfill tests passed (2107 rows).');
} finally {
  await database.$executeRaw(Prisma.sql`DROP SCHEMA IF EXISTS ${Prisma.raw(`"${schema}"`)} CASCADE`);
  await database.$disconnect();
}
