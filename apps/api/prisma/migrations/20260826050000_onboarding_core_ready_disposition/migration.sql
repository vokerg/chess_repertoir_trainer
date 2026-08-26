-- Keep the durable onboarding disposition in sync with preparation progress in
-- the same database transaction that first records core readiness. This keeps
-- completion independent of an active browser session or a subsequent GET.
CREATE OR REPLACE FUNCTION "complete_onboarding_from_core_ready"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lineage_start_id INTEGER;
  root_purpose TEXT;
  current_disposition TEXT;
BEGIN
  IF NEW."coreReadyAt" IS NULL OR OLD."coreReadyAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT "onboardingDisposition"
  INTO current_disposition
  FROM "AppUser"
  WHERE "id" = NEW."userId"
  FOR UPDATE;

  IF current_disposition IS NULL OR current_disposition = 'COMPLETED' THEN
    RETURN NEW;
  END IF;

  IF NEW."purpose" = 'EXPANSION' THEN
    -- Expansion does not normally change first-run disposition. The exception
    -- is a still-pending user who explicitly expanded a no-data onboarding run;
    -- that command records its immutable source run in the recipe snapshot.
    IF current_disposition <> 'PENDING'
       OR NEW."recipeJson" ->> 'kind' <> 'ONBOARDING_EXPANSION'
       OR NEW."recipeJson" ->> 'sourceRunId' IS NULL THEN
      RETURN NEW;
    END IF;
    BEGIN
      lineage_start_id := (NEW."recipeJson" ->> 'sourceRunId')::INTEGER;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NEW;
    END;
  ELSE
    lineage_start_id := NEW."id";
  END IF;

  WITH RECURSIVE lineage AS (
    SELECT "id", "purpose", "retryOfRunId", "userId"
    FROM "DataPreparationRun"
    WHERE "id" = lineage_start_id
      AND "userId" = NEW."userId"

    UNION ALL

    SELECT parent."id", parent."purpose", parent."retryOfRunId", parent."userId"
    FROM "DataPreparationRun" AS parent
    JOIN lineage AS child
      ON child."retryOfRunId" = parent."id"
    WHERE parent."userId" = NEW."userId"
  )
  SELECT "purpose"
  INTO root_purpose
  FROM lineage
  WHERE "retryOfRunId" IS NULL
  LIMIT 1;

  IF root_purpose <> 'ONBOARDING' THEN
    RETURN NEW;
  END IF;

  UPDATE "AppUser"
  SET "onboardingDisposition" = 'COMPLETED',
      "onboardingDispositionReason" = 'CORE_READY',
      "onboardingDispositionAt" = NEW."coreReadyAt",
      "updatedAt" = GREATEST("updatedAt", NEW."coreReadyAt")
  WHERE "id" = NEW."userId"
    AND "onboardingDisposition" <> 'COMPLETED';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "DataPreparationRun_complete_onboarding_core_ready" ON "DataPreparationRun";
CREATE TRIGGER "DataPreparationRun_complete_onboarding_core_ready"
AFTER UPDATE OF "coreReadyAt" ON "DataPreparationRun"
FOR EACH ROW
WHEN (NEW."coreReadyAt" IS NOT NULL AND OLD."coreReadyAt" IS NULL)
EXECUTE FUNCTION "complete_onboarding_from_core_ready"();
