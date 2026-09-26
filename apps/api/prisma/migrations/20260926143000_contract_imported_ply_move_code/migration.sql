-- Apply only after exact UCI validation and with all ply writers stopped.
BEGIN;
LOCK TABLE "ImportedGamePly" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE "ImportedGamePly" ALTER COLUMN "moveCode" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "ImportedGamePly_positionId_moveCode_importedGameId_plyNumber_idx"
ON "ImportedGamePly"("positionId", "moveCode", "importedGameId", "plyNumber");
DROP INDEX IF EXISTS "ImportedGamePly_positionId_moveUci_importedGameId_plyNumber_idx";
ALTER TABLE "ImportedGamePly" DROP COLUMN "moveUci";
COMMIT;
