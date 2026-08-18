-- ONB-019: durable destructive lifecycle operations, resource fences, audit,
-- deleted-auth tombstones, opening provenance, and commit-side write guards.

ALTER TABLE "ImportedGame"
ADD COLUMN "openingProvenance" VARCHAR(16) NOT NULL DEFAULT 'NONE';

UPDATE "ImportedGame"
SET "openingProvenance" = CASE
    WHEN "openingName" IS NOT NULL OR "openingEco" IS NOT NULL THEN 'UNKNOWN'
    ELSE 'NONE'
END;

ALTER TABLE "ImportedGame"
ADD CONSTRAINT "ImportedGame_openingProvenance_check"
CHECK ("openingProvenance" IN ('PROVIDER', 'LOCAL_BOOK', 'UNKNOWN', 'NONE'));

CREATE TABLE "DataLifecycleOperation" (
    "id" SERIAL NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "actorUserId" INTEGER,
    "targetUserId" INTEGER NOT NULL,
    "actorKeyVersion" INTEGER NOT NULL,
    "actorKeyHash" VARCHAR(64) NOT NULL,
    "targetKeyVersion" INTEGER NOT NULL,
    "targetKeyHash" VARCHAR(64) NOT NULL,
    "scopeResourceType" VARCHAR(16) NOT NULL,
    "scopeJson" JSONB NOT NULL,
    "previewCountsJson" JSONB NOT NULL,
    "previewHash" VARCHAR(64) NOT NULL,
    "previewTokenHash" VARCHAR(64) NOT NULL,
    "previewExpiresAt" TIMESTAMP(3) NOT NULL,
    "confirmationPhrase" VARCHAR(120) NOT NULL,
    "warningCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "idempotencyKeyHash" VARCHAR(64),
    "stopRequest" VARCHAR(24) NOT NULL DEFAULT 'NONE',
    "stopRequestedAt" TIMESTAMP(3),
    "checkpointJson" JSONB,
    "workKey" VARCHAR(80),
    "claimedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "firstDestructiveCommitAt" TIMESTAMP(3),
    "verificationJson" JSONB,
    "terminalResult" VARCHAR(40),
    "errorCode" VARCHAR(120),
    "receiptTokenHash" VARCHAR(64),
    "receiptExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataLifecycleOperation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataLifecycleOperation_action_check" CHECK ("action" IN (
        'UNANALYSE_GAMES', 'UNINDEX_GAMES', 'PURGE_ACCOUNT_DATA',
        'DELETE_EXTERNAL_ACCOUNT', 'DELETE_APP_USER'
    )),
    CONSTRAINT "DataLifecycleOperation_status_check" CHECK ("status" IN (
        'PREVIEWED', 'QUEUED', 'FENCING', 'CANCEL_REQUESTED',
        'WAITING_FOR_DRAIN', 'EXECUTING', 'VERIFYING', 'COMPLETED',
        'NEEDS_ATTENTION', 'FAILED', 'CANCELLED', 'EXPIRED'
    )),
    CONSTRAINT "DataLifecycleOperation_scopeResourceType_check"
        CHECK ("scopeResourceType" IN ('USER', 'ACCOUNT', 'GAME')),
    CONSTRAINT "DataLifecycleOperation_stopRequest_check"
        CHECK ("stopRequest" IN ('NONE', 'CANCEL', 'STOP_AFTER_BATCH')),
    CONSTRAINT "DataLifecycleOperation_terminalResult_check" CHECK (
        "terminalResult" IS NULL OR "terminalResult" IN (
            'COMPLETED', 'CANCELLED_BEFORE_MUTATION', 'FAILED_BEFORE_MUTATION',
            'NEEDS_ATTENTION', 'EXPIRED'
        )
    ),
    CONSTRAINT "DataLifecycleOperation_keyVersion_check"
        CHECK ("actorKeyVersion" > 0 AND "targetKeyVersion" > 0),
    CONSTRAINT "DataLifecycleOperation_previewExpiry_check"
        CHECK ("previewExpiresAt" > "createdAt"),
    CONSTRAINT "DataLifecycleOperation_cancelBeforeMutation_check"
        CHECK ("status" <> 'CANCELLED' OR "firstDestructiveCommitAt" IS NULL),
    CONSTRAINT "DataLifecycleOperation_forwardOnlyMutation_check" CHECK (
        "firstDestructiveCommitAt" IS NULL
        OR "status" NOT IN ('PREVIEWED', 'QUEUED', 'FENCING', 'CANCELLED', 'EXPIRED', 'FAILED')
    )
);

