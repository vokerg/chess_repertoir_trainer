-- Expand only. Keep the legacy column and composite index until verified cutover.
ALTER TABLE "ImportedGamePly" ADD COLUMN "moveCode" SMALLINT;
