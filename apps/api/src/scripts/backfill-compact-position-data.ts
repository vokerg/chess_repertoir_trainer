import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { decodeNormalizedFenCompact, encodeNormalizedFenCompact } from 'chess-domain';
import prisma from '../prisma';

type Row = { id: number; normalizedFen: string; positionDataCompact?: Uint8Array | null };
type Histogram = Map<number, number>;
export type CompactMaintenanceOptions = { batchSize?: number; validateOnly?: boolean; preflight?: boolean; log?: (message: string) => void };

export function compactBatchSize(value = 1000): number {
  if (!Number.isInteger(value) || value < 1 || value > 5000) throw new Error('Batch size must be an integer from 1 to 5000');
  return value;
}

function verify(row: Row, data: Uint8Array | null | undefined): number {
  let decoded = '<not decoded>';
  try {
    if (!data) throw new Error('Missing compact data');
    decoded = decodeNormalizedFenCompact(data);
    if (decoded !== row.normalizedFen) throw new Error('Exact normalized FEN mismatch');
    const canonical = encodeNormalizedFenCompact(decoded);
    if (canonical.length !== data.length || !canonical.every((byte, index) => byte === data[index])) throw new Error('Noncanonical compact bytes');
    return row.normalizedFen.split(' ')[0].match(/[pnbrqk]/gi)!.length;
  } catch (error) {
    throw new Error(`Compact validation failed: id=${row.id}\nFEN=${row.normalizedFen}\nencoded length=${data?.length ?? 'NULL'}\ndecoded FEN=${decoded}\n${String(error)}`);
  }
}

function encode(row: Row): Uint8Array {
  let data: Uint8Array | undefined;
  try { data = encodeNormalizedFenCompact(row.normalizedFen); }
  catch (error) {
    throw new Error(`Compact encoding failed: id=${row.id}\nFEN=${row.normalizedFen}\nencoded length=<not encoded>\ndecoded FEN=<not decoded>\n${String(error)}`);
  }
  verify(row, data);
  return data;
}

function add(histogram: Histogram, value: number) { histogram.set(value, (histogram.get(value) ?? 0) + 1); }
function distribution(histogram: Histogram) { return [...histogram].sort(([a], [b]) => a - b).map(([value, positions]) => ({ value, positions })); }
function summarize(histogram: Histogram) {
  const rows = distribution(histogram);
  const count = rows.reduce((sum, row) => sum + row.positions, 0);
  const at = (rank: number) => {
    let accumulated = 0;
    for (const row of rows) { accumulated += row.positions; if (accumulated >= rank) return row.value; }
    return null;
  };
  return {
    min: rows[0]?.value ?? null,
    avg: count ? rows.reduce((sum, row) => sum + row.value * row.positions, 0) / count : null,
    median: count ? (at(Math.floor((count + 1) / 2))! + at(Math.floor(count / 2) + 1)!) / 2 : null,
    p90: count ? at(Math.ceil(count * 0.9)) : null,
    p99: count ? at(Math.ceil(count * 0.99)) : null,
    max: rows.at(-1)?.value ?? null,
    distribution: rows,
  };
}

/** Stable read-only snapshot; every row is decoded in bounded primary-key pages. */
export async function validateCompactPositionData(database: PrismaClient = prisma, options: CompactMaintenanceOptions = {}) {
  const batchSize = compactBatchSize(options.batchSize);
  const log = options.log ?? console.log;
  return database.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    let cursor = 0, validated = 0, batches = 0;
    const bytes: Histogram = new Map(), pieces: Histogram = new Map();
    for (;;) {
      const rows = await tx.$queryRaw<Row[]>(Prisma.sql`
        SELECT id, "normalizedFen" ${options.preflight ? Prisma.empty : Prisma.sql`, "positionDataCompact"`} FROM "ImportedGamePosition"
        WHERE id > ${cursor} ORDER BY id ASC LIMIT ${batchSize}
      `);
      if (!rows.length) break;
      for (const row of rows) {
        const data = options.preflight ? encode(row) : row.positionDataCompact;
        add(pieces, verify(row, data)); add(bytes, data!.length);
      }
      validated += rows.length; cursor = rows[rows.length - 1].id; batches++;
      log(`Compact ${options.preflight ? 'FEN preflight' : 'full validation'}: ${JSON.stringify({ batches, validated, failures: 0, lastId: cursor })}`);
    }
    const [storage] = await tx.$queryRaw<Array<{
      totalPositions: number; nullCompact: number | null; totalFenStorageBytes: number;
      totalKeyStorageBytes: number; totalCompactStorageBytes: number | null; totalCompactPayloadBytes: number | null;
      averageFenStorageBytes: number | null; averageKeyStorageBytes: number | null; averageCompactStorageBytes: number | null;
    }>>(Prisma.sql`
      SELECT COUNT(*)::integer AS "totalPositions",
             ${options.preflight ? Prisma.sql`NULL::integer` : Prisma.sql`COUNT(*) FILTER (WHERE "positionDataCompact" IS NULL)::integer`} AS "nullCompact",
             COALESCE(SUM(pg_column_size("normalizedFen")), 0)::double precision AS "totalFenStorageBytes",
             COALESCE(SUM(pg_column_size("positionKey")), 0)::double precision AS "totalKeyStorageBytes",
             ${options.preflight ? Prisma.sql`NULL::double precision` : Prisma.sql`COALESCE(SUM(pg_column_size("positionDataCompact")), 0)::double precision`} AS "totalCompactStorageBytes",
             ${options.preflight ? Prisma.sql`NULL::double precision` : Prisma.sql`COALESCE(SUM(octet_length("positionDataCompact")), 0)::double precision`} AS "totalCompactPayloadBytes",
             AVG(pg_column_size("normalizedFen"))::double precision AS "averageFenStorageBytes",
             AVG(pg_column_size("positionKey"))::double precision AS "averageKeyStorageBytes",
             ${options.preflight ? Prisma.sql`NULL::double precision` : Prisma.sql`AVG(pg_column_size("positionDataCompact"))::double precision`} AS "averageCompactStorageBytes"
      FROM "ImportedGamePosition"
    `);
    if ((!options.preflight && storage.nullCompact !== 0) || storage.totalPositions !== validated) throw new Error(`Full compact validation incomplete: ${JSON.stringify({ ...storage, validated })}`);
    const expectedCompactPayloadBytes = distribution(bytes).reduce((sum, row) => sum + row.value * row.positions, 0);
    const report = { ...storage, preflight: options.preflight ?? false, expectedCompactPayloadBytes, validated, mismatches: 0, compactBytes: summarize(bytes), pieceCount: summarize(pieces) };
    log(`Compact ${options.preflight ? 'FEN preflight' : 'full validation'} complete: ${JSON.stringify(report, null, 2)}`);
    return report;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 1800000 });
}

