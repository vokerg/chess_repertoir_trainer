CREATE TABLE "MastersExplorerCache" (
    "id" SERIAL NOT NULL,
    "positionId" INTEGER NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "profileVersion" INTEGER NOT NULL,
    "sinceYear" SMALLINT NOT NULL,
    "untilYear" SMALLINT NOT NULL,
    "movesLimit" SMALLINT NOT NULL,
    "topGamesLimit" SMALLINT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MastersExplorerCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MastersExplorerCache_positionId_source_profileVersion_key"
ON "MastersExplorerCache"("positionId", "source", "profileVersion");

CREATE INDEX "MastersExplorerCache_expiresAt_idx"
ON "MastersExplorerCache"("expiresAt");

ALTER TABLE "MastersExplorerCache"
ADD CONSTRAINT "MastersExplorerCache_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "ImportedGamePosition"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
