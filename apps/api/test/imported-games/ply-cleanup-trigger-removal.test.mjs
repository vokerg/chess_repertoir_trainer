import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient, Prisma } from '@prisma/client';
import { encodeUciMove } from 'chess-domain';
import { backfillImportedPlyMoveCodes } from '../../dist/scripts/backfill-imported-ply-move-codes.js';

const schema = `ply_trigger_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: url.toString() });
const table = Prisma.raw(`"${schema}"."ImportedGamePly"`);
const migration = await readFile(new URL('../../prisma/migrations/20260926130000_remove_ply_position_cleanup_triggers/migration.sql', import.meta.url), 'utf8');
const statements = migration.replace(/--[^\n]*/g, '').split(';').map((sql) => sql.trim())
  .filter((sql) => sql && sql !== 'BEGIN' && sql !== 'COMMIT');
async function applyRemoval() {
  await database.$transaction(async (transaction) => {
    for (const statement of statements) await transaction.$executeRawUnsafe(statement);
  });
}
try {
  await database.$executeRaw(Prisma.sql`CREATE SCHEMA ${Prisma.raw(`"${schema}"`)}`);
  await database.$executeRaw(Prisma.sql`
    CREATE TABLE ${table} (
      "importedGameId" integer NOT NULL, "plyNumber" smallint NOT NULL,
      "positionId" integer NOT NULL, "moveUci" varchar(5) NOT NULL,
      "moveCode" smallint, "scoreLossCp" smallint, "classificationCode" smallint,
      PRIMARY KEY ("importedGameId", "plyNumber")
    )
  `);
  await database.$executeRaw`INSERT INTO "ImportedGamePly" ("importedGameId", "plyNumber", "positionId", "moveUci") VALUES (1, 1, 1, 'a7a8n')`;
  await database.$executeRawUnsafe(`CREATE FUNCTION "${schema}".missing_candidate_reset() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN DELETE FROM "${schema}"."PositionCleanupCandidate"; RETURN NULL; END; $$`);
  for (const [suffix, event] of [['insert', 'INSERT'], ['update', 'UPDATE']]) {
    await database.$executeRawUnsafe(`CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_${suffix}"
      AFTER ${event} ON "${schema}"."ImportedGamePly" FOR EACH STATEMENT
      EXECUTE FUNCTION "${schema}".missing_candidate_reset()`);
  }
  // A separate write guard must remain active after cleanup trigger removal.
  await database.$executeRawUnsafe(`CREATE FUNCTION "${schema}".test_write_guard() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW."importedGameId" < 0 THEN RAISE EXCEPTION 'Existing write guard'; END IF; RETURN NEW; END; $$`);
  await database.$executeRawUnsafe(`CREATE TRIGGER "ImportedGamePly_data_lifecycle_guard"
    BEFORE INSERT OR UPDATE ON "${schema}"."ImportedGamePly" FOR EACH ROW
    EXECUTE FUNCTION "${schema}".test_write_guard()`);
  await assert.rejects(backfillImportedPlyMoveCodes(database, { log() {} }), /PositionCleanupCandidate.*does not exist/);
  assert.equal((await database.$queryRaw`SELECT "moveCode" FROM "ImportedGamePly" WHERE "importedGameId" = 1 AND "plyNumber" = 1`)[0].moveCode, null, 'failed update rolls back');

  await applyRemoval();
  await applyRemoval();
  const remaining = await database.$queryRaw(Prisma.sql`
    SELECT trigger.tgname AS name FROM pg_trigger AS trigger
    JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = ${schema} AND relation.relname = 'ImportedGamePly' AND NOT trigger.tgisinternal
  `);
  assert.deepEqual(remaining.map((row) => row.name), ['ImportedGamePly_data_lifecycle_guard']);
  assert.deepEqual(await backfillImportedPlyMoveCodes(database, { log() {} }), { prevalidated: 1, updated: 1, validated: 1 });
  assert.equal((await database.$queryRaw`SELECT "moveCode" FROM "ImportedGamePly" WHERE "importedGameId" = 1 AND "plyNumber" = 1`)[0].moveCode, encodeUciMove('a7a8n'));
  await database.$executeRaw`INSERT INTO "ImportedGamePly" ("importedGameId", "plyNumber", "positionId", "moveUci", "moveCode") VALUES (1, 2, 1, 'e2e4', ${encodeUciMove('e2e4')})`;
  await assert.rejects(database.$executeRaw`INSERT INTO "ImportedGamePly" ("importedGameId", "plyNumber", "positionId", "moveUci", "moveCode") VALUES (-1, 1, 1, 'e2e4', ${encodeUciMove('e2e4')})`, /Existing write guard/);
  const candidate = await database.$queryRaw(Prisma.sql`SELECT to_regclass(${`"${schema}"."PositionCleanupCandidate"`})::text AS name`);
  assert.equal(candidate[0].name, null, 'candidate table is never recreated');
  console.log('Cleanup trigger removal: resumable backfill and inserts work without candidate table; independent guard remains active.');
} finally {
  await database.$executeRaw(Prisma.sql`DROP SCHEMA IF EXISTS ${Prisma.raw(`"${schema}"`)} CASCADE`);
  await database.$disconnect();
}
