-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM (
  'GAMES_PLAYED',
  'REPERTOIRE_LINES_TRAINED',
  'LICHESS_PUZZLES_COMPLETED',
  'TACTICAL_SCENARIOS_COMPLETED',
  'GAME_ANALYSES_COMPLETED'
);

-- AlterTable
ALTER TABLE "AppUser"
ADD COLUMN "timeZone" VARCHAR(64) NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "UserActivityDailyAggregate" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "activityDate" DATE NOT NULL,
  "type" "ActivityType" NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "firstOccurredAt" TIMESTAMP(3),
  "lastOccurredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserActivityDailyAggregate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserActivityDailyAggregate_count_check" CHECK ("count" >= 0),
  CONSTRAINT "UserActivityDailyAggregate_occurrence_check" CHECK (
    ("count" = 0 AND "firstOccurredAt" IS NULL AND "lastOccurredAt" IS NULL)
    OR
    ("count" > 0 AND "firstOccurredAt" IS NOT NULL AND "lastOccurredAt" IS NOT NULL AND "firstOccurredAt" <= "lastOccurredAt")
  )
);

-- CreateIndex
CREATE UNIQUE INDEX "UserActivityDailyAggregate_userId_activityDate_type_key"
ON "UserActivityDailyAggregate"("userId", "activityDate", "type");

-- CreateIndex
CREATE INDEX "UserActivityDailyAggregate_userId_activityDate_idx"
ON "UserActivityDailyAggregate"("userId", "activityDate");

-- AddForeignKey
ALTER TABLE "UserActivityDailyAggregate"
ADD CONSTRAINT "UserActivityDailyAggregate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
