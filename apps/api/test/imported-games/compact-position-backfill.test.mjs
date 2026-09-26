import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Prisma, PrismaClient } from '@prisma/client';
import { Chess } from 'chess.js';
import { normalizeFenForPosition, encodeNormalizedFen, encodeNormalizedFenCompact, decodeNormalizedFenCompact } from 'chess-domain';
import { backfillCompactPositionData, compactBatchSize } from '../../dist/scripts/backfill-compact-position-data.js';
import { assertCompactIndexReady, indexCompactPositionData, compactIndexStatus } from '../../dist/scripts/index-compact-position-data.js';
import { measureCompactPositionData } from '../../dist/scripts/measure-compact-position-data.js';
import { benchmarkPositionLookups } from '../../dist/scripts/benchmark-position-lookups.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

const schema = `compact_shadow_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema', schema);
const database = new PrismaClient({ datasourceUrl: url.toString() });
const schemaSql = Prisma.raw(`"${schema}"`);
const messages = [], log = message => messages.push(message);
const migration = await readFile(new URL('../../prisma/migrations/20260926160000_add_compact_position_shadow/migration.sql', import.meta.url), 'utf8');
assert.equal(migration.trim(), 'ALTER TABLE "ImportedGamePosition" ADD COLUMN "positionDataCompact" BYTEA;');
for (const size of [0, -1, 5001, 1.5, NaN]) assert.throws(() => compactBatchSize(size));

const fens = new Set();
let chess = new Chess(), seed = 0xabcdef;
while (fens.size < 2107) {
  fens.add(normalizeFenForPosition(chess.fen()));
  if (chess.isGameOver()) chess = new Chess();
  else { const moves = chess.moves(); seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; chess.move(moves[seed % moves.length]); }
}
const originals = [...fens].map((normalizedFen, index) => ({ id: index + 1, normalizedFen,
  positionKey: new Uint8Array(positionKeyForNormalizedFen(normalizedFen)), positionData: index < 100 ? encodeNormalizedFen(normalizedFen) : null }));
const read = () => database.$queryRaw`SELECT * FROM "ImportedGamePosition" ORDER BY id`;

try {
  await database.$executeRaw(Prisma.sql`CREATE SCHEMA ${schemaSql}`);
  await database.$executeRaw`CREATE TABLE "ImportedGamePosition" (id integer PRIMARY KEY, "normalizedFen" varchar(120) NOT NULL, "positionKey" bytea NOT NULL UNIQUE, "positionData" bytea)`;
  const fixtureValues = originals.map(row => Prisma.sql`(${row.id}, ${row.normalizedFen}, ${row.positionKey}, ${row.positionData})`);
  await database.$executeRaw(Prisma.sql`INSERT INTO "ImportedGamePosition" (id, "normalizedFen", "positionKey", "positionData") VALUES ${Prisma.join(fixtureValues)}`);
  const beforeIndexes = await database.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ${schema} ORDER BY indexname`;
  const preflight = await backfillCompactPositionData(database, { preflight: true, log });
  assert.equal(preflight.written, 0); assert.equal(preflight.validation.validated, 2107);
  assert.equal(preflight.validation.preflight, true); assert.equal(preflight.validation.nullCompact, null);
  assert.ok(preflight.validation.expectedCompactPayloadBytes > 0);
  await database.$executeRawUnsafe(migration);
  assert.deepEqual(await database.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ${schema} ORDER BY indexname`, beforeIndexes);
  await assert.rejects(assertCompactIndexReady(database), /2107 NULL/);
  await assert.rejects(benchmarkPositionLookups(database, log), /requires the validated compact UNIQUE index/);

  const already = encodeNormalizedFenCompact(originals[0].normalizedFen);
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "positionDataCompact" = ${already} WHERE id = 1`;
  await assert.rejects(backfillCompactPositionData(database, { batchSize: 1000, log(message) {
    log(message); if (message.startsWith('Compact backfill committed:')) throw new Error('Simulated interruption after a committed batch');
  } }), /Simulated interruption/);
  assert.equal((await database.$queryRaw`SELECT COUNT(*)::integer AS filled FROM "ImportedGamePosition" WHERE "positionDataCompact" IS NOT NULL`)[0].filled, 1001);
  const resumed = await backfillCompactPositionData(database, { batchSize: 1000, log });
  assert.equal(resumed.written, 1106);
  assert.equal(resumed.validated, 1106);
  assert.equal(resumed.batches, 2);
  assert.equal(resumed.validation.totalPositions, 2107);
  assert.equal(resumed.validation.nullCompact, 0);
  assert.equal(resumed.validation.mismatches, 0);
  assert.equal((await backfillCompactPositionData(database, { log })).written, 0, 'idempotent restart writes nothing');
  assert.equal((await backfillCompactPositionData(database, { validateOnly: true, log })).written, 0);
  const completed = await read();
  for (const [index, row] of completed.entries()) {
    assert.equal(decodeNormalizedFenCompact(row.positionDataCompact), row.normalizedFen);
    assert.equal(row.normalizedFen, originals[index].normalizedFen);
    assert.deepEqual(row.positionKey, originals[index].positionKey);
    assert.deepEqual(row.positionData, originals[index].positionData, 'all fixed pilot bytes are retained');
  }
  assert.deepEqual(completed[0].positionDataCompact, already);
  const sizes = completed.map(row => row.positionDataCompact.length).sort((a, b) => a - b);
  const pieces = completed.map(row => row.normalizedFen.split(' ')[0].match(/[pnbrqk]/gi).length).sort((a, b) => a - b);
  for (const [summary, values] of [[resumed.validation.compactBytes, sizes], [resumed.validation.pieceCount, pieces]]) {
    assert.equal(summary.min, values[0]); assert.equal(summary.max, values.at(-1));
    assert.equal(summary.avg, values.reduce((a, b) => a + b, 0) / values.length);
    assert.equal(summary.median, values[1053]);
    assert.equal(summary.p90, values[Math.ceil(values.length * .9) - 1]);
    assert.equal(summary.p99, values[Math.ceil(values.length * .99) - 1]);
  }

  // Detect same-FEN duplicates and different-FEN conflicts before any index creation.
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "positionDataCompact" = ${already} WHERE id = 2`;
  await assert.rejects(indexCompactPositionData(database, { log }), /duplicate canonical bytes[\s\S]*differentFens=2[\s\S]*"id":1[\s\S]*"id":2/);
  assert.deepEqual(await compactIndexStatus(database), []);
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "normalizedFen" = ${originals[0].normalizedFen} WHERE id = 2`;
  await assert.rejects(assertCompactIndexReady(database), /differentFens=1/);
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "normalizedFen" = ${originals[1].normalizedFen}, "positionDataCompact" = ${encodeNormalizedFenCompact(originals[1].normalizedFen)} WHERE id = 2`;

  const indexed = await indexCompactPositionData(database, { batchSize: 1000, log });
  assert.equal(indexed.index.valid, true); assert.equal(indexed.index.unique, true);
  assert.deepEqual(indexed.index.columns, ['positionDataCompact']);
  assert.equal((await indexCompactPositionData(database, { log })).index.valid, true, 'valid operational index creation is idempotent');
  const nullable = await database.$queryRaw`SELECT is_nullable, column_default FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'ImportedGamePosition' AND column_name = 'positionDataCompact'`;
  assert.equal(nullable[0].is_nullable, 'YES'); assert.equal(nullable[0].column_default, null);
  const measurements = await measureCompactPositionData(database, log);
  assert.equal(measurements.columns.rowCount, 2107); assert.equal(measurements.columns.nullCompact, 0); assert.equal(measurements.columns.fixedPilotRows, 100);
  assert.equal(measurements.columns.totalCompactPayloadBytes, sizes.reduce((a, b) => a + b, 0));
  assert.ok(measurements.indexes.some(row => row.name === 'ImportedGamePosition_positionDataCompact_key' && row.bytes > 0));
  const benchmark = await benchmarkPositionLookups(database, log);
  assert.equal(benchmark.sampledPositions, 100); assert.equal(benchmark.mismatches, 0); assert.equal(benchmark.explainQueries, 8);
  assert.equal(benchmark.results.at(-1).pattern, 'batch IN');
  assert.ok(benchmark.results.at(-1).methods.every(method => method.rows === 100));
  assert.ok(benchmark.results.every(test => test.methods.every(method => method.explain.Plan && method.executionTimeMs >= 0)));

  // A malformed row rolls back its entire batch; a previous committed batch remains restartable.
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "positionDataCompact" = NULL WHERE id BETWEEN 2 AND 5`;
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "normalizedFen" = 'bad' WHERE id = 5`;
  await assert.rejects(backfillCompactPositionData(database, { batchSize: 2, log }), /id=5\nFEN=bad\nencoded length=<not encoded>\ndecoded FEN=<not decoded>/);
  const failed = await read();
  assert.ok(failed[1].positionDataCompact && failed[2].positionDataCompact);
  assert.equal(failed[3].positionDataCompact, null); assert.equal(failed[4].positionDataCompact, null);
  await database.$executeRaw`UPDATE "ImportedGamePosition" SET "normalizedFen" = ${originals[4].normalizedFen} WHERE id = 5`;

  // Corrupt valid DB readback without triggering a unique conflict; verify all writes roll back.
  const corruptFen = '7k/8/8/8/8/8/8/K7 b - -';
  const corruptHex = Buffer.from(encodeNormalizedFenCompact(corruptFen)).toString('hex');
  await database.$executeRawUnsafe(`CREATE FUNCTION "${schema}".corrupt_shadow() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id=5 THEN NEW."positionDataCompact" := decode('${corruptHex}', 'hex'); END IF; RETURN NEW; END $$`);
  await database.$executeRawUnsafe(`CREATE TRIGGER corrupt_shadow BEFORE UPDATE OF "positionDataCompact" ON "ImportedGamePosition" FOR EACH ROW EXECUTE FUNCTION "${schema}".corrupt_shadow()`);
  await assert.rejects(backfillCompactPositionData(database, { batchSize: 1000, log }), error => {
    assert.ok(error.message.includes(`id=5\nFEN=${originals[4].normalizedFen}`));
    assert.ok(error.message.includes(`encoded length=11\ndecoded FEN=${corruptFen}`)); return true;
  });
  const corrupted = await read(); assert.equal(corrupted[3].positionDataCompact, null); assert.equal(corrupted[4].positionDataCompact, null);
  await database.$executeRaw`DROP TRIGGER corrupt_shadow ON "ImportedGamePosition"`;
  assert.equal((await backfillCompactPositionData(database, { log })).written, 2);
  assert.equal((await database.$queryRaw`SELECT COUNT(*)::integer AS nulls FROM "ImportedGamePosition" WHERE "positionDataCompact" IS NULL`)[0].nulls, 0);
  console.log('Compact shadow migration, 2107-row resumable/atomic backfill, fixed baseline retention, full statistics, duplicate guards, concurrent unique index and bounded lookup comparison tests passed.');
} finally {
  await database.$executeRaw(Prisma.sql`DROP SCHEMA IF EXISTS ${schemaSql} CASCADE`);
  await database.$disconnect();
}
