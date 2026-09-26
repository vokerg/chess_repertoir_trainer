import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma';
import { CompactMaintenanceOptions, validateCompactPositionData } from './backfill-compact-position-data';

export const COMPACT_POSITION_INDEX = 'ImportedGamePosition_positionDataCompact_key';

/** Database aggregates only; conflict output is bounded and always contains identifying FENs. */
export async function assertCompactIndexReady(database: PrismaClient = prisma) {
  return database.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [{ nulls }] = await tx.$queryRaw<Array<{ nulls: number }>>`
      SELECT COUNT(*)::integer AS nulls FROM "ImportedGamePosition" WHERE "positionDataCompact" IS NULL
    `;
    if (nulls) throw new Error(`Compact index refused: ${nulls} NULL values remain`);
    const duplicates = await tx.$queryRaw<Array<{ data: Uint8Array; positions: number; fens: number }>>`
      SELECT "positionDataCompact" AS data, COUNT(*)::integer AS positions, COUNT(DISTINCT "normalizedFen")::integer AS fens
      FROM "ImportedGamePosition" GROUP BY "positionDataCompact" HAVING COUNT(*) > 1 LIMIT 1
    `;
    if (duplicates.length) {
      const duplicate = duplicates[0];
      const conflicts = await tx.$queryRaw<Array<{ id: number; normalizedFen: string }>>`
        WITH representatives AS (
          SELECT DISTINCT ON ("normalizedFen") id, "normalizedFen" FROM "ImportedGamePosition"
          WHERE "positionDataCompact" = ${duplicate.data} ORDER BY "normalizedFen", id ASC LIMIT 10
        ), earliest AS (
          SELECT id, "normalizedFen" FROM "ImportedGamePosition"
          WHERE "positionDataCompact" = ${duplicate.data} ORDER BY id ASC LIMIT 10
        )
        SELECT id, "normalizedFen" FROM representatives UNION SELECT id, "normalizedFen" FROM earliest ORDER BY id ASC
      `;
      throw new Error(`Compact index refused: duplicate canonical bytes; positions=${duplicate.positions}; differentFens=${duplicate.fens}; conflicts=${JSON.stringify(conflicts)}`);
    }
    return { nulls: 0, duplicates: 0 };
  }, { maxWait: 10000, timeout: 120000, isolationLevel: 'RepeatableRead' });
}

export async function compactIndexStatus(database: PrismaClient = prisma) {
  return database.$queryRaw<Array<{
    indexName: string; valid: boolean; ready: boolean; unique: boolean;
    columns: string[]; ordinary: boolean; bytes: number;
  }>>`
    SELECT index_relation.relname AS "indexName", index.indisvalid AS valid,
           index.indisready AS ready, index.indisunique AS unique,
           ARRAY(SELECT attribute.attname::text FROM unnest(index.indkey) WITH ORDINALITY AS key(attnum, ordinal)
                 JOIN pg_attribute attribute ON attribute.attrelid = table_relation.oid AND attribute.attnum = key.attnum
                 ORDER BY key.ordinal) AS columns,
           (index.indpred IS NULL AND index.indexprs IS NULL AND index.indnkeyatts = 1 AND index.indnatts = 1) AS ordinary,
           pg_relation_size(index.indexrelid)::double precision AS bytes
    FROM pg_index index
    JOIN pg_class table_relation ON table_relation.oid = index.indrelid
    JOIN pg_namespace namespace ON namespace.oid = table_relation.relnamespace
    JOIN pg_class index_relation ON index_relation.oid = index.indexrelid
    WHERE namespace.nspname = current_schema() AND table_relation.relname = 'ImportedGamePosition'
      AND index_relation.relname = ${COMPACT_POSITION_INDEX}
  `;
}

/** CREATE INDEX CONCURRENTLY is intentionally outside any explicit transaction. */
export async function indexCompactPositionData(database: PrismaClient = prisma, options: CompactMaintenanceOptions = {}) {
  const log = options.log ?? console.log;
  if (options.preflight) throw new Error('Index creation requires stored-data validation, not FEN preflight');
  await assertCompactIndexReady(database);
  const validation = await validateCompactPositionData(database, options);
  await assertCompactIndexReady(database); // Repeat the guards immediately before creation.
  const previous = await compactIndexStatus(database);
  if (previous.length && (!previous[0].valid || !previous[0].ready || !previous[0].unique || !previous[0].ordinary || previous[0].columns.join(',') !== 'positionDataCompact')) {
    throw new Error(`Existing compact index is invalid or has the wrong definition; manual review required (no index dropped): ${JSON.stringify(previous)}`);
  }
  await database.$executeRaw`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "ImportedGamePosition_positionDataCompact_key"
    ON "ImportedGamePosition"("positionDataCompact")
  `;
  const [index] = await compactIndexStatus(database);
  if (!index?.valid || !index.ready || !index.unique || !index.ordinary || index.columns.join(',') !== 'positionDataCompact') throw new Error(`Compact index did not become valid: ${JSON.stringify(index)}`);
  const report = { nulls: 0, duplicates: 0, validated: validation.validated, index };
  log(`Compact unique index ready: ${JSON.stringify(report, null, 2)}`);
  return report;
}

if (require.main === module) {
  const directDatabase = new PrismaClient({ datasourceUrl: process.env['DIRECT_URL'] });
  Promise.resolve().then(() => {
    if (process.argv.length > 2) throw new Error('Usage: index-compact-position-data.ts (no arguments)');
    if (!process.env['DIRECT_URL']) throw new Error('DIRECT_URL is required for the concurrent index build');
    return indexCompactPositionData(directDatabase);
  }).catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await directDatabase.$disconnect(); });
}
