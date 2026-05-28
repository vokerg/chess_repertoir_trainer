-- Add imported game ply indexing support
ALTER TABLE "ImportedGame" ADD COLUMN "plyIndexedAt" TIMESTAMP(3), ADD COLUMN "plyIndexError" TEXT;

CREATE TABLE "ImportedGamePly" (
    "id" SERIAL NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "plyNumber" INTEGER NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "fenBefore" TEXT NOT NULL,
    "normalizedFen" TEXT NOT NULL,
    "fenAfter" TEXT NOT NULL,
    "moveUci" TEXT NOT NULL,
    "moveSan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedGamePly_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportedGamePly_importedGameId_plyNumber_key" ON "ImportedGamePly"("importedGameId", "plyNumber");
CREATE INDEX "ImportedGamePly_importedGameId_idx" ON "ImportedGamePly"("importedGameId");
CREATE INDEX "ImportedGamePly_normalizedFen_idx" ON "ImportedGamePly"("normalizedFen");
CREATE INDEX "ImportedGamePly_moveUci_idx" ON "ImportedGamePly"("moveUci");

ALTER TABLE "ImportedGamePly" ADD CONSTRAINT "ImportedGamePly_importedGameId_fkey" FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
