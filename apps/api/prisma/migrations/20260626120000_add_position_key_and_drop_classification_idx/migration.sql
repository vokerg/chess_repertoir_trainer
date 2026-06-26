ALTER TABLE "ImportedGamePosition"
ADD COLUMN "positionKey" BYTEA;

DROP INDEX IF EXISTS "ImportedGamePly_classificationCode_idx";