/** Only NULL shadow values are updated. A failed batch rolls back; earlier batches remain committed. */
export async function backfillCompactPositionData(database: PrismaClient = prisma, options: CompactMaintenanceOptions = {}) {
  const batchSize = compactBatchSize(options.batchSize);
  const log = options.log ?? console.log;
  const progress = { batches: 0, scanned: 0, written: 0, validated: 0, failures: 0, lastId: 0 };
  const bytes: Histogram = new Map(), pieces: Histogram = new Map();
  try {
    if (!options.validateOnly && !options.preflight) for (;;) {
      const committed = await database.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
        const rows = await tx.$queryRaw<Row[]>`
          SELECT id, "normalizedFen" FROM "ImportedGamePosition"
          WHERE "positionDataCompact" IS NULL AND id > ${progress.lastId}
          ORDER BY id ASC LIMIT ${batchSize} FOR UPDATE
        `;
        if (!rows.length) return null;
        progress.scanned += rows.length;
        const values = rows.map((row) => Prisma.sql`(${row.id}::integer, ${row.normalizedFen}::text, ${encode(row)}::bytea)`);
        const written = await tx.$executeRaw(Prisma.sql`
          UPDATE "ImportedGamePosition" AS position SET "positionDataCompact" = payload.data
          FROM (VALUES ${Prisma.join(values)}) AS payload(id, fen, data)
          WHERE position.id = payload.id AND position."normalizedFen" = payload.fen AND position."positionDataCompact" IS NULL
        `);
        const stored = await tx.$queryRaw<Row[]>(Prisma.sql`
          SELECT id, "normalizedFen", "positionDataCompact" FROM "ImportedGamePosition"
          WHERE id IN (${Prisma.join(rows.map((row) => row.id))}) ORDER BY id ASC
        `);
        const byId = new Map(stored.map((row) => [row.id, row]));
        const entries = rows.map((original) => {
          const row = byId.get(original.id);
          const pieceCount = verify(original, row?.positionDataCompact);
          if (row!.normalizedFen !== original.normalizedFen) throw new Error(`Stored FEN changed: id=${original.id} FEN=${original.normalizedFen} encoded length=${row!.positionDataCompact!.length} decoded FEN=${decodeNormalizedFenCompact(row!.positionDataCompact!)}`);
          return { bytes: row!.positionDataCompact!.length, pieceCount };
        });
        if (written !== rows.length) throw new Error(`Batch write count mismatch: expected=${rows.length} written=${written}`);
        return { rows, written, entries };
      }, { maxWait: 10000, timeout: 60000 });
      if (!committed) break;
      progress.batches++; progress.written += committed.written; progress.validated += committed.rows.length;
      progress.lastId = committed.rows[committed.rows.length - 1].id;
      for (const row of committed.entries) { add(bytes, row.bytes); add(pieces, row.pieceCount); }
      log(`Compact backfill committed: ${JSON.stringify({ ...progress, compactByteDistribution: distribution(bytes), pieceCountDistribution: distribution(pieces) })}`);
    }
    const validation = await validateCompactPositionData(database, options);
    const report = { ...progress, validation };
    log(`Compact ${options.preflight ? 'read-only preflight' : 'backfill'} complete: ${JSON.stringify(report, null, 2)}`);
    return report;
  } catch (error) {
    progress.failures++;
    log(`Compact backfill stopped; current batch rolled back if uncommitted: ${JSON.stringify(progress)}\n${String(error)}`);
    throw error;
  }
}

if (require.main === module) {
  Promise.resolve().then(() => {
    const options: CompactMaintenanceOptions = {};
    for (const arg of process.argv.slice(2)) {
      if (arg === '--validate-only' && !options.validateOnly) options.validateOnly = true;
      else if (arg === '--preflight' && !options.preflight) options.preflight = true;
      else if (/^--batch-size=\d+$/.test(arg) && options.batchSize === undefined) options.batchSize = compactBatchSize(Number(arg.slice(13)));
      else throw new Error('Usage: backfill-compact-position-data.ts [--batch-size=1..5000] [--validate-only | --preflight]');
    }
    if (options.validateOnly && options.preflight) throw new Error('--preflight and --validate-only are mutually exclusive');
    return backfillCompactPositionData(prisma, options);
  }).catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
}
