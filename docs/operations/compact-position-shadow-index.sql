-- Stage this as a normal Prisma migration only after authorized backfill,
-- full round-trip validation, duplicate checks, and the operational index build.
-- No explicit transaction: PostgreSQL concurrent index creation.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "ImportedGamePosition_positionDataCompact_key"
ON "ImportedGamePosition"("positionDataCompact");
