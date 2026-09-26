-- Cutover support. The legacy moveUci index remains available throughout rollout.
-- Do not wrap this migration in a transaction: PostgreSQL concurrent index build.
CREATE INDEX CONCURRENTLY "ImportedGamePly_positionId_moveCode_importedGameId_plyNumber_idx"
ON "ImportedGamePly"("positionId", "moveCode", "importedGameId", "plyNumber");
