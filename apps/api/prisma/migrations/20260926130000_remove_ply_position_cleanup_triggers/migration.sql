-- Orphan-position maintenance must not run as a side effect of normal ply writes.
-- Retain the independent ImportedGamePly data-lifecycle guard.
BEGIN;

DROP TRIGGER IF EXISTS "ImportedGamePly_position_cleanup_reset_update" ON "ImportedGamePly";
DROP TRIGGER IF EXISTS "ImportedGamePly_position_cleanup_reset_insert" ON "ImportedGamePly";

COMMIT;
