-- ONB-019 deep self-review hardening:
-- 1. stabilize indirect game scope while child writes are admitted;
-- 2. reject contradictory redundant user/account/game ownership on new writes;
-- 3. stabilize scenario/preparation parent resolution before lifecycle checks;
-- 4. cover AppUser recreation and FK-less OAuth login state under USER fences.

CREATE OR REPLACE FUNCTION "data_lifecycle_assert_game_transition_allowed"(
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
    -- Stabilize both referenced games before deriving lifecycle ownership. A
    -- plain MVCC read can otherwise become stale while another transaction
    -- reparents a game to a different account/user before this transaction
    -- reaches the shared lifecycle user lock.
    PERFORM 1
    FROM "ImportedGame" AS game
    WHERE game."id" = p_old_game_id OR game."id" = p_new_game_id
    ORDER BY game."id"
    FOR SHARE;

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

CREATE FUNCTION "data_lifecycle_assert_account_user_consistent"(
    p_user_id INTEGER,
    p_account_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    account_user_id INTEGER;
BEGIN
    IF p_user_id IS NULL OR p_account_id IS NULL THEN RETURN; END IF;

    -- Callers already hold p_user_id's lifecycle lock. ExternalAccount owner
    -- transitions also take that lock, so this read cannot become stale with
    -- respect to a transition to or from p_user_id before the caller commits.
    SELECT account."userId"
    INTO account_user_id
    FROM "ExternalAccount" AS account
    WHERE account."id" = p_account_id;

    IF account_user_id IS NULL OR account_user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH',
            DETAIL = format(
                'user=%s account=%s accountUser=%s',
                p_user_id,
                p_account_id,
                COALESCE(account_user_id::TEXT, 'missing')
            );
    END IF;
END;
$$;

CREATE FUNCTION "data_lifecycle_assert_game_user_consistent"(
    p_user_id INTEGER,
    p_game_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    game_user_id INTEGER;
BEGIN
    IF p_user_id IS NULL OR p_game_id IS NULL THEN RETURN; END IF;

    -- data_lifecycle_assert_game_transition_allowed has already stabilized the
    -- game row for generic child writers. FOR SHARE also makes this helper safe
    -- if it is reused independently later.
    SELECT game."userId"
    INTO game_user_id
    FROM "ImportedGame" AS game
    WHERE game."id" = p_game_id
    FOR SHARE;

    IF game_user_id IS NULL OR game_user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH',
            DETAIL = format(
                'user=%s game=%s gameUser=%s',
                p_user_id,
                p_game_id,
                COALESCE(game_user_id::TEXT, 'missing')
            );
    END IF;
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
        PERFORM "data_lifecycle_assert_account_user_consistent"(
            NEW."userId",
            NEW."accountId"
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
    PERFORM "data_lifecycle_assert_account_user_consistent"(
        NEW."userId",
        NEW."accountId"
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_imported_game_child_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_game_id INTEGER;
    new_game_id INTEGER;
    new_declared_user_id INTEGER;
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
            WHEN 'ImportedGameAiReview' THEN
                new_game_id := NEW."importedGameId";
                new_declared_user_id := NEW."userId";
            WHEN 'TacticalDetection' THEN
                new_game_id := NEW."importedGameId";
                new_declared_user_id := NEW."userId";
            WHEN 'TacticalDetectionProcessedGame' THEN
                new_game_id := NEW."importedGameId";
                new_declared_user_id := NEW."userId";
            WHEN 'TacticalDetectionFeedback' THEN
                new_game_id := NEW."importedGameId";
                new_declared_user_id := NEW."userId";
            WHEN 'ScenarioTrainingSession' THEN new_game_id := NEW."importedGameId";
            ELSE RAISE EXCEPTION 'Unsupported lifecycle-guarded child table %', TG_TABLE_NAME;
        END CASE;
    END IF;

    PERFORM "data_lifecycle_assert_game_transition_allowed"(old_game_id, new_game_id);
    IF TG_OP <> 'DELETE' AND new_declared_user_id IS NOT NULL THEN
        PERFORM "data_lifecycle_assert_game_user_consistent"(
            new_declared_user_id,
            new_game_id
        );
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
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
        SELECT run."userId"
        INTO new_user_id
        FROM "DataPreparationRun" AS run
        WHERE run."id" = NEW."preparationRunId"
        FOR SHARE;

        IF new_user_id IS NULL THEN RETURN NEW; END IF;
        PERFORM "data_lifecycle_assert_write_allowed"(
            new_user_id,
            NEW."accountId",
            NULL
        );
        IF NEW."accountId" IS NOT NULL THEN
            PERFORM "data_lifecycle_assert_account_user_consistent"(
                new_user_id,
                NEW."accountId"
            );
        END IF;
        RETURN NEW;
    END IF;

    -- Stabilize run ownership in deterministic id order. Account ownership is
    -- validated after lifecycle user locks are held, avoiding a parent/child
    -- row-lock inversion against ExternalAccount cascades.
    PERFORM 1
    FROM "DataPreparationRun" AS run
    WHERE run."id" = OLD."preparationRunId" OR run."id" = NEW."preparationRunId"
    ORDER BY run."id"
    FOR SHARE;

    SELECT run."userId" INTO old_user_id
    FROM "DataPreparationRun" AS run
    WHERE run."id" = OLD."preparationRunId";
    SELECT run."userId" INTO new_user_id
    FROM "DataPreparationRun" AS run
    WHERE run."id" = NEW."preparationRunId";

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        old_user_id,
        OLD."accountId",
        NULL,
        new_user_id,
        NEW."accountId",
        NULL
    );

    IF NEW."accountId" IS NOT NULL THEN
        PERFORM "data_lifecycle_assert_account_user_consistent"(
            new_user_id,
            NEW."accountId"
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION "data_lifecycle_lock_scenario_dependencies"(
    p_old_imported_game_id INTEGER,
    p_old_tactical_detection_id INTEGER,
    p_new_imported_game_id INTEGER,
    p_new_tactical_detection_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    old_detection_game_id INTEGER;
    new_detection_game_id INTEGER;
BEGIN
    -- TacticalDetection UPDATE owns the detection row before its lifecycle
    -- trigger locks a game. Scenario writers use the same detection -> game
    -- dependency order, and lock multiple ids in numeric order.
    PERFORM 1
    FROM "TacticalDetection" AS detection
    WHERE detection."id" = p_old_tactical_detection_id
       OR detection."id" = p_new_tactical_detection_id
    ORDER BY detection."id"
    FOR SHARE;

    IF p_old_tactical_detection_id IS NOT NULL THEN
        SELECT detection."importedGameId"
        INTO old_detection_game_id
        FROM "TacticalDetection" AS detection
        WHERE detection."id" = p_old_tactical_detection_id;
    END IF;
    IF p_new_tactical_detection_id IS NOT NULL THEN
        IF p_new_tactical_detection_id IS NOT DISTINCT FROM p_old_tactical_detection_id THEN
            new_detection_game_id := old_detection_game_id;
        ELSE
            SELECT detection."importedGameId"
            INTO new_detection_game_id
            FROM "TacticalDetection" AS detection
            WHERE detection."id" = p_new_tactical_detection_id;
        END IF;
    END IF;

    PERFORM 1
    FROM "ImportedGame" AS game
    WHERE game."id" = ANY(ARRAY[
        p_old_imported_game_id,
        old_detection_game_id,
        p_new_imported_game_id,
        new_detection_game_id
    ]::INTEGER[])
    ORDER BY game."id"
    FOR SHARE;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_resolve_scenario_scope"(
    p_user_id INTEGER,
    p_imported_game_id INTEGER,
    p_tactical_detection_id INTEGER,
    OUT scope_user_id INTEGER,
    OUT scope_account_id INTEGER,
    OUT scope_game_id INTEGER
)
RETURNS RECORD
LANGUAGE plpgsql
AS $$
DECLARE
    detection_game_id INTEGER;
    detection_user_id INTEGER;
    game_user_id INTEGER;
    game_account_id INTEGER;
BEGIN
    scope_user_id := p_user_id;
    scope_account_id := NULL;
    scope_game_id := NULL;

    IF p_tactical_detection_id IS NOT NULL THEN
        SELECT detection."importedGameId", detection."userId"
        INTO detection_game_id, detection_user_id
        FROM "TacticalDetection" AS detection
        WHERE detection."id" = p_tactical_detection_id
        FOR SHARE;

        IF detection_game_id IS NOT NULL
           AND detection_user_id IS DISTINCT FROM p_user_id THEN
            RAISE EXCEPTION USING
                ERRCODE = 'P0001',
                MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH',
                DETAIL = format(
                    'scenario user=%s detection=%s detectionUser=%s',
                    p_user_id,
                    p_tactical_detection_id,
                    detection_user_id
                );
        END IF;
    END IF;

    IF p_imported_game_id IS NOT NULL
       AND detection_game_id IS NOT NULL
       AND p_imported_game_id IS DISTINCT FROM detection_game_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH',
            DETAIL = format(
                'scenario game=%s detection=%s detectionGame=%s',
                p_imported_game_id,
                p_tactical_detection_id,
                detection_game_id
            );
    END IF;

    scope_game_id := COALESCE(p_imported_game_id, detection_game_id);
    IF scope_game_id IS NULL THEN RETURN; END IF;

    SELECT game."userId", game."accountId"
    INTO game_user_id, game_account_id
    FROM "ImportedGame" AS game
    WHERE game."id" = scope_game_id
    FOR SHARE;

    IF game_user_id IS NULL OR game_user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH',
            DETAIL = format(
                'scenario user=%s game=%s gameUser=%s',
                p_user_id,
                scope_game_id,
                COALESCE(game_user_id::TEXT, 'missing')
            );
    END IF;

    scope_user_id := game_user_id;
    scope_account_id := game_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_scenario_session_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_user_id INTEGER;
    old_account_id INTEGER;
    old_game_id INTEGER;
    new_user_id INTEGER;
    new_account_id INTEGER;
    new_game_id INTEGER;
BEGIN
    PERFORM "data_lifecycle_lock_scenario_dependencies"(
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD."importedGameId" END,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD."tacticalDetectionId" END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW."importedGameId" END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW."tacticalDetectionId" END
    );

    IF TG_OP <> 'INSERT' THEN
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO old_user_id, old_account_id, old_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            OLD."userId",
            OLD."importedGameId",
            OLD."tacticalDetectionId"
        );
    END IF;

    IF TG_OP <> 'DELETE' THEN
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO new_user_id, new_account_id, new_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            NEW."userId",
            NEW."importedGameId",
            NEW."tacticalDetectionId"
        );
    END IF;

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        old_user_id,
        old_account_id,
        old_game_id,
        new_user_id,
        new_account_id,
        new_game_id
    );

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
    old_session_user_id INTEGER;
    old_session_game_id INTEGER;
    old_session_detection_id INTEGER;
    new_session_user_id INTEGER;
    new_session_game_id INTEGER;
    new_session_detection_id INTEGER;
    old_user_id INTEGER;
    old_account_id INTEGER;
    old_game_id INTEGER;
    new_user_id INTEGER;
    new_account_id INTEGER;
    new_game_id INTEGER;
BEGIN
    IF TG_OP <> 'INSERT' THEN old_session_id := OLD."sessionId"; END IF;
    IF TG_OP <> 'DELETE' THEN new_session_id := NEW."sessionId"; END IF;

    PERFORM 1
    FROM "ScenarioTrainingSession" AS session
    WHERE session."id" = old_session_id OR session."id" = new_session_id
    ORDER BY session."id"
    FOR SHARE;

    IF old_session_id IS NOT NULL THEN
        SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
        INTO old_session_user_id, old_session_game_id, old_session_detection_id
        FROM "ScenarioTrainingSession" AS session
        WHERE session."id" = old_session_id;
    END IF;
    IF new_session_id IS NOT NULL THEN
        IF new_session_id IS NOT DISTINCT FROM old_session_id THEN
            new_session_user_id := old_session_user_id;
            new_session_game_id := old_session_game_id;
            new_session_detection_id := old_session_detection_id;
        ELSE
            SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
            INTO new_session_user_id, new_session_game_id, new_session_detection_id
            FROM "ScenarioTrainingSession" AS session
            WHERE session."id" = new_session_id;
        END IF;
    END IF;

    PERFORM "data_lifecycle_lock_scenario_dependencies"(
        old_session_game_id,
        old_session_detection_id,
        new_session_game_id,
        new_session_detection_id
    );

    IF old_session_user_id IS NOT NULL THEN
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO old_user_id, old_account_id, old_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            old_session_user_id,
            old_session_game_id,
            old_session_detection_id
        );
    END IF;

    IF new_session_user_id IS NOT NULL THEN
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO new_user_id, new_account_id, new_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            new_session_user_id,
            new_session_game_id,
            new_session_detection_id
        );
    END IF;

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        old_user_id,
        old_account_id,
        old_game_id,
        new_user_id,
        new_account_id,
        new_game_id
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

-- AppUser inserts were previously unguarded because normal external provisioning
-- allocates a fresh id. During DELETE_APP_USER, however, a direct writer must not
-- be able to recreate the just-deleted numeric user id while its USER fence is
-- still active.
DROP TRIGGER "AppUser_data_lifecycle_guard" ON "AppUser";
CREATE TRIGGER "AppUser_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "AppUser"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_app_user_write"();

-- OAuthLoginState intentionally has no AppUser FK, so final AppUser deletion
-- cannot catch a login-state row admitted concurrently after explicit cleanup.
CREATE FUNCTION "data_lifecycle_guard_oauth_login_state_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM "data_lifecycle_assert_write_allowed"(NEW."userId", NULL, NULL);
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN
        PERFORM "data_lifecycle_assert_write_allowed"(OLD."userId", NULL, NULL);
        RETURN OLD;
    END IF;

    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        OLD."userId",
        NULL,
        NULL,
        NEW."userId",
        NULL,
        NULL
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER "OAuthLoginState_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "OAuthLoginState"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_oauth_login_state_write"();