CREATE TABLE "DataLifecycleResourceFence" (
    "id" SERIAL NOT NULL,
    "operationId" INTEGER NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "ownerAccountId" INTEGER,
    "resourceType" VARCHAR(16) NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "DataLifecycleResourceFence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataLifecycleResourceFence_resourceType_check"
        CHECK ("resourceType" IN ('USER', 'ACCOUNT', 'GAME')),
    CONSTRAINT "DataLifecycleResourceFence_resourceId_check" CHECK ("resourceId" > 0),
    CONSTRAINT "DataLifecycleResourceFence_ownerUserId_check" CHECK ("ownerUserId" > 0),
    CONSTRAINT "DataLifecycleResourceFence_accountShape_check" CHECK (
        ("resourceType" = 'USER' AND "ownerAccountId" IS NULL)
        OR ("resourceType" IN ('ACCOUNT', 'GAME') AND "ownerAccountId" IS NOT NULL)
    )
);

-- No target-row FK by design: audit evidence must survive destructive cascades.
CREATE TABLE "DataLifecycleAuditEvent" (
    "id" SERIAL NOT NULL,
    "operationId" INTEGER NOT NULL,
    "eventType" VARCHAR(80) NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "status" VARCHAR(32),
    "actorKeyVersion" INTEGER NOT NULL,
    "actorKeyHash" VARCHAR(64) NOT NULL,
    "targetKeyVersion" INTEGER NOT NULL,
    "targetKeyHash" VARCHAR(64) NOT NULL,
    "resourceType" VARCHAR(16),
    "aggregateCountsJson" JSONB,
    "reasonCode" VARCHAR(120),
    "errorCode" VARCHAR(120),
    "confirmationMethod" VARCHAR(120),
    "terminalResult" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataLifecycleAuditEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataLifecycleAuditEvent_action_check" CHECK ("action" IN (
        'UNANALYSE_GAMES', 'UNINDEX_GAMES', 'PURGE_ACCOUNT_DATA',
        'DELETE_EXTERNAL_ACCOUNT', 'DELETE_APP_USER'
    )),
    CONSTRAINT "DataLifecycleAuditEvent_resourceType_check"
        CHECK ("resourceType" IS NULL OR "resourceType" IN ('USER', 'ACCOUNT', 'GAME')),
    CONSTRAINT "DataLifecycleAuditEvent_keyVersion_check"
        CHECK ("actorKeyVersion" > 0 AND "targetKeyVersion" > 0)
);

-- External auth subjects are represented only by a versioned HMAC digest.
CREATE TABLE "DeletedAuthIdentityTombstone" (
    "id" SERIAL NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "identityKeyVersion" INTEGER NOT NULL,
    "identityKeyHash" VARCHAR(64) NOT NULL,
    "operationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedAuthIdentityTombstone_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DeletedAuthIdentityTombstone_keyVersion_check" CHECK ("identityKeyVersion" > 0)
);

CREATE UNIQUE INDEX "DataLifecycleOperation_previewTokenHash_key"
ON "DataLifecycleOperation"("previewTokenHash");
CREATE UNIQUE INDEX "DataLifecycleOperation_workKey_key"
ON "DataLifecycleOperation"("workKey");
CREATE UNIQUE INDEX "DataLifecycleOperation_receiptTokenHash_key"
ON "DataLifecycleOperation"("receiptTokenHash");
CREATE UNIQUE INDEX "DataLifecycleOperation_targetUserId_idempotencyKeyHash_key"
ON "DataLifecycleOperation"("targetUserId", "idempotencyKeyHash")
WHERE "idempotencyKeyHash" IS NOT NULL;
CREATE INDEX "DataLifecycleOperation_targetUserId_idempotencyKeyHash_idx"
ON "DataLifecycleOperation"("targetUserId", "idempotencyKeyHash");
CREATE INDEX "DataLifecycleOperation_targetUserId_status_updatedAt_idx"
ON "DataLifecycleOperation"("targetUserId", "status", "updatedAt");
CREATE INDEX "DataLifecycleOperation_status_updatedAt_idx"
ON "DataLifecycleOperation"("status", "updatedAt");
CREATE INDEX "DataLifecycleOperation_previewExpiresAt_idx"
ON "DataLifecycleOperation"("previewExpiresAt");
CREATE INDEX "DataLifecycleOperation_completedAt_idx"
ON "DataLifecycleOperation"("completedAt");

