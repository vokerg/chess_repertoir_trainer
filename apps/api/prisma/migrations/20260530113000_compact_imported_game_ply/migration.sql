-- Compact imported game ply indexing storage.
-- The ply table is a searchable move index, so store only the per-occurrence
-- fields and move repeated normalized FEN text into a shared position table.

CREATE TABLE "ImportedGamePosition" (
    "id" SERIAL NOT NULL,
    "normalizedFen" VARCHAR(120) NOT NULL,

    CONSTRAINT "ImportedGamePosition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportedGamePosition_normalizedFen_key" ON "ImportedGamePosition"("normalizedFen");

INSERT INTO "ImportedGamePosition"("normalizedFen")
SELECT DISTINCT "normalizedFen"
FROM "ImportedGamePly"
ON CONFLICT ("normalizedFen") DO NOTHING;

ALTER TABLE "ImportedGamePly" ADD COLUMN "positionId" INTEGER;

UPDATE "ImportedGamePly" ply
SET "positionId" = position."id"
FROM "ImportedGamePosition" position
WHERE position."normalizedFen" = ply."normalizedFen";

ALTER TABLE "ImportedGamePly" ALTER COLUMN "positionId" SET NOT NULL;

DROP INDEX IF EXISTS "ImportedGamePly_importedGameId_idx";
DROP INDEX IF EXISTS "ImportedGamePly_importedGameId_plyNumber_key";
DROP INDEX IF EXISTS "ImportedGamePly_moveUci_idx";
DROP INDEX IF EXISTS "ImportedGamePly_normalizedFen_idx";
DROP INDEX IF EXISTS "ImportedGamePly_normalizedFen_moveUci_importedGameId_plyNumber_idx";

ALTER TABLE "ImportedGamePly" DROP CONSTRAINT "ImportedGamePly_pkey";

ALTER TABLE "ImportedGamePly"
  DROP COLUMN "id",
  DROP COLUMN "moveNumber",
  DROP COLUMN "side",
  DROP COLUMN "fenBefore",
  DROP COLUMN "normalizedFen",
  DROP COLUMN "fenAfter",
  DROP COLUMN "moveSan",
  DROP COLUMN "createdAt";

ALTER TABLE "ImportedGamePly"
  ALTER COLUMN "plyNumber" TYPE SMALLINT USING "plyNumber"::smallint,
  ALTER COLUMN "moveUci" TYPE VARCHAR(5);

ALTER TABLE "ImportedGamePly" ADD CONSTRAINT "ImportedGamePly_pkey" PRIMARY KEY ("importedGameId", "plyNumber");

CREATE INDEX "ImportedGamePly_positionId_moveUci_importedGameId_plyNumber_idx"
ON "ImportedGamePly"("positionId", "moveUci", "importedGameId", "plyNumber");

ALTER TABLE "ImportedGamePly"
ADD CONSTRAINT "ImportedGamePly_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "ImportedGamePosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
