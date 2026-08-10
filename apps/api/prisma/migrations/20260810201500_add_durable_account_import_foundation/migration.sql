-- ONB-011: evolve ImportRun into durable provider-neutral work and add exact
-- contiguous coverage per account/canonical scope. Existing synchronous rows
-- remain explicit LEGACY_SYNC history and do not manufacture exact coverage.

-- Fail before any DDL if deployed legacy state cannot satisfy the durable
-- lifecycle invariant. Current synchronous providers persist only
-- RUNNING -> COMPLETED/FAILED, so any other legacy status needs explicit
-- operator review rather than an implicit migration rewrite.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ImportRun"
    WHERE "status" NOT IN ('RUNNING', 'COMPLETED', 'FAILED')
  ) THEN
    RAISE EXCEPTION 'ONB-011 cannot migrate ImportRun: unsupported legacy status exists';
  END IF;

  IF EXISTS (
    SELECT "accountId"
    FROM "ImportRun"
    WHERE "status" = 'RUNNING'
    GROUP BY "accountId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'ONB-011 cannot create one-active-import invariant: an account has multiple running ImportRun rows';
  END IF;
END
$$;

ALTER TABLE "ImportRun"
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'LEGACY_SYNC',
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'LEGACY_SYNC',
ADD COLUMN "scopeVersion" INTEGER,
ADD COLUMN "scopeHash" VARCHAR(64),
ADD COLUMN "scopeJson" JSONB,
ADD COLUMN "requestedFrom" TIMESTAMP(3),
ADD COLUMN "requestedTo" TIMESTAMP(3),
ADD COLUMN "retryOfImportRunId" INTEGER,
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "checkpointJson" JSONB,
ADD COLUMN "windowsTotal" INTEGER,
ADD COLUMN "windowsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gamesMatchedScope" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gamesDuplicate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "gamesSkippedOutOfScope" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastProgressAt" TIMESTAMP(3),
ADD COLUMN "workKey" TEXT,
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "heartbeatAt" TIMESTAMP(3),
ADD COLUMN "pauseRequestedAt" TIMESTAMP(3),
ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
ADD COLUMN "retryAt" TIMESTAMP(3),
ADD COLUMN "rateLimitUntil" TIMESTAMP(3),
ADD COLUMN "errorCode" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Preserve the strongest truthful historical timestamps available. Legacy
-- syncSince/syncUntil remain compatibility evidence, not exact coverage.
UPDATE "ImportRun"
SET "createdAt" = COALESCE("startedAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("completedAt", "startedAt", CURRENT_TIMESTAMP);

ALTER TABLE "ImportRun"
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "ImportRun"
ADD CONSTRAINT "ImportRun_mode_check" CHECK (
  "mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD', 'HISTORICAL_BACKFILL', 'LEGACY_SYNC')
),
ADD CONSTRAINT "ImportRun_source_check" CHECK (
  "source" IN ('USER_ACTION', 'ONBOARDING', 'SYSTEM', 'LEGACY_SYNC')
),
ADD CONSTRAINT "ImportRun_status_check" CHECK (
  "status" IN (
    'QUEUED',
    'RUNNING',
    'PAUSE_REQUESTED',
    'PAUSED',
    'CANCEL_REQUESTED',
    'CANCELLED',
    'COMPLETED',
    'FAILED'
  )
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
    AND "source" IN ('USER_ACTION', 'ONBOARDING', 'SYSTEM')
    AND "scopeVersion" > 0
    AND "scopeHash" ~ '^[0-9a-f]{64}$'
    AND "scopeJson" IS NOT NULL
    AND "requestedFrom" IS NOT NULL
    AND "requestedTo" IS NOT NULL
    AND "requestedFrom" < "requestedTo"
  )
),
ADD CONSTRAINT "ImportRun_priority_check" CHECK ("priority" >= 0),
ADD CONSTRAINT "ImportRun_window_counts_check" CHECK (
  "windowsCompleted" >= 0
  AND (
    "windowsTotal" IS NULL
    OR ("windowsTotal" >= 0 AND "windowsCompleted" <= "windowsTotal")
  )
),
ADD CONSTRAINT "ImportRun_game_counts_check" CHECK (
  "gamesSeen" >= 0
  AND "gamesMatchedScope" >= 0
  AND "gamesImported" >= 0
  AND "gamesUpdated" >= 0
  AND "gamesDuplicate" >= 0
  AND "gamesSkipped" >= 0
  AND "gamesSkippedOutOfScope" >= 0
  AND "gamesFailed" >= 0
);

CREATE UNIQUE INDEX "ImportRun_one_active_per_account_key"
ON "ImportRun"("accountId")
WHERE "status" IN ('QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'CANCEL_REQUESTED');

CREATE UNIQUE INDEX "ImportRun_workKey_key"
ON "ImportRun"("workKey");

CREATE INDEX "ImportRun_accountId_status_createdAt_idx"
ON "ImportRun"("accountId", "status", "createdAt" DESC);

CREATE INDEX "ImportRun_userId_createdAt_idx"
ON "ImportRun"("userId", "createdAt" DESC);

CREATE INDEX "ImportRun_retryOfImportRunId_idx"
ON "ImportRun"("retryOfImportRunId");

ALTER TABLE "ImportRun"
ADD CONSTRAINT "ImportRun_retryOfImportRunId_fkey"
FOREIGN KEY ("retryOfImportRunId") REFERENCES "ImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AccountImportCoverage" (
  "id" SERIAL NOT NULL,
  "accountId" INTEGER NOT NULL,
  "scopeVersion" INTEGER NOT NULL,
  "scopeHash" VARCHAR(64) NOT NULL,
  "scopeJson" JSONB NOT NULL,
  "coveredFrom" TIMESTAMP(3),
  "coveredThrough" TIMESTAMP(3),
  "lastCompletedImportRunId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccountImportCoverage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountImportCoverage_scopeVersion_check" CHECK ("scopeVersion" > 0),
  CONSTRAINT "AccountImportCoverage_scopeHash_check" CHECK ("scopeHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "AccountImportCoverage_interval_check" CHECK (
    ("coveredFrom" IS NULL AND "coveredThrough" IS NULL)
    OR (
      "coveredFrom" IS NOT NULL
      AND "coveredThrough" IS NOT NULL
      AND "coveredFrom" < "coveredThrough"
    )
  )
);

CREATE UNIQUE INDEX "AccountImportCoverage_accountId_scopeHash_key"
ON "AccountImportCoverage"("accountId", "scopeHash");

CREATE INDEX "AccountImportCoverage_accountId_updatedAt_idx"
ON "AccountImportCoverage"("accountId", "updatedAt" DESC);

CREATE INDEX "AccountImportCoverage_lastCompletedImportRunId_idx"
ON "AccountImportCoverage"("lastCompletedImportRunId");

ALTER TABLE "AccountImportCoverage"
ADD CONSTRAINT "AccountImportCoverage_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "ExternalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountImportCoverage"
ADD CONSTRAINT "AccountImportCoverage_lastCompletedImportRunId_fkey"
FOREIGN KEY ("lastCompletedImportRunId") REFERENCES "ImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
