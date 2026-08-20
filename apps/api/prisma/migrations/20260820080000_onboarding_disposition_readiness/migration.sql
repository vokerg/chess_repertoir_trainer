-- ONB-008: persist the minimal user onboarding disposition.
-- Existing users are adopted as complete; rows created after this migration
-- inherit PENDING from the column default.
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

-- Core readiness is a durable preparation invariant. Keep disposition
-- convergence in PostgreSQL so every writer that legitimately advances an
-- ONBOARDING run to core-ready produces the same cross-session result.
CREATE OR REPLACE FUNCTION "complete_onboarding_disposition_from_core_ready"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."purpose" = 'ONBOARDING'
     AND NEW."coreReadyAt" IS NOT NULL
     AND OLD."coreReadyAt" IS NULL THEN
    UPDATE "AppUser"
    SET "onboardingDisposition" = 'COMPLETED',
        "onboardingDispositionReason" = 'CORE_READY',
        "onboardingDispositionAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = NEW."userId"
      AND "onboardingDisposition" <> 'COMPLETED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationRun_complete_onboarding_disposition"
AFTER UPDATE OF "coreReadyAt" ON "DataPreparationRun"
FOR EACH ROW
EXECUTE FUNCTION "complete_onboarding_disposition_from_core_ready"();
