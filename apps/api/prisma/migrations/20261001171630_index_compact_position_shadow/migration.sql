-- Record the operationally built, validated compact identity index in Prisma history.
-- Do not wrap this migration in a transaction: PostgreSQL concurrent index build.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "ImportedGamePosition_positionDataCompact_key"
ON "ImportedGamePosition"("positionDataCompact");
