-- Compact runtime identity/read cutover must be live before this storage cleanup.
-- NULL compact values abort the transaction; this migration never rewrites identities.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

ALTER TABLE "ImportedGamePosition"
ALTER COLUMN "positionDataCompact" SET NOT NULL;

DROP INDEX "ImportedGamePosition_positionKey_key";

ALTER TABLE "ImportedGamePosition"
DROP COLUMN "positionKey",
DROP COLUMN "normalizedFen",
DROP COLUMN "positionData";

-- Preserve id, the compact UNIQUE index, all relations and foreign keys.
COMMIT;
