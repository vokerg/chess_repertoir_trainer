DROP INDEX IF EXISTS "Line_chapterId_repertoireUpdatedAt_idx";

ALTER TABLE "Line"
DROP COLUMN IF EXISTS "repertoireUpdatedAt";

CREATE INDEX IF NOT EXISTS "Line_chapterId_idx"
ON "Line"("chapterId");
