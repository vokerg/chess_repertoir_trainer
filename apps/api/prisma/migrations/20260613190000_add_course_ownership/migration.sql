ALTER TABLE "Course" ADD COLUMN "userId" INTEGER;

INSERT INTO "AppUser" ("id", "displayName", "createdAt", "updatedAt")
SELECT 1, 'Local user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Course")
  AND NOT EXISTS (SELECT 1 FROM "AppUser" WHERE "id" = 1);

UPDATE "Course" SET "userId" = 1 WHERE "userId" IS NULL;

ALTER TABLE "Course" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Course_userId_idx" ON "Course"("userId");

ALTER TABLE "Course"
ADD CONSTRAINT "Course_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
