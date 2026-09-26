import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  decodeNormalizedFen, encodeNormalizedFen, decodeNormalizedFenCompact, encodeNormalizedFenCompact,
} from 'chess-domain';
import prisma from '../prisma';

const COMPARISON_LIMIT = 100;
const PROJECTED_POSITIONS = 771646;
type ComparisonRow = {
  id: number;
  normalizedFen: string;
  positionData: Uint8Array;
  averageFenStorageBytes: number;
  averageStoredFixedPayloadBytes: number;
};

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** Only the existing pilot selection is inspected, inside an enforced read-only transaction. */
export async function comparePositionCodecs(database: PrismaClient = prisma, log: (message: string) => void = console.log) {
  const rows = await database.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return tx.$queryRaw<ComparisonRow[]>`
      WITH pilot AS (
        SELECT "id", "normalizedFen", "positionData"
        FROM "ImportedGamePosition"
        WHERE "positionData" IS NOT NULL
        ORDER BY "id" ASC
        LIMIT ${COMPARISON_LIMIT}
      )
      SELECT "id", "normalizedFen", "positionData",
             (AVG(pg_column_size("normalizedFen")) OVER ())::double precision AS "averageFenStorageBytes",
             (AVG(octet_length("positionData")) OVER ())::double precision AS "averageStoredFixedPayloadBytes"
      FROM pilot
      ORDER BY "id" ASC
    `;
  }, { maxWait: 5000, timeout: 30000 });
  if (rows.length > COMPARISON_LIMIT) throw new Error('Comparison exceeded the hard 100-row limit');

  const sizes: number[] = [];
  const distribution = new Map<number, number>();
  const samples: Array<{
    id: number; normalizedFen: string; pieceCount: number;
    fixedBytes: number; compactBytes: number; decodedCompactFen: string;
  }> = [];
  let totalPieces = 0;
  for (const row of rows) {
    let decodedFixedFen = '<not decoded>', decodedCompactFen = '<not decoded>';
    try {
      const fixed = encodeNormalizedFen(row.normalizedFen);
      const compact = encodeNormalizedFenCompact(row.normalizedFen);
      decodedFixedFen = decodeNormalizedFen(fixed);
      decodedCompactFen = decodeNormalizedFenCompact(compact);
      if (decodedFixedFen !== row.normalizedFen || decodedCompactFen !== row.normalizedFen) {
        throw new Error('Exact FEN round-trip mismatch');
      }
      if (!equalBytes(fixed, row.positionData) || decodeNormalizedFen(row.positionData) !== row.normalizedFen) {
        throw new Error('Stored baseline does not match the FEN');
      }
      if (!equalBytes(encodeNormalizedFenCompact(decodedCompactFen), compact)) {
        throw new Error('Compact byte round-trip mismatch');
      }
      const pieceCount = row.normalizedFen.split(' ')[0].match(/[pnbrqk]/gi)!.length;
      if (compact.length !== 10 + Math.ceil(pieceCount / 2) || compact.length > 26) {
        throw new Error('Unexpected compact length');
      }
      totalPieces += pieceCount;
      sizes.push(compact.length);
      distribution.set(compact.length, (distribution.get(compact.length) ?? 0) + 1);
      if (samples.length < 3) samples.push({
        id: row.id, normalizedFen: row.normalizedFen, pieceCount,
        fixedBytes: fixed.length, compactBytes: compact.length, decodedCompactFen,
      });
    } catch (error) {
      const message = [
        `Position-codec comparison aborted: rowCount=${rows.length} checked=${sizes.length} roundTripFailures=1`,
        `position id=${row.id}`, `original FEN=${row.normalizedFen}`,
        `decoded fixed FEN=${decodedFixedFen}`, `decoded compact FEN=${decodedCompactFen}`,
        String(error),
      ].join('\n');
      log(message);
      throw new Error(message);
    }
  }
  sizes.sort((a, b) => a - b);
  const count = sizes.length;
  const averageCompactBytes = count ? sizes.reduce((sum, size) => sum + size, 0) / count : null;
  const fixedRawBytes = PROJECTED_POSITIONS * 34;
  const compactRawBytes = averageCompactBytes === null ? null : Math.round(PROJECTED_POSITIONS * averageCompactBytes);
  const report = {
    rowCount: count, roundTripFailures: 0,
    minCompactBytes: count ? sizes[0] : null,
    maxCompactBytes: count ? sizes[count - 1] : null,
    averageCompactBytes,
    medianCompactBytes: count ? (sizes[Math.floor((count - 1) / 2)] + sizes[Math.floor(count / 2)]) / 2 : null,
    // Nearest-rank percentile: the sorted element at ceil(0.9 * count) - 1.
    p90CompactBytes: count ? sizes[Math.ceil(0.9 * count) - 1] : null,
    averagePieceCount: count ? totalPieces / count : null,
    averageCurrentFixedPayloadBytes: rows[0]?.averageStoredFixedPayloadBytes ?? null,
    averageFenStorageBytes: rows[0]?.averageFenStorageBytes ?? null,
    projection: {
      positions: PROJECTED_POSITIONS, fixedRawBytes, compactRawBytes,
      rawSavingsBytes: compactRawBytes === null ? null : fixedRawBytes - compactRawBytes,
      rawSavingsPercent: averageCompactBytes === null ? null : (34 - averageCompactBytes) / 34 * 100,
      basis: 'First 100 populated pilot rows; extrapolation, not a full-table measurement',
    },
    distribution: [...distribution].sort(([a], [b]) => a - b).map(([bytes, positions]) => ({ bytes, positions })),
    samples,
  };
  log(`Position-codec comparison (read only): ${JSON.stringify(report, null, 2)}`);
  log(`bytes | positions\n${report.distribution.map((row) => `${row.bytes} | ${row.positions}`).join('\n')}`);
  return report;
}

if (require.main === module) {
  Promise.resolve().then(() => {
    if (process.argv.length > 2) throw new Error('Usage: compare-position-codecs.ts (no arguments; read-only limit is 100)');
    return comparePositionCodecs();
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
