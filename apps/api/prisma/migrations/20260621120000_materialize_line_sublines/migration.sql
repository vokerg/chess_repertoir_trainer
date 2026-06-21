-- Materialized read model for active terminal move-tree sublines.
-- MoveNode remains the source of truth; this table is rebuilt/reconciled by application code.
CREATE TABLE "LineSubline" (
    "id" SERIAL NOT NULL,
    "lineId" INTEGER NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "canonicalKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "leafNodeId" INTEGER,
    "movesJson" JSONB NOT NULL,
    "moveText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineSubline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LineSubline_lineId_hash_key" ON "LineSubline"("lineId", "hash");
CREATE INDEX "LineSubline_lineId_isActive_idx" ON "LineSubline"("lineId", "isActive");
CREATE INDEX "LineSubline_hash_idx" ON "LineSubline"("hash");
CREATE INDEX "LineSubline_isActive_idx" ON "LineSubline"("isActive");

ALTER TABLE "LineSubline"
ADD CONSTRAINT "LineSubline_lineId_fkey"
FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE ON UPDATE CASCADE;
