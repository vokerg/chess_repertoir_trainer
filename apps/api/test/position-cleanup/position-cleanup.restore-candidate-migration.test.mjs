import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { encodeNormalizedFenCompact } from 'chess-domain';

const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'migration fixtures require a disposable local DB');
const prisma = new PrismaClient({ datasourceUrl: url.toString() });
const schema = `restore_candidate_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const scoped = new PrismaClient({ datasourceUrl: url.toString() });
const migration = await readFile(new URL('../../prisma/migrations/20261002194000_restore_position_cleanup_candidate/migration.sql', import.meta.url), 'utf8');
const block = migration.match(/DO \$\$[\s\S]*\$\$;/)?.[0];
assert.ok(block);
const apply = () => scoped.$transaction(async tx => {
  await tx.$executeRawUnsafe(block);
});
const candidateCatalog = () => scoped.$transaction(async tx => {
  return {
    table: await tx.$queryRaw`SELECT '"PositionCleanupCandidate"'::regclass::oid::text AS oid`,
    columns: await tx.$queryRaw`SELECT column_name,data_type,is_nullable,datetime_precision,column_default FROM information_schema.columns WHERE table_schema=${schema} AND table_name='PositionCleanupCandidate' ORDER BY ordinal_position`,
    constraints: await tx.$queryRaw`SELECT conname,contype,convalidated,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='"PositionCleanupCandidate"'::regclass ORDER BY conname`,
    indexes: await tx.$queryRaw`SELECT c.oid::text AS oid,c.relname,i.indisunique,i.indisvalid,i.indisready,pg_get_indexdef(c.oid) AS definition FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indrelid='"PositionCleanupCandidate"'::regclass ORDER BY c.relname`,
  };
});
const existingData = () => scoped.$transaction(async tx => {
  return {
    positions: await tx.$queryRaw`SELECT * FROM "ImportedGamePosition" ORDER BY id`,
    plies: await tx.$queryRaw`SELECT * FROM "ImportedGamePly" ORDER BY id`,
    runs: await tx.$queryRaw`SELECT * FROM "PositionCleanupRun" ORDER BY id`,
    triggers: await tx.$queryRaw`SELECT tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='"ImportedGamePly"'::regclass AND NOT tgisinternal ORDER BY tgname`,
  };
});
try {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "${schema}"."ImportedGamePosition" (id integer PRIMARY KEY,"positionDataCompact" bytea NOT NULL UNIQUE)`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "${schema}"."ImportedGamePly" (id integer PRIMARY KEY,"positionId" integer REFERENCES "${schema}"."ImportedGamePosition"(id) ON UPDATE CASCADE ON DELETE RESTRICT)`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "${schema}"."PositionCleanupRun" (id integer PRIMARY KEY,marker text NOT NULL)`);
  await prisma.$executeRawUnsafe(`CREATE FUNCTION "${schema}".keep_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER keep_existing_guard BEFORE INSERT ON "${schema}"."ImportedGamePly" FOR EACH ROW EXECUTE FUNCTION "${schema}".keep_guard()`);
  const compact = encodeNormalizedFenCompact('7k/8/8/8/8/8/4K3/8 w - -');
  await prisma.$executeRawUnsafe(`INSERT INTO "${schema}"."ImportedGamePosition" VALUES (1,$1),(2,$2)`, compact, encodeNormalizedFenCompact('7k/8/8/8/8/8/3K4/8 w - -'));
  await prisma.$executeRawUnsafe(`INSERT INTO "${schema}"."ImportedGamePly" VALUES (7,1)`);
  await prisma.$executeRawUnsafe(`INSERT INTO "${schema}"."PositionCleanupRun" VALUES (77,'retain existing run')`);
  const before = await existingData();
  await apply();
  assert.equal(await scoped.positionCleanupCandidate.count(), 0, 'restoration creates no observations');
  assert.deepEqual(await existingData(), before, 'existing positions, plies, runs and triggers are untouched');
  const catalog = await candidateCatalog();
  assert.deepEqual(catalog.columns.map(c => [c.column_name,c.data_type,c.is_nullable,c.datetime_precision,c.column_default]), [
    ['positionId','integer','NO',null,null],
    ['firstObservedOrphanAt','timestamp without time zone','NO',3,'CURRENT_TIMESTAMP'],
    ['lastObservedOrphanAt','timestamp without time zone','NO',3,'CURRENT_TIMESTAMP'],
  ]);
  assert.deepEqual(catalog.constraints.map(c => [c.conname,c.contype,c.convalidated]), [
    ['PositionCleanupCandidate_observation_order_check','c',true],
    ['PositionCleanupCandidate_pkey','p',true],
    ['PositionCleanupCandidate_positionId_fkey','f',true],
  ]);
  assert.match(catalog.constraints[0].definition, /lastObservedOrphanAt.*>=.*firstObservedOrphanAt/);
  assert.match(catalog.constraints[2].definition, /REFERENCES .*ImportedGamePosition.*ON UPDATE CASCADE ON DELETE CASCADE/);
  assert.ok(catalog.indexes.every(i => i.indisvalid && i.indisready));
  assert.deepEqual(catalog.indexes.map(i => [i.relname,i.indisunique]), [
    ['PositionCleanupCandidate_firstObservedOrphanAt_positionId_idx',false], ['PositionCleanupCandidate_pkey',true],
  ]);
  assert.match(catalog.indexes[0].definition, /firstObservedOrphanAt.*positionId/);
  const candidate = await scoped.positionCleanupCandidate.create({ data: { positionId: 1 } });
  assert.equal(candidate.firstObservedOrphanAt.getTime(), candidate.lastObservedOrphanAt.getTime());
  await assert.rejects(scoped.positionCleanupCandidate.create({ data: { positionId: 99 } }), error => error.code === 'P2003');
  await assert.rejects(scoped.positionCleanupCandidate.create({ data: { positionId: 1 } }), error => error.code === 'P2002');
  await assert.rejects(scoped.positionCleanupCandidate.create({ data: { positionId: 2, firstObservedOrphanAt: new Date('2026-10-02'), lastObservedOrphanAt: new Date('2026-10-01') } }), error => error.meta?.database_error?.includes('observation_order_check') || error.message.includes('observation_order_check'));
  const rowsBefore = await scoped.positionCleanupCandidate.findMany();
  await apply();
  assert.deepEqual(await candidateCatalog(), catalog, 'existing tables and indexes are not replaced');
  assert.deepEqual(await scoped.positionCleanupCandidate.findMany(), rowsBefore, 'existing observations survive a replay');
  assert.deepEqual(await existingData(), before);
  await prisma.$executeRawUnsafe(`UPDATE "${schema}"."ImportedGamePosition" SET id=10 WHERE id=1`);
  assert.equal((await scoped.positionCleanupCandidate.findFirst()).positionId, 10, 'candidate FK retains update cascade');
  await scoped.positionCleanupCandidate.create({ data: { positionId: 2 } });
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}"."ImportedGamePosition" WHERE id=2`);
  assert.equal(await scoped.positionCleanupCandidate.count({ where: { positionId: 2 } }), 0, 'candidate FK retains delete cascade');
  await prisma.$executeRawUnsafe(`DROP TABLE "${schema}"."PositionCleanupCandidate"`);
  await prisma.$executeRawUnsafe(`CREATE INDEX "PositionCleanupCandidate_firstObservedOrphanAt_positionId_idx" ON "${schema}"."PositionCleanupRun"(id)`);
  await assert.rejects(apply(), error => error.meta?.code === '42P07');
  const absent = await prisma.$queryRaw`SELECT to_regclass(${`"${schema}"."PositionCleanupCandidate"`})::text AS relation`;
  assert.equal(absent[0].relation, null, 'failed index creation rolls back the table and FK atomically');
  console.log('Candidate restoration: empty missing table, preserved existing observations/data/triggers, constraints, cascades and atomic failure passed.');
} finally {
  await scoped.$disconnect();
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await prisma.$disconnect();
}
