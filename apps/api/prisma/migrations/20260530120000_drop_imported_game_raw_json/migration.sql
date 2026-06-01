DROP INDEX IF EXISTS "ImportedGame_provider_providerGameId_idx";
DROP INDEX IF EXISTS "ImportedGame_userId_speedCategory_endedAt_idx";
DROP INDEX IF EXISTS "ImportedGame_accountId_speedCategory_endedAt_idx";

ALTER TABLE "ImportedGame"
DROP COLUMN IF EXISTS "rawJson";
