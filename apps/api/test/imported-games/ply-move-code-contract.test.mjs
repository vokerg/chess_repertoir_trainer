import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient, Prisma } from '@prisma/client';
import { encodeUciMove } from 'chess-domain';
import { restoreImportedPlyMoveUci } from '../../dist/scripts/restore-imported-ply-move-uci.js';

const schema = `ply_contract_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: url.toString() });
const migration = await readFile(new URL('../../prisma/migrations/20260926143000_contract_imported_ply_move_code/migration.sql', import.meta.url), 'utf8');
const statements = migration.replace(/--[^\n]*/g, '').split(';').map(sql => sql.trim())
  .filter(sql => sql && sql !== 'BEGIN' && sql !== 'COMMIT');
async function applyContract() {
  await database.$transaction(async transaction => {
    for (const statement of statements) await transaction.$executeRawUnsafe(statement);
  });
}
try {
  await database.$executeRaw(Prisma.sql`CREATE SCHEMA ${Prisma.raw(`"${schema}"`)}`);
  await database.$executeRawUnsafe(`CREATE TABLE "${schema}"."ImportedGamePly" (
    "importedGameId" integer NOT NULL, "plyNumber" smallint NOT NULL, "positionId" integer NOT NULL,
    "moveUci" varchar(5) NOT NULL, "moveCode" smallint, "scoreLossCp" smallint, "classificationCode" smallint,
    PRIMARY KEY ("importedGameId", "plyNumber")
  )`);
  await database.$executeRawUnsafe('CREATE INDEX "ImportedGamePly_positionId_moveUci_importedGameId_plyNumber_idx" ON "ImportedGamePly" ("positionId", "moveUci", "importedGameId", "plyNumber")');
  await database.$executeRaw`INSERT INTO "ImportedGamePly" ("importedGameId", "plyNumber", "positionId", "moveUci") VALUES (1, 1, 2, 'a7a8n')`;
  await assert.rejects(applyContract(), error => error.meta?.code === '23502');
  assert.equal((await database.$queryRaw`SELECT "moveUci" FROM "ImportedGamePly"`)[0].moveUci, 'a7a8n', 'failed contract preserves legacy data');
  let indexes = await database.$queryRaw`SELECT indexname FROM pg_indexes WHERE schemaname = ${schema}`;
  assert.ok(indexes.some(row => row.indexname.includes('positionId_moveUci')), 'failed contract preserves the legacy index');

  await database.$executeRaw`UPDATE "ImportedGamePly" SET "moveCode" = ${encodeUciMove('a7a8n')}`;
  // The temporary storage workaround removed the code index; the contract must recreate its original shape.
  await applyContract();
  const columns = await database.$queryRaw`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'ImportedGamePly'`;
  assert.equal(columns.some(row => row.column_name === 'moveUci'), false);
  assert.equal(columns.find(row => row.column_name === 'moveCode').is_nullable, 'NO');
  indexes = await database.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ${schema}`;
  assert.equal(indexes.some(row => row.indexname.includes('positionId_moveUci')), false);
  assert.match(indexes.find(row => row.indexname.includes('positionId_moveCode')).indexdef, /\("positionId", "moveCode", "importedGameId", "plyNumber"\)/);
  await database.importedGamePly.create({ data: { importedGameId: 1, plyNumber: 2, positionId: 2, moveCode: encodeUciMove('a7a8q') } });
  assert.equal(await database.importedGamePly.count(), 2, 'code-only writers work after contraction');
  assert.deepEqual(await restoreImportedPlyMoveUci(database, { log() {} }), { prevalidated: 2, updated: 2, validated: 2 });
  assert.deepEqual(await database.$queryRaw`SELECT "moveUci" FROM "ImportedGamePly" ORDER BY "plyNumber"`, [{ moveUci: 'a7a8n' }, { moveUci: 'a7a8q' }]);
  await applyContract();
  assert.equal(await database.importedGamePly.count(), 2, 'restored UCI can be contracted again without losing plies');
  console.log('Move-code contract: rejects nulls atomically, restores the index, supports code-only writes and exact UCI recovery.');
} finally {
  await database.$executeRaw(Prisma.sql`DROP SCHEMA IF EXISTS ${Prisma.raw(`"${schema}"`)} CASCADE`);
  await database.$disconnect();
}
