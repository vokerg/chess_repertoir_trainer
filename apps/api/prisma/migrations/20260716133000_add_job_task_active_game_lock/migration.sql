-- Only one worker may actively process a given imported game at a time.
-- The opaque workKey fences individual claims; this partial index fences the game itself.
CREATE UNIQUE INDEX "JobTask_active_importedGameId_key"
ON "JobTask"("importedGameId")
WHERE "status" = 'RUNNING' AND "importedGameId" IS NOT NULL;
