import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { decodeNormalizedFen, encodeNormalizedFen, POSITION_DATA_BYTES } from 'chess-domain';
import prisma from '../prisma';

const PILOT_LIMIT = 100;
type PositionRow = { id: number; normalizedFen: string };
type StoredRow = PositionRow & { positionData: Uint8Array | null };
type StorageAverages = { averageFenStorageBytes: number | null; averagePositionDataStorageBytes: number | null };

/** One batch only. No cursor, limit override, schema changes, or application writes. */
export async function pilotBackfillPositionData(
  database: PrismaClient = prisma,
  log: (message: string) => void = console.log,
) {
  const counts = { selected: 0, written: 0, validated: 0, mismatches: 0 };
  const fail = (row: PositionRow, decodedFen: string, reason: string): never => {
    counts.mismatches += 1;
    throw new Error([
      `Position-data pilot failed: ${reason}`,
      `position id=${row.id}`,
      `original FEN=${row.normalizedFen}`,
      `decoded FEN=${decodedFen}`,
    ].join('\n'));
  };
  const validate = (row: PositionRow, data: Uint8Array | null): string => {
    let decodedFen = '<not decoded>';
    try {
      if (data === null) throw new Error('positionData is NULL');
      decodedFen = decodeNormalizedFen(data);
      if (data.length !== POSITION_DATA_BYTES) throw new Error(`Expected ${POSITION_DATA_BYTES} bytes, got ${data.length}`);
      if (decodedFen !== row.normalizedFen) throw new Error('Exact FEN round trip mismatch');
    } catch (error) {
      fail(row, decodedFen, String(error));
    }
    return decodedFen;
  };

  try {
    const result = await database.$transaction(async (tx) => {
      // Locks keep the original FEN and selected rows stable until validation commits.
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      const rows = await tx.$queryRaw<PositionRow[]>`
        SELECT "id", "normalizedFen"
        FROM "ImportedGamePosition"
        WHERE "positionData" IS NULL
        ORDER BY "id" ASC
        LIMIT ${PILOT_LIMIT}
        FOR UPDATE
      `;
      counts.selected = rows.length;
      log(`Rows selected: ${counts.selected}`);
      if (rows.length > PILOT_LIMIT) throw new Error('Pilot selection exceeded the hard 100-row limit');
      if (!rows.length) {
        return {
          byteLengthDistribution: [] as Array<{ bytes: number; rows: number }>,
          averageFenStorageBytes: null,
          averagePositionDataStorageBytes: null,
          samples: [] as Array<PositionRow & { byteLength: number; decodedNormalizedFen: string }>,
        };
      }

      // Prevalidate the entire bounded selection before writing any row.
      const payload = rows.map((row) => {
        let data: Uint8Array;
        try {
          data = encodeNormalizedFen(row.normalizedFen);
        } catch (error) {
          return fail(row, '<not decoded>', String(error));
        }
        if (data.length !== POSITION_DATA_BYTES) fail(row, '<not decoded>', `Encoded length ${data.length}`);
        validate(row, data);
        return Prisma.sql`(${row.id}::integer, ${row.normalizedFen}::text, ${data}::bytea)`;
      });
      counts.written = await tx.$executeRaw(Prisma.sql`
        UPDATE "ImportedGamePosition" AS position
        SET "positionData" = payload."positionData"
        FROM (VALUES ${Prisma.join(payload)}) AS payload("id", "normalizedFen", "positionData")
        WHERE position."id" = payload."id"
          AND position."normalizedFen" = payload."normalizedFen"
          AND position."positionData" IS NULL
      `);
      log(`Rows written (pending commit): ${counts.written}`);

      const ids = Prisma.join(rows.map((row) => row.id));
      const storedRows = await tx.$queryRaw<StoredRow[]>(Prisma.sql`
        SELECT "id", "normalizedFen", "positionData"
        FROM "ImportedGamePosition"
        WHERE "id" IN (${ids})
        ORDER BY "id" ASC
      `);
      const storedById = new Map(storedRows.map((row) => [row.id, row]));
      const samples: Array<PositionRow & { byteLength: number; decodedNormalizedFen: string }> = [];
      for (const original of rows) {
        const stored = storedById.get(original.id);
        if (!stored) return fail(original, '<missing row>', 'Selected row missing on readback');
        const decodedNormalizedFen = validate(original, stored.positionData);
        if (stored.normalizedFen !== original.normalizedFen) fail(original, decodedNormalizedFen, 'Stored normalizedFen changed');
        counts.validated += 1;
        if (samples.length < 3) samples.push({
          id: stored.id,
          normalizedFen: stored.normalizedFen,
          byteLength: stored.positionData!.length,
          decodedNormalizedFen,
        });
      }
      if (counts.written !== counts.selected) {
        fail(rows[0], samples[0].decodedNormalizedFen, `Write count mismatch: selected=${counts.selected} written=${counts.written}`);
      }
      log(`Rows validated: ${counts.validated}`);

      // Both statistics are restricted to precisely the selected IDs.
      const byteLengthDistribution = await tx.$queryRaw<Array<{ bytes: number; rows: number }>>(Prisma.sql`
        SELECT octet_length("positionData") AS bytes, COUNT(*)::integer AS rows
        FROM "ImportedGamePosition"
        WHERE "id" IN (${ids})
        GROUP BY octet_length("positionData")
        ORDER BY bytes
      `);
      const [averages] = await tx.$queryRaw<StorageAverages[]>(Prisma.sql`
        SELECT AVG(pg_column_size("normalizedFen"))::double precision AS "averageFenStorageBytes",
               AVG(pg_column_size("positionData"))::double precision AS "averagePositionDataStorageBytes"
        FROM "ImportedGamePosition"
        WHERE "id" IN (${ids})
      `);
      return { byteLengthDistribution, ...averages, samples };
    }, { maxWait: 5000, timeout: 30000 });

    const report = { ...counts, ...result };
    log(`Position-data pilot committed: ${JSON.stringify(report, null, 2)}`);
    return report;
  } catch (error) {
    // No partial writes survive validation, readback, or statistics failures.
    log(`Position-data pilot rolled back: ${JSON.stringify({ ...counts, written: 0 })}`);
    throw error;
  }
}

if (require.main === module) {
  Promise.resolve().then(() => {
    if (process.argv.length > 2) throw new Error('Usage: pilot-backfill-position-data.ts (no arguments; limit is always 100)');
    return pilotBackfillPositionData();
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
