import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { Prisma, PrismaClient } from '@prisma/client';
import { Chess } from 'chess.js';
import { decodeNormalizedFen, encodeNormalizedFen, normalizeFenForPosition } from 'chess-domain';
import { pilotBackfillPositionData } from '../../dist/scripts/pilot-backfill-position-data.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

// The script uses an unqualified table name; isolate all pilot tests in a private schema.
const schema = `position_data_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: url.toString() });
const schemaSql = Prisma.raw(`"${schema}"`);
const messages = [];
const log = (message) => messages.push(message);
const migration = await readFile(new URL('../../prisma/migrations/20260926150000_add_position_data_pilot/migration.sql', import.meta.url), 'utf8');
assert.equal(migration.trim(), 'ALTER TABLE "ImportedGamePosition" ADD COLUMN "positionData" BYTEA;');

const fens = new Set();
let chess = new Chess(), seed = 42;
while (fens.size < 107) {
  fens.add(normalizeFenForPosition(chess.fen()));
  if (chess.isGameOver()) chess = new Chess();
  else {
    const moves = chess.moves();
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    chess.move(moves[seed % moves.length]);
  }
}
const originals = [...fens].map((normalizedFen, index) => ({
  id: index + 1, normalizedFen, positionKey: new Uint8Array(positionKeyForNormalizedFen(normalizedFen)),
}));
const readRows = () => database.$queryRaw`SELECT * FROM "ImportedGamePosition" ORDER BY id`;
const resetData = () => database.$executeRaw`UPDATE "ImportedGamePosition" SET "positionData" = NULL`;

try {
  await database.$executeRaw(Prisma.sql`CREATE SCHEMA ${schemaSql}`);
  await database.$executeRaw`
    CREATE TABLE "ImportedGamePosition" (
      id integer PRIMARY KEY, "positionKey" bytea NOT NULL UNIQUE, "normalizedFen" varchar(120) NOT NULL
    )
  `;
  await database.$executeRaw(Prisma.sql`
    INSERT INTO "ImportedGamePosition" (id, "positionKey", "normalizedFen")
    VALUES ${Prisma.join(originals.map((row) => Prisma.sql`(${row.id}, ${row.positionKey}, ${row.normalizedFen})`))}
  `);
  const indexesBefore = await database.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ${schema} ORDER BY indexname`;
  await database.$executeRawUnsafe(migration);
  assert.equal((await readRows()).length, 107);
  assert.ok((await readRows()).every((row) => row.positionData === null));
  assert.deepEqual(await database.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ${schema} ORDER BY indexname`, indexesBefore);

  const cli = spawnSync(process.execPath, ['dist/scripts/pilot-backfill-position-data.js', '--limit=101'], {
    encoding: 'utf8', env: { ...process.env, DATABASE_URL: url.toString() },
  });
  assert.equal(cli.status, 1, 'the CLI rejects a limit override');
  assert.match(cli.stderr, /no arguments; limit is always 100/);
  assert.ok((await readRows()).every((row) => row.positionData === null));

  // Existing binary values are excluded and never overwritten. More than 100 are eligible.
  const existing = encodeNormalizedFen(originals[0].normalizedFen);
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "positionData" = ${existing} WHERE id = 1`;
  const report = await pilotBackfillPositionData(database, log);
  assert.deepEqual([report.selected, report.written, report.validated, report.mismatches], [100, 100, 100, 0]);
  assert.deepEqual(report.byteLengthDistribution, [{ bytes: 34, rows: 100 }]);
  assert.equal(report.samples.length, 3);
  assert.deepEqual(report.samples.map((row) => row.id), [2, 3, 4]);
  const rows = await readRows();
  for (const [index, row] of rows.entries()) {
    assert.equal(row.id, originals[index].id);
    assert.equal(row.normalizedFen, originals[index].normalizedFen);
    assert.deepEqual(row.positionKey, originals[index].positionKey);
    if (row.id <= 101) assert.equal(decodeNormalizedFen(row.positionData), row.normalizedFen);
    else assert.equal(row.positionData, null, 'the pilot stops at 100 instead of continuing in batches');
  }
  assert.deepEqual(rows[0].positionData, existing);
  const [averages] = await database.$queryRaw`
    SELECT AVG(pg_column_size("normalizedFen"))::double precision AS old,
           AVG(pg_column_size("positionData"))::double precision AS new
    FROM "ImportedGamePosition" WHERE id BETWEEN 2 AND 101
  `;
  assert.equal(report.averageFenStorageBytes, averages.old);
  assert.equal(report.averagePositionDataStorageBytes, averages.new);
  console.log(`100-row fixture pilot report: ${JSON.stringify(report, null, 2)}`);

  const tail = await pilotBackfillPositionData(database, log);
  assert.deepEqual([tail.selected, tail.written, tail.validated, tail.mismatches], [6, 6, 6, 0]);
  const empty = await pilotBackfillPositionData(database, log);
  assert.deepEqual([empty.selected, empty.written, empty.validated, empty.mismatches], [0, 0, 0, 0]);
  assert.deepEqual(empty.byteLengthDistribution, []);
  assert.equal(empty.averageFenStorageBytes, null);
  assert.equal(empty.averagePositionDataStorageBytes, null);

  // One malformed FEN at the end must abort before any row is written.
  await resetData();
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "normalizedFen" = 'bad' WHERE id = 100`;
  await assert.rejects(pilotBackfillPositionData(database, log), /position id=100\noriginal FEN=bad\ndecoded FEN=<not decoded>/);
  assert.ok((await readRows()).every((row) => row.positionData === null));
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "normalizedFen" = ${originals[99].normalizedFen} WHERE id = 100`;

  // Simulate PostgreSQL storing valid bytes for the wrong FEN; readback must roll back all 100 writes.
  const wrongData = encodeNormalizedFen(originals[0].normalizedFen);
  await database.$executeRawUnsafe(`
    CREATE FUNCTION "${schema}".corrupt_pilot_data() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id = 100 THEN NEW."positionData" := decode('${Buffer.from(wrongData).toString('hex')}', 'hex'); END IF;
    RETURN NEW; END $$
  `);
  await database.$executeRawUnsafe(`
    CREATE TRIGGER corrupt_pilot_data BEFORE UPDATE OF "positionData" ON "ImportedGamePosition"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".corrupt_pilot_data()
  `);
  await assert.rejects(pilotBackfillPositionData(database, log), (error) => {
    assert.match(error.message, /Exact FEN round trip mismatch/);
    assert.ok(error.message.includes(`position id=100\noriginal FEN=${originals[99].normalizedFen}\ndecoded FEN=${originals[0].normalizedFen}`));
    return true;
  });
  assert.ok((await readRows()).every((row) => row.positionData === null), 'readback failures roll back the entire pilot');
  assert.ok(messages.some((message) => message.includes('"mismatches":1')));
  assert.ok(messages.some((message) => message.includes('"written":0')));
  await database.$executeRaw`DROP TRIGGER corrupt_pilot_data ON "ImportedGamePosition"`;

  // An invalid stored payload must also identify the row and abort, rather than silently skipping it.
  await database.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION "${schema}".corrupt_pilot_data() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.id = 100 THEN NEW."positionData" := decode('ff', 'hex'); END IF;
    RETURN NEW; END $$
  `);
  await database.$executeRawUnsafe(`
    CREATE TRIGGER corrupt_pilot_data BEFORE UPDATE OF "positionData" ON "ImportedGamePosition"
    FOR EACH ROW EXECUTE FUNCTION "${schema}".corrupt_pilot_data()
  `);
  await assert.rejects(pilotBackfillPositionData(database, log), /expected 34 bytes[\s\S]*position id=100[\s\S]*decoded FEN=<not decoded>/);
  assert.ok((await readRows()).every((row) => row.positionData === null));
  console.log('Position-data pilot migration, 100-row bound, smaller/empty selection and rollback tests passed.');
} finally {
  await database.$executeRaw(Prisma.sql`DROP SCHEMA IF EXISTS ${schemaSql} CASCADE`);
  await database.$disconnect();
}
