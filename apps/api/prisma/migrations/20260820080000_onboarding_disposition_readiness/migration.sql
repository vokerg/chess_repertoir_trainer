-- ONB-008: persist the minimal user onboarding disposition.
-- Existing users are adopted as complete; rows created after this migration
-- inherit PENDING from the column default.
--
-- Keep the adoption boundary atomic. The lock permits ordinary reads but blocks
-- concurrent AppUser writes, so a user provisioned during rollout cannot land
-- between the schema change and legacy backfill and be misclassified as legacy.
BEGIN;

LOCK TABLE "AppUser" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "AppUser"
  ADD COLUMN "onboardingDisposition" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "onboardingDispositionReason" VARCHAR(64),
  ADD COLUMN "onboardingDispositionAt" TIMESTAMP(3);

UPDATE "AppUser"
SET "onboardingDisposition" = 'COMPLETED',
    "onboardingDispositionReason" = 'LEGACY_ADOPTION',
    "onboardingDispositionAt" = NOW();

ALTER TABLE "AppUser"
  ADD CONSTRAINT "AppUser_onboardingDisposition_check"
  CHECK ("onboardingDisposition" IN ('PENDING', 'COMPLETED', 'SKIPPED'));

-- Core readiness is a durable onboarding invariant. Keep disposition
-- convergence in PostgreSQL so every writer that legitimately advances the
-- initial preparation or one of its linked recovery runs produces the same
-- cross-session result. Expansion-only recovery does not complete onboarding.
CREATE OR REPLACE FUNCTION "complete_onboarding_disposition_from_core_ready"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  completes_onboarding BOOLEAN;
BEGIN
  IF NEW."coreReadyAt" IS NOT NULL
     AND OLD."coreReadyAt" IS NULL THEN
    WITH RECURSIVE lineage AS (
      SELECT run."id", run."purpose", run."retryOfRunId"
      FROM "DataPreparationRun" AS run
      WHERE run."id" = NEW."id"
        AND run."userId" = NEW."userId"

      UNION

      SELECT parent."id", parent."purpose", parent."retryOfRunId"
      FROM "DataPreparationRun" AS parent
      JOIN lineage AS child ON parent."id" = child."retryOfRunId"
      WHERE parent."userId" = NEW."userId"
    )
    SELECT EXISTS (
      SELECT 1
      FROM lineage
      WHERE "purpose" = 'ONBOARDING'
    ) INTO completes_onboarding;

    IF completes_onboarding THEN
      UPDATE "AppUser"
      SET "onboardingDisposition" = 'COMPLETED',
          "onboardingDispositionReason" = 'CORE_READY',
          "onboardingDispositionAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = NEW."userId"
        AND "onboardingDisposition" <> 'COMPLETED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationRun_complete_onboarding_disposition"
AFTER UPDATE OF "coreReadyAt" ON "DataPreparationRun"
FOR EACH ROW
EXECUTE FUNCTION "complete_onboarding_disposition_from_core_ready"();

COMMIT;
