-- Restore the missing production bookkeeping table without rebuilding observations.
-- Fresh databases already have this table from the foundation migration: preserve it.
-- Do not restore removed ply triggers or enable/execute orphan cleanup here.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DO $$
BEGIN
    IF to_regclass('"PositionCleanupCandidate"') IS NULL THEN
        CREATE TABLE "PositionCleanupCandidate" (
            "positionId" INTEGER NOT NULL,
            "firstObservedOrphanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "lastObservedOrphanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "PositionCleanupCandidate_pkey" PRIMARY KEY ("positionId"),
            CONSTRAINT "PositionCleanupCandidate_observation_order_check"
                CHECK ("lastObservedOrphanAt" >= "firstObservedOrphanAt"),
            CONSTRAINT "PositionCleanupCandidate_positionId_fkey"
                FOREIGN KEY ("positionId") REFERENCES "ImportedGamePosition"("id")
                ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE INDEX "PositionCleanupCandidate_firstObservedOrphanAt_positionId_idx"
        ON "PositionCleanupCandidate"("firstObservedOrphanAt", "positionId");
    END IF;
END;
$$;

COMMIT;