CREATE INDEX "DataLifecycleResourceFence_operationId_releasedAt_idx"
ON "DataLifecycleResourceFence"("operationId", "releasedAt");
CREATE INDEX "DataLifecycleResourceFence_ownerUserId_releasedAt_idx"
ON "DataLifecycleResourceFence"("ownerUserId", "releasedAt");
CREATE INDEX "DataLifecycleResourceFence_ownerAccountId_releasedAt_idx"
ON "DataLifecycleResourceFence"("ownerAccountId", "releasedAt");
CREATE INDEX "DataLifecycleResourceFence_resourceType_resourceId_releasedAt_idx"
ON "DataLifecycleResourceFence"("resourceType", "resourceId", "releasedAt");
CREATE UNIQUE INDEX "DataLifecycleResourceFence_one_active_resource_key"
ON "DataLifecycleResourceFence"("resourceType", "resourceId")
WHERE "releasedAt" IS NULL;

CREATE INDEX "DataLifecycleAuditEvent_operationId_createdAt_idx"
ON "DataLifecycleAuditEvent"("operationId", "createdAt");
CREATE INDEX "DataLifecycleAuditEvent_targetKeyVersion_targetKeyHash_createdAt_idx"
ON "DataLifecycleAuditEvent"("targetKeyVersion", "targetKeyHash", "createdAt");
CREATE INDEX "DataLifecycleAuditEvent_createdAt_idx"
ON "DataLifecycleAuditEvent"("createdAt");

CREATE UNIQUE INDEX "DeletedAuthIdentityTombstone_provider_identityKeyVersion_identityKeyHash_key"
ON "DeletedAuthIdentityTombstone"("provider", "identityKeyVersion", "identityKeyHash");
CREATE INDEX "DeletedAuthIdentityTombstone_operationId_idx"
ON "DeletedAuthIdentityTombstone"("operationId");
CREATE INDEX "DeletedAuthIdentityTombstone_createdAt_idx"
ON "DeletedAuthIdentityTombstone"("createdAt");

ALTER TABLE "DataLifecycleResourceFence"
ADD CONSTRAINT "DataLifecycleResourceFence_operationId_fkey"
FOREIGN KEY ("operationId") REFERENCES "DataLifecycleOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "data_lifecycle_assert_write_allowed"(
    p_user_id INTEGER,
    p_account_id INTEGER DEFAULT NULL,
    p_game_id INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    active_operation_id INTEGER;
    active_resource_type VARCHAR(16);
    active_resource_id INTEGER;
    current_operation_id INTEGER;
BEGIN
    IF p_user_id IS NULL THEN RETURN; END IF;

    PERFORM pg_advisory_xact_lock(17000259, p_user_id);

    BEGIN
        current_operation_id := NULLIF(current_setting('app.data_lifecycle_operation_id', TRUE), '')::INTEGER;
    EXCEPTION WHEN invalid_text_representation THEN
        current_operation_id := NULL;
    END;

    SELECT fence."operationId", fence."resourceType", fence."resourceId"
    INTO active_operation_id, active_resource_type, active_resource_id
    FROM "DataLifecycleResourceFence" AS fence
    WHERE fence."releasedAt" IS NULL
      AND fence."ownerUserId" = p_user_id
      AND (current_operation_id IS NULL OR fence."operationId" <> current_operation_id)
      AND (
        fence."resourceType" = 'USER'
        OR (p_account_id IS NOT NULL AND fence."resourceType" = 'ACCOUNT' AND fence."resourceId" = p_account_id)
        OR (p_game_id IS NOT NULL AND fence."resourceType" = 'GAME' AND fence."resourceId" = p_game_id)
      )
    ORDER BY CASE fence."resourceType" WHEN 'USER' THEN 0 WHEN 'ACCOUNT' THEN 1 ELSE 2 END, fence."id"
    LIMIT 1;

    IF active_operation_id IS NOT NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_WRITE_BLOCKED',
            DETAIL = format('operation=%s resource=%s:%s', active_operation_id, active_resource_type, active_resource_id);
    END IF;
