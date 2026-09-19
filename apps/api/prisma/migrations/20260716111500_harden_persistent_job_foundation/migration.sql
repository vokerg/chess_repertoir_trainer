-- Preserve persisted task history when the source imported game is deleted.
ALTER TABLE "JobTask" DROP CONSTRAINT "JobTask_importedGameId_fkey";
ALTER TABLE "JobTask" ALTER COLUMN "importedGameId" DROP NOT NULL;
ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_importedGameId_fkey"
  FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Guard every persisted job lifecycle literal, including writes made by raw worker SQL.
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_kind_check" CHECK (
  "kind" IN ('INDEX_GAMES', 'ANALYSE_GAMES', 'PROCESS_GAMES', 'REFRESH_TAGS')
);

ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_source_check" CHECK (
  "source" IN ('USER_ACTION', 'ACCOUNT_REFRESH', 'ONBOARDING', 'MAINTENANCE')
);

ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_status_check" CHECK (
  "status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED')
);

ALTER TABLE "JobTask" ADD CONSTRAINT "JobTask_status_check" CHECK (
  "status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'SKIPPED', 'FAILED', 'CANCELLED')
);
