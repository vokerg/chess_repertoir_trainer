import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import prisma from '../prisma';

/** Field storage is reported separately from physical heap growth/bloat. No VACUUM is performed here. */
export async function measureCompactPositionData(database: PrismaClient = prisma, log: (message: string) => void = console.log) {
  const report = await database.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [columns] = await tx.$queryRaw<Array<Record<string, number | null>>>`
      SELECT COUNT(*)::integer AS "rowCount",
        COUNT(*) FILTER (WHERE "positionDataCompact" IS NULL)::integer AS "nullCompact",
        COUNT("positionData")::integer AS "fixedPilotRows",
        MIN(pg_column_size("normalizedFen")) AS "minFenBytes", AVG(pg_column_size("normalizedFen"))::double precision AS "avgFenBytes", MAX(pg_column_size("normalizedFen")) AS "maxFenBytes", COALESCE(SUM(pg_column_size("normalizedFen")), 0)::double precision AS "totalFenBytes",
        MIN(pg_column_size("positionKey")) AS "minKeyBytes", AVG(pg_column_size("positionKey"))::double precision AS "avgKeyBytes", MAX(pg_column_size("positionKey")) AS "maxKeyBytes", COALESCE(SUM(pg_column_size("positionKey")), 0)::double precision AS "totalKeyBytes",
        MIN(pg_column_size("positionDataCompact")) AS "minCompactBytes", AVG(pg_column_size("positionDataCompact"))::double precision AS "avgCompactBytes", MAX(pg_column_size("positionDataCompact")) AS "maxCompactBytes", COALESCE(SUM(pg_column_size("positionDataCompact")), 0)::double precision AS "totalCompactBytes",
        COALESCE(SUM(octet_length("positionDataCompact")), 0)::double precision AS "totalCompactPayloadBytes",
        COALESCE(SUM(pg_column_size("positionData")), 0)::double precision AS "totalFixedPilotBytes"
      FROM "ImportedGamePosition"
    `;
    const indexes = await tx.$queryRaw<Array<{ name: string; pretty: string; bytes: number }>>`
      SELECT indexrelname AS name, pg_size_pretty(pg_relation_size(indexrelid)) AS pretty,
             pg_relation_size(indexrelid)::double precision AS bytes
      FROM pg_stat_user_indexes WHERE schemaname = current_schema() AND relname = 'ImportedGamePosition'
      ORDER BY pg_relation_size(indexrelid) DESC
    `;
    const [physical] = await tx.$queryRaw<Array<Record<string, number | string>>>`
      SELECT current_database() AS database, current_schema() AS schema,
        pg_database_size(current_database())::double precision AS "databaseBytes",
        pg_relation_size('"ImportedGamePosition"'::regclass)::double precision AS "heapBytes",
        pg_total_relation_size('"ImportedGamePosition"'::regclass)::double precision AS "totalRelationBytes"
    `;
    return { columns, indexes, physical,
      caveat: 'Heap/total-relation bytes can include backfill bloat; column totals are field storage, not eventual compacted heap size.' };
  }, { maxWait: 10000, timeout: 120000, isolationLevel: 'RepeatableRead' });
  log(`Compact shadow measurements (read only): ${JSON.stringify(report, null, 2)}`);
  return report;
}

if (require.main === module) {
  Promise.resolve().then(() => {
    if (process.argv.length > 2) throw new Error('Usage: measure-compact-position-data.ts (no arguments)');
    return measureCompactPositionData();
  }).catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
}
