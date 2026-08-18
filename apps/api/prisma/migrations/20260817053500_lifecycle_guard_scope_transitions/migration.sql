-- ONB-019 self-review hardening: writes that move a durable row between
-- user/account/game scopes must validate both the old and new scope. Checking
-- only NEW would allow a row to be moved out of a fenced scope.

CREATE FUNCTION "data_lifecycle_assert_write_transition_allowed"(
    p_old_user_id INTEGER,
    p_old_account_id INTEGER DEFAULT NULL,
    p_old_game_id INTEGER DEFAULT NULL,
    p_new_user_id INTEGER DEFAULT NULL,
    p_new_account_id INTEGER DEFAULT NULL,
    p_new_game_id INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_old_user_id IS NULL AND p_new_user_id IS NULL THEN RETURN; END IF;

    IF p_old_user_id IS NULL THEN
        PERFORM "data_lifecycle_assert_write_allowed"(
            p_new_user_id,
            p_new_account_id,
            p_new_game_id
        );
        RETURN;
    END IF;

    IF p_new_user_id IS NULL THEN
        PERFORM "data_lifecycle_assert_write_allowed"(
            p_old_user_id,
            p_old_account_id,
            p_old_game_id
        );
        RETURN;
    END IF;

    -- Keep cross-user transitions deadlock-safe by taking the shared lifecycle
    -- user locks in numeric order. Re-locking the same user in one transaction
    -- is harmless and lets the existing assertion function remain the one
    -- source of truth for hierarchical fence overlap.
    IF p_old_user_id <= p_new_user_id THEN
        PERFORM "data_lifecycle_assert_write_allowed"(
            p_old_user_id,
            p_old_account_id,
            p_old_game_id
        );
        IF p_old_user_id IS DISTINCT FROM p_new_user_id
           OR p_old_account_id IS DISTINCT FROM p_new_account_id
           OR p_old_game_id IS DISTINCT FROM p_new_game_id THEN
            PERFORM "data_lifecycle_assert_write_allowed"(
                p_new_user_id,
                p_new_account_id,
                p_new_game_id
            );
        END IF;
    ELSE
        PERFORM "data_lifecycle_assert_write_allowed"(
            p_new_user_id,
            p_new_account_id,
            p_new_game_id
        );
        PERFORM "data_lifecycle_assert_write_allowed"(
            p_old_user_id,
            p_old_account_id,
            p_old_game_id
        );
    END IF;
END;
$$;

CREATE FUNCTION "data_lifecycle_assert_game_transition_allowed"(
    p_old_game_id INTEGER,
    p_new_game_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    old_user_id INTEGER;
    old_account_id INTEGER;
    new_user_id INTEGER;
    new_account_id INTEGER;
BEGIN
    IF p_old_game_id IS NOT NULL THEN
        SELECT game."userId", game."accountId"
        INTO old_user_id, old_account_id
        FROM "ImportedGame" AS game
        WHERE game."id" = p_old_game_id;
    END IF;

    IF p_new_game_id IS NOT NULL THEN
        IF p_new_game_id IS NOT DISTINCT FROM p_old_game_id THEN
            new_user_id := old_user_id;
            new_account_id := old_account_id;
        ELSE
            SELECT game."userId", game."accountId"
            INTO new_user_id, new_account_id
            FROM "ImportedGame" AS game
            WHERE game."id" = p_new_game_id;
        END IF;
    END IF;

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        old_user_id,
        old_account_id,
        p_old_game_id,
        new_user_id,
        new_account_id,
        p_new_game_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_imported_game_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."openingProvenance" = 'NONE'
           AND (NEW."openingName" IS NOT NULL OR NEW."openingEco" IS NOT NULL) THEN
            NEW."openingProvenance" := 'PROVIDER';
        END IF;
        PERFORM "data_lifecycle_assert_write_allowed"(
            NEW."userId",
            NEW."accountId",
            NEW."id"
        );
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM "data_lifecycle_assert_write_allowed"(
            OLD."userId",
            OLD."accountId",
            OLD."id"
        );
        RETURN OLD;
    END IF;

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        OLD."userId",
        OLD."accountId",
        OLD."id",
        NEW."userId",
        NEW."accountId",
        NEW."id"
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_external_account_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- A brand-new account has no established account resource yet, so
        -- conservatively treat creation as a user-scoped write.
        PERFORM "data_lifecycle_assert_write_allowed"(NEW."userId", NULL, NULL);
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM "data_lifecycle_assert_write_allowed"(OLD."userId", OLD."id", NULL);
        RETURN OLD;
    END IF;

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        OLD."userId",
        OLD."id",
        NULL,
        NEW."userId",
        NEW."id",
        NULL
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_preparation_target_insert"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_user_id INTEGER;
    new_user_id INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."accountId" IS NULL THEN RETURN NEW; END IF;
        SELECT "userId" INTO new_user_id
        FROM "DataPreparationRun"
        WHERE "id" = NEW."preparationRunId";
        PERFORM "data_lifecycle_assert_write_allowed"(new_user_id, NEW."accountId", NULL);
        RETURN NEW;
    END IF;

    SELECT "userId" INTO old_user_id
    FROM "DataPreparationRun"
    WHERE "id" = OLD."preparationRunId";
    SELECT "userId" INTO new_user_id
    FROM "DataPreparationRun"
    WHERE "id" = NEW."preparationRunId";

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        old_user_id,
        OLD."accountId",
        NULL,
        new_user_id,
        NEW."accountId",
        NULL
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER "DataPreparationTarget_data_lifecycle_guard" ON "DataPreparationTarget";
CREATE TRIGGER "DataPreparationTarget_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OF "preparationRunId", "accountId" ON "DataPreparationTarget"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_preparation_target_insert"();

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_imported_game_child_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_game_id INTEGER;
    new_game_id INTEGER;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        CASE TG_TABLE_NAME
            WHEN 'ImportedGamePly' THEN old_game_id := OLD."importedGameId";
            WHEN 'GameAnalysisRun' THEN old_game_id := OLD."importedGameId";
            WHEN 'ImportedGameAiReview' THEN old_game_id := OLD."importedGameId";
            WHEN 'TacticalDetection' THEN old_game_id := OLD."importedGameId";
            WHEN 'TacticalDetectionProcessedGame' THEN old_game_id := OLD."importedGameId";
            WHEN 'TacticalDetectionFeedback' THEN old_game_id := OLD."importedGameId";
            WHEN 'ScenarioTrainingSession' THEN old_game_id := OLD."importedGameId";
            ELSE RAISE EXCEPTION 'Unsupported lifecycle-guarded child table %', TG_TABLE_NAME;
        END CASE;
    END IF;

    IF TG_OP <> 'DELETE' THEN
        CASE TG_TABLE_NAME
            WHEN 'ImportedGamePly' THEN new_game_id := NEW."importedGameId";
            WHEN 'GameAnalysisRun' THEN new_game_id := NEW."importedGameId";
            WHEN 'ImportedGameAiReview' THEN new_game_id := NEW."importedGameId";
            WHEN 'TacticalDetection' THEN new_game_id := NEW."importedGameId";
            WHEN 'TacticalDetectionProcessedGame' THEN new_game_id := NEW."importedGameId";
            WHEN 'TacticalDetectionFeedback' THEN new_game_id := NEW."importedGameId";
            WHEN 'ScenarioTrainingSession' THEN new_game_id := NEW."importedGameId";
            ELSE RAISE EXCEPTION 'Unsupported lifecycle-guarded child table %', TG_TABLE_NAME;
        END CASE;
    END IF;

    PERFORM "data_lifecycle_assert_game_transition_allowed"(old_game_id, new_game_id);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_scenario_attempt_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_session_id INTEGER;
    new_session_id INTEGER;
    old_game_id INTEGER;
    new_game_id INTEGER;
BEGIN
    IF TG_OP <> 'INSERT' THEN old_session_id := OLD."sessionId"; END IF;
    IF TG_OP <> 'DELETE' THEN new_session_id := NEW."sessionId"; END IF;

    IF old_session_id IS NOT NULL THEN
        SELECT session."importedGameId" INTO old_game_id
        FROM "ScenarioTrainingSession" AS session
        WHERE session."id" = old_session_id;
    END IF;
    IF new_session_id IS NOT NULL THEN
        IF new_session_id IS NOT DISTINCT FROM old_session_id THEN
            new_game_id := old_game_id;
        ELSE
            SELECT session."importedGameId" INTO new_game_id
            FROM "ScenarioTrainingSession" AS session
            WHERE session."id" = new_session_id;
        END IF;
    END IF;

    PERFORM "data_lifecycle_assert_game_transition_allowed"(old_game_id, new_game_id);
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_job_task_admission"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD."importedGameId" IS NOT NULL THEN
            PERFORM "data_lifecycle_assert_game_transition_allowed"(
                OLD."importedGameId",
                NULL
            );
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW."importedGameId" IS NOT NULL
           AND NEW."status" IN ('QUEUED', 'RUNNING') THEN
            PERFORM "data_lifecycle_assert_game_transition_allowed"(
                NULL,
                NEW."importedGameId"
            );
        END IF;
        RETURN NEW;
    END IF;

    IF OLD."importedGameId" IS DISTINCT FROM NEW."importedGameId" THEN
        PERFORM "data_lifecycle_assert_game_transition_allowed"(
            OLD."importedGameId",
            NEW."importedGameId"
        );
    END IF;

    IF NEW."importedGameId" IS NOT NULL
       AND NEW."status" IN ('QUEUED', 'RUNNING')
       AND (
           OLD."status" IS DISTINCT FROM NEW."status"
           OR OLD."workKey" IS DISTINCT FROM NEW."workKey"
       ) THEN
        PERFORM "data_lifecycle_assert_game_transition_allowed"(
            NULL,
            NEW."importedGameId"
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER "JobTask_data_lifecycle_guard" ON "JobTask";
CREATE TRIGGER "JobTask_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OF "status", "workKey", "importedGameId" ON "JobTask"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_job_task_admission"();
CREATE TRIGGER "JobTask_data_lifecycle_guard_delete"
BEFORE DELETE ON "JobTask"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_job_task_admission"();
