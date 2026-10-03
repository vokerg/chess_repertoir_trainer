import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { encodeNormalizedFenCompact } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';

assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
const prisma = prismaModule.default;
const suffix = randomUUID().replaceAll('-', '');
const table = `position_storage_${suffix}`;
const child = `position_child_${suffix}`;
const legacyIndex = `legacy_${suffix}`;
const compactIndex = `compact_${suffix}`;
const migration = await readFile(new URL('../../prisma/migrations/20261002044000_finish_compact_position_storage/migration.sql', import.meta.url), 'utf8');
const sql = migration.replaceAll('"ImportedGamePosition"', `"${table}"`)
  .replaceAll('"ImportedGamePosition_positionKey_key"', `"${legacyIndex}"`);
const statements = sql.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(s => s && !['BEGIN', 'COMMIT'].includes(s));
const apply = () => prisma.$transaction(async tx => {
  for (const statement of statements) await tx.$executeRawUnsafe(statement);
});
const columns = () => prisma.$queryRawUnsafe(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='${table}' ORDER BY column_name`);
const fens = ['4K3', '3K4', '2K5'].map(rank => `7k/8/8/8/8/8/${rank}/8 w - -`);
const data = fens.map(encodeNormalizedFenCompact);
try {
  await prisma.$executeRawUnsafe(`CREATE TABLE "${table}" (id integer PRIMARY KEY, "positionKey" bytea NOT NULL, "normalizedFen" varchar(120) NOT NULL, "positionData" bytea, "positionDataCompact" bytea)`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "${legacyIndex}" ON "${table}" ("positionKey")`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "${compactIndex}" ON "${table}" ("positionDataCompact")`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "${child}" (id integer PRIMARY KEY, "positionId" integer REFERENCES "${table}"(id) ON UPDATE CASCADE ON DELETE RESTRICT)`);
  await prisma.$executeRawUnsafe(`INSERT INTO "${table}" VALUES (1, '\\x01', $1, '\\x00', $2), (2, '\\x02', $3, NULL, $4), (3, '\\x03', $5, NULL, NULL)`, fens[0], data[0], fens[1], data[1], fens[2]);
  await prisma.$executeRawUnsafe(`INSERT INTO "${child}" VALUES (1, 1)`);
  const before = await prisma.$queryRawUnsafe(`SELECT id, "positionDataCompact" FROM "${table}" WHERE id<>3 ORDER BY id`);
  const indexBefore = await prisma.$queryRawUnsafe(`SELECT oid::text FROM pg_class WHERE relname='${compactIndex}'`);
  const fkBefore = await prisma.$queryRawUnsafe(`SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='"${child}"'::regclass`);
  await assert.rejects(apply(), (error) => error.meta?.code === '23502');
  assert.equal((await columns()).length, 5, 'NULL guard rolls back the entire cleanup');
  await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id=3`);
  await apply();
  assert.deepEqual(await columns(), [{ column_name: 'id', is_nullable: 'NO' }, { column_name: 'positionDataCompact', is_nullable: 'NO' }]);
  assert.deepEqual(await prisma.$queryRawUnsafe(`SELECT id, "positionDataCompact" FROM "${table}" ORDER BY id`), before, 'IDs and compact bytes survive unchanged');
  assert.deepEqual(await prisma.$queryRawUnsafe(`SELECT oid::text FROM pg_class WHERE relname='${compactIndex}'`), indexBefore, 'compact index is retained');
  assert.deepEqual(await prisma.$queryRawUnsafe(`SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='"${child}"'::regclass`), fkBefore, 'foreign keys are retained');
  assert.equal((await prisma.$queryRawUnsafe(`SELECT 1 FROM pg_class WHERE relname='${legacyIndex}'`)).length, 0);
  await prisma.$executeRawUnsafe(`INSERT INTO "${table}" (id,"positionDataCompact") VALUES (3,$1)`, data[2]);
  await assert.rejects(prisma.$executeRawUnsafe(`INSERT INTO "${table}" (id,"positionDataCompact") VALUES (4,NULL)`), (error) => error.meta?.code === '23502');
  await assert.rejects(prisma.$executeRawUnsafe(`INSERT INTO "${table}" (id,"positionDataCompact") VALUES (4,$1)`, data[0]), (error) => error.meta?.code === '23505');
  console.log('Compact cleanup migration preserves IDs, bytes, indexes and FKs; NULL guard is atomic.');
} finally {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${child}"`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}"`);
  await prisma.$disconnect();
}
