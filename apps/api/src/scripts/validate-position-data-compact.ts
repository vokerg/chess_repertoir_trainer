import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { decodeNormalizedFenCompact, encodeNormalizedFenCompact } from 'chess-domain';

type PositionRow = { id: number; positionDataCompact: Uint8Array | null };

/** Full, bounded, read-only validation that works after legacy storage is removed. */
export async function validatePositionDataCompact(database: PrismaClient, batchSize = 500) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) throw new Error('Batch size must be 1..5000');
  return database.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
    const counts = await tx.$queryRaw<Array<{ positions: number; nulls: number }>>`
      SELECT COUNT(*)::integer AS positions,
             COUNT(*) FILTER (WHERE "positionDataCompact" IS NULL)::integer AS nulls
      FROM "ImportedGamePosition"
    `;
    if (counts[0].nulls) throw new Error(`Position compact invariant failed: ${counts[0].nulls} NULL identities`);
    const duplicates = await tx.$queryRaw<Array<{ groups: number }>>`
      SELECT COUNT(*)::integer AS groups FROM (
        SELECT "positionDataCompact" FROM "ImportedGamePosition"
        GROUP BY "positionDataCompact" HAVING COUNT(*) > 1
      ) AS duplicates
    `;
    if (duplicates[0].groups) throw new Error(`Position compact invariant failed: ${duplicates[0].groups} duplicate identities`);
    const fingerprint = createHash('sha256');
    let lastId = 0, validated = 0;
    for (;;) {
      const rows = await tx.$queryRaw<PositionRow[]>`
        SELECT id, "positionDataCompact" FROM "ImportedGamePosition"
        WHERE id > ${lastId} ORDER BY id LIMIT ${batchSize}
      `;
      if (!rows.length) break;
      for (const row of rows) {
        try {
          if (row.positionDataCompact === null) throw new Error('NULL identity');
          const fen = decodeNormalizedFenCompact(row.positionDataCompact);
          const canonical = encodeNormalizedFenCompact(fen);
          if (!Buffer.from(canonical).equals(Buffer.from(row.positionDataCompact))) throw new Error('Noncanonical compact bytes');
          fingerprint.update(`${row.id}:${Buffer.from(row.positionDataCompact).toString('hex')}\n`);
        } catch (error) {
          throw new Error(`Position compact invariant failed: id=${row.id}: ${String(error)}`);
        }
      }
      validated += rows.length;
      lastId = rows[rows.length - 1].id;
    }
    if (validated !== counts[0].positions) throw new Error('Position validation count mismatch');
    return { positions: counts[0].positions, validated, nulls: counts[0].nulls, duplicates: duplicates[0].groups, fingerprint: fingerprint.digest('hex') };
  }, { timeout: 10 * 60_000 });
}

if (require.main === module) {
  const database = new PrismaClient({ datasourceUrl: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] });
  (async () => {
    try {
      if (process.argv.length > 2) throw new Error('Usage: validate-position-data-compact.ts (no arguments; read-only)');
      console.log(JSON.stringify(await validatePositionDataCompact(database)));
    } finally { await database.$disconnect(); }
  })().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
