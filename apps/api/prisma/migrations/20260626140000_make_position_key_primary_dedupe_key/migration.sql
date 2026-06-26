ALTER TABLE "ImportedGamePosition"
ALTER COLUMN "positionKey" SET NOT NULL;

DROP INDEX IF EXISTS "ImportedGamePosition_normalizedFen_key";
