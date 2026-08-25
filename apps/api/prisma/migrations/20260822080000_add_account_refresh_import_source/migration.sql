-- ONB-015: distinguish normal account-refresh/backfill imports from generic
-- durable user actions so preparation handoff can be driven by persisted intent.
-- This extends the existing ImportRun source vocabulary without rewriting
-- historical USER_ACTION rows.

ALTER TABLE "ImportRun"
DROP CONSTRAINT "ImportRun_scope_shape_check",
DROP CONSTRAINT "ImportRun_source_check";

ALTER TABLE "ImportRun"
ADD CONSTRAINT "ImportRun_source_check" CHECK (
  "source" IN ('USER_ACTION', 'ACCOUNT_REFRESH', 'ONBOARDING', 'SYSTEM', 'LEGACY_SYNC')
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
    "mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD', 'HISTORICAL_BACKFILL')
    AND "source" IN ('USER_ACTION', 'ACCOUNT_REFRESH', 'ONBOARDING', 'SYSTEM')
    AND "scopeVersion" > 0
    AND "scopeHash" ~ '^[0-9a-f]{64}$'
    AND "scopeJson" IS NOT NULL
    AND "requestedFrom" IS NOT NULL
    AND "requestedTo" IS NOT NULL
    AND "requestedFrom" < "requestedTo"
  )
);
