-- Make an explicitly requested all-history import a first-class durable mode.
-- Normal refresh remains bounded; this only extends the immutable mode
-- vocabulary for the opt-in full-history command.

ALTER TABLE "ImportRun"
DROP CONSTRAINT "ImportRun_mode_check",
DROP CONSTRAINT "ImportRun_scope_shape_check";

ALTER TABLE "ImportRun"
ADD CONSTRAINT "ImportRun_mode_check" CHECK (
  "mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD', 'HISTORICAL_BACKFILL', 'FULL_HISTORY', 'LEGACY_SYNC')
),
ADD CONSTRAINT "ImportRun_scope_shape_check" CHECK (
  (
    "mode" = 'LEGACY_SYNC'
    AND "source" = 'LEGACY_SYNC'
    AND "scopeVersion" IS NULL
    AND "scopeHash" IS NULL
    AND "scopeJson" IS NULL
    AND "requestedFrom" IS NULL
    AND "requestedTo" IS NULL
  )
  OR
  (
    "mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD', 'HISTORICAL_BACKFILL', 'FULL_HISTORY')
    AND "source" IN ('USER_ACTION', 'ACCOUNT_REFRESH', 'ONBOARDING', 'SYSTEM')
    AND "scopeVersion" > 0
    AND "scopeHash" ~ '^[0-9a-f]{64}$'
    AND "scopeJson" IS NOT NULL
    AND "requestedFrom" IS NOT NULL
    AND "requestedTo" IS NOT NULL
    AND "requestedFrom" < "requestedTo"
  )
);
