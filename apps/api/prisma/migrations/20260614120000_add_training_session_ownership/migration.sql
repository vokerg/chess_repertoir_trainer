ALTER TABLE "TrainingSession" ADD COLUMN "userId" INTEGER;

INSERT INTO "AppUser" ("id", "displayName", "createdAt", "updatedAt")
SELECT 1, 'Local user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "TrainingSession")
  AND NOT EXISTS (SELECT 1 FROM "AppUser" WHERE "id" = 1);

UPDATE "TrainingSession" SET "userId" = 1 WHERE "userId" IS NULL;

ALTER TABLE "TrainingSession" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "TrainingSession_userId_startedAt_idx"
ON "TrainingSession"("userId", "startedAt");

CREATE INDEX "TrainingSession_userId_result_idx"
ON "TrainingSession"("userId", "result");

CREATE INDEX "TrainingSession_userId_lineId_idx"
ON "TrainingSession"("userId", "lineId");

ALTER TABLE "TrainingSession"
ADD CONSTRAINT "TrainingSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