END;
$$;

CREATE FUNCTION "data_lifecycle_guard_fence_insert"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(17000259, NEW."ownerUserId");
    IF EXISTS (
        SELECT 1 FROM "DataLifecycleResourceFence" AS fence
        WHERE fence."ownerUserId" = NEW."ownerUserId"
          AND fence."releasedAt" IS NULL
          AND fence."operationId" <> NEW."operationId"
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DATA_LIFECYCLE_CONFLICT';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataLifecycleResourceFence_guard_insert"
BEFORE INSERT ON "DataLifecycleResourceFence"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_fence_insert"();

CREATE FUNCTION "data_lifecycle_guard_imported_game_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    game_row "ImportedGame"%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        game_row := OLD;
    ELSE
        game_row := NEW;
        IF TG_OP = 'INSERT'
           AND game_row."openingProvenance" = 'NONE'
           AND (game_row."openingName" IS NOT NULL OR game_row."openingEco" IS NOT NULL) THEN
            NEW."openingProvenance" := 'PROVIDER';
            game_row."openingProvenance" := 'PROVIDER';
        END IF;
    END IF;

    PERFORM "data_lifecycle_assert_write_allowed"(game_row."userId", game_row."accountId", game_row."id");
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "ImportedGame_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ImportedGame"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_write"();

CREATE FUNCTION "data_lifecycle_guard_external_account_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    account_row "ExternalAccount"%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN account_row := OLD; ELSE account_row := NEW; END IF;
    PERFORM "data_lifecycle_assert_write_allowed"(
        account_row."userId",
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE account_row."id" END,
        NULL
    );
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "ExternalAccount_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ExternalAccount"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_external_account_write"();

CREATE FUNCTION "data_lifecycle_guard_app_user_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_row "AppUser"%ROWTYPE;
    current_operation_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN user_row := OLD; ELSE user_row := NEW; END IF;
    PERFORM "data_lifecycle_assert_write_allowed"(user_row."id", NULL, NULL);

    IF TG_OP = 'DELETE' THEN
        BEGIN
            current_operation_id := NULLIF(current_setting('app.data_lifecycle_operation_id', TRUE), '')::INTEGER;
        EXCEPTION WHEN invalid_text_representation THEN
            current_operation_id := NULL;
        END;

        IF current_operation_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1
               FROM "DeletedAuthIdentityTombstone" AS tombstone
               JOIN "DataLifecycleOperation" AS operation ON operation."id" = tombstone."operationId"
               WHERE tombstone."operationId" = current_operation_id
                 AND operation."targetUserId" = user_row."id"
                 AND operation."action" = 'DELETE_APP_USER'
           ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DATA_LIFECYCLE_TOMBSTONE_REQUIRED';
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "AppUser_data_lifecycle_guard"
BEFORE UPDATE OR DELETE ON "AppUser"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_app_user_write"();

CREATE FUNCTION "data_lifecycle_guard_preparation_target_insert"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    preparation_user_id INTEGER;
BEGIN
    IF NEW."accountId" IS NULL THEN RETURN NEW; END IF;
    SELECT "userId" INTO preparation_user_id
    FROM "DataPreparationRun" WHERE "id" = NEW."preparationRunId";
    PERFORM "data_lifecycle_assert_write_allowed"(preparation_user_id, NEW."accountId", NULL);
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationTarget_data_lifecycle_guard"
BEFORE INSERT ON "DataPreparationTarget"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_preparation_target_insert"();

CREATE FUNCTION "data_lifecycle_guard_imported_game_child_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    game_id INTEGER;
    game_user_id INTEGER;
    game_account_id INTEGER;
BEGIN
    CASE TG_TABLE_NAME
        WHEN 'ImportedGamePly' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        WHEN 'GameAnalysisRun' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        WHEN 'ImportedGameAiReview' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        WHEN 'TacticalDetection' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        WHEN 'TacticalDetectionProcessedGame' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        WHEN 'TacticalDetectionFeedback' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        WHEN 'ScenarioTrainingSession' THEN game_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."importedGameId" ELSE NEW."importedGameId" END;
        ELSE RAISE EXCEPTION 'Unsupported lifecycle-guarded child table %', TG_TABLE_NAME;
    END CASE;

    IF game_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    SELECT game."userId", game."accountId" INTO game_user_id, game_account_id
    FROM "ImportedGame" AS game WHERE game."id" = game_id;
    IF game_user_id IS NOT NULL THEN
        PERFORM "data_lifecycle_assert_write_allowed"(game_user_id, game_account_id, game_id);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "ImportedGamePly_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ImportedGamePly"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();
CREATE TRIGGER "GameAnalysisRun_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "GameAnalysisRun"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();
CREATE TRIGGER "ImportedGameAiReview_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ImportedGameAiReview"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();
CREATE TRIGGER "TacticalDetection_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "TacticalDetection"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();
CREATE TRIGGER "TacticalDetectionProcessedGame_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "TacticalDetectionProcessedGame"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();
CREATE TRIGGER "TacticalDetectionFeedback_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "TacticalDetectionFeedback"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();
CREATE TRIGGER "ScenarioTrainingSession_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ScenarioTrainingSession"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_imported_game_child_write"();

CREATE FUNCTION "data_lifecycle_guard_scenario_attempt_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    session_id INTEGER;
    game_id INTEGER;
    game_user_id INTEGER;
    game_account_id INTEGER;
BEGIN
    session_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."sessionId" ELSE NEW."sessionId" END;
    SELECT session."importedGameId" INTO game_id
    FROM "ScenarioTrainingSession" AS session WHERE session."id" = session_id;

    IF game_id IS NOT NULL THEN
        SELECT game."userId", game."accountId" INTO game_user_id, game_account_id
        FROM "ImportedGame" AS game WHERE game."id" = game_id;
        IF game_user_id IS NOT NULL THEN
            PERFORM "data_lifecycle_assert_write_allowed"(game_user_id, game_account_id, game_id);
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "ScenarioTrainingAttempt_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ScenarioTrainingAttempt"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_scenario_attempt_write"();

CREATE FUNCTION "data_lifecycle_guard_job_task_admission"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    should_guard BOOLEAN := FALSE;
    game_user_id INTEGER;
    game_account_id INTEGER;
BEGIN
    IF NEW."importedGameId" IS NULL THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
        should_guard := NEW."status" IN ('QUEUED', 'RUNNING');
    ELSE
        should_guard := NEW."status" = 'RUNNING'
            AND NEW."workKey" IS NOT NULL
            AND (
                OLD."status" IS DISTINCT FROM NEW."status"
                OR OLD."workKey" IS DISTINCT FROM NEW."workKey"
                OR OLD."importedGameId" IS DISTINCT FROM NEW."importedGameId"
            );
    END IF;

    IF NOT should_guard THEN RETURN NEW; END IF;

    SELECT game."userId", game."accountId" INTO game_user_id, game_account_id
    FROM "ImportedGame" AS game WHERE game."id" = NEW."importedGameId";
    IF game_user_id IS NOT NULL THEN
        PERFORM "data_lifecycle_assert_write_allowed"(game_user_id, game_account_id, NEW."importedGameId");
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "JobTask_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OF "status", "workKey", "importedGameId" ON "JobTask"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_job_task_admission"();

CREATE FUNCTION "data_lifecycle_reject_audit_update"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DATA_LIFECYCLE_AUDIT_IS_APPEND_ONLY';
END;
$$;

CREATE TRIGGER "DataLifecycleAuditEvent_append_only"
BEFORE UPDATE ON "DataLifecycleAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_reject_audit_update"();
