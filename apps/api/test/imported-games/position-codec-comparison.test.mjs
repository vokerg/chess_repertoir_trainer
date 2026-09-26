import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { encodeNormalizedFen } from 'chess-domain';
import { comparePositionCodecs } from '../../dist/scripts/compare-position-codecs.js';

const fens = [
  '7k/8/8/8/8/8/8/K7 w - -',
  '7k/8/8/8/8/1N6/8/K7 w - -',
  'rnbqkbnr/pppppppp/8/8/8/8/8/RNBQKBNR w KQkq -',
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
];
const source = Array.from({ length: 105 }, (_, index) => ({
  id: index + 1, normalizedFen: fens[index % 4], positionData: encodeNormalizedFen(fens[index % 4]),
}));
source.push({ id: 0, normalizedFen: fens[0], positionData: null });
source.reverse();

function readOnlyDatabase(input) {
  const calls = [];
  return {
    calls,
    async $transaction(callback, options) {
      assert.deepEqual(options, { maxWait: 5000, timeout: 30000 });
      let readOnly = false;
      const tx = {
        async $executeRaw(strings, ...values) {
          const sql = strings.join('?').trim();
          assert.equal(sql, 'SET TRANSACTION READ ONLY', 'only read-only transaction configuration is permitted');
          assert.equal(values.length, 0);
          readOnly = true;
          calls.push(sql);
          return 0;
        },
        async $queryRaw(strings, ...values) {
          assert.equal(readOnly, true, 'enforce PostgreSQL read-only mode before selection');
          const sql = strings.join('?');
          assert.doesNotMatch(sql, /\b(UPDATE|INSERT|DELETE|ALTER|CREATE|DROP|TRUNCATE|FOR UPDATE)\b/i);
          assert.match(sql, /WHERE "positionData" IS NOT NULL\s+ORDER BY "id" ASC\s+LIMIT \?/);
          assert.match(sql, /AVG\(pg_column_size\("normalizedFen"\)\)/);
          assert.match(sql, /AVG\(octet_length\("positionData"\)\)/);
          assert.deepEqual(values, [100]);
          calls.push(sql);
          const selected = input.filter(row => row.positionData !== null).sort((a, b) => a.id - b.id).slice(0, values[0]);
          const averageFenStorageBytes = selected.reduce((sum, row) => sum + row.normalizedFen.length + 1, 0) / selected.length;
          const averageStoredFixedPayloadBytes = selected.reduce((sum, row) => sum + row.positionData.length, 0) / selected.length;
          return selected.map(row => ({ ...row, averageFenStorageBytes, averageStoredFixedPayloadBytes }));
        },
      };
      return callback(tx);
    },
  };
}

const messages = [];
const log = message => messages.push(message);
const snapshot = source.map(row => ({ ...row, positionData: row.positionData?.slice() ?? null }));
const database = readOnlyDatabase(source);
const report = await comparePositionCodecs(database, log);
assert.equal(database.calls.length, 2, 'one read-only setting and one bounded SELECT, no other calls');
assert.deepEqual(source, snapshot, 'comparison does not mutate input FENs or stored bytes');
assert.equal(report.rowCount, 100);
assert.equal(report.roundTripFailures, 0);
assert.equal(report.minCompactBytes, 11);
assert.equal(report.maxCompactBytes, 26);
assert.equal(report.averageCompactBytes, 17.75);
assert.equal(report.medianCompactBytes, 17);
assert.equal(report.p90CompactBytes, 26);
assert.equal(report.averagePieceCount, 15.25);
assert.equal(report.averageCurrentFixedPayloadBytes, 34);
assert.equal(report.averageFenStorageBytes, snapshot.filter(row => row.id >= 1 && row.id <= 100).reduce((sum, row) => sum + row.normalizedFen.length + 1, 0) / 100);
assert.deepEqual(report.distribution, [11, 12, 22, 26].map(bytes => ({ bytes, positions: 25 })));
assert.equal(report.projection.positions, 771646);
assert.equal(report.projection.fixedRawBytes, 771646 * 34);
assert.equal(report.projection.compactRawBytes, Math.round(771646 * 17.75));
assert.equal(report.projection.rawSavingsBytes, report.projection.fixedRawBytes - report.projection.compactRawBytes);
assert.equal(report.projection.rawSavingsPercent, (34 - 17.75) / 34 * 100);
assert.deepEqual(report.samples.map(row => row.id), [1, 2, 3]);
assert.deepEqual(report.samples.map(row => row.pieceCount), [2, 3, 24]);
assert.ok(report.samples.every(row => row.normalizedFen === row.decodedCompactFen && row.fixedBytes === 34));
assert.ok(messages.some(message => message.includes('bytes | positions\n11 | 25')));

const small = await comparePositionCodecs(readOnlyDatabase(snapshot.filter(row => row.id <= 3)), log);
assert.equal(small.rowCount, 3);
assert.equal(small.medianCompactBytes, 12);
assert.equal(small.p90CompactBytes, 22);
const empty = await comparePositionCodecs(readOnlyDatabase([]), log);
assert.equal(empty.rowCount, 0);
assert.equal(empty.roundTripFailures, 0);
for (const field of ['minCompactBytes', 'maxCompactBytes', 'averageCompactBytes', 'medianCompactBytes', 'p90CompactBytes', 'averagePieceCount', 'averageCurrentFixedPayloadBytes', 'averageFenStorageBytes']) assert.equal(empty[field], null);
assert.equal(empty.projection.compactRawBytes, null);
assert.equal(empty.projection.rawSavingsBytes, null);
assert.equal(empty.projection.rawSavingsPercent, null);
assert.deepEqual(empty.distribution, []);
assert.deepEqual(empty.samples, []);

const corrupt = snapshot.filter(row => row.id >= 1 && row.id <= 100);
corrupt.find(row => row.id === 100).positionData = encodeNormalizedFen(fens[0]);
await assert.rejects(comparePositionCodecs(readOnlyDatabase(corrupt), log), /checked=99 roundTripFailures=1[\s\S]*position id=100[\s\S]*Stored baseline does not match/);
corrupt.find(row => row.id === 100).normalizedFen = 'bad';
await assert.rejects(comparePositionCodecs(readOnlyDatabase(corrupt), log), /position id=100\noriginal FEN=bad[\s\S]*Invalid normalized FEN/);

for (const argument of ['--all', '--limit=101']) {
  const cli = spawnSync(process.execPath, ['dist/scripts/compare-position-codecs.js', argument], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /no arguments; read-only limit is 100/);
}
console.log('Read-only position-codec comparison selection, statistics, percentiles, projections, unchanged bytes and fail-fast tests passed.');
