-- Replace parent-row stabilization from the preceding self-review migration
-- with lifecycle-lock + revalidation. Parent FOR SHARE locks are unsafe for
-- child triggers because a parent cascade can already hold the parent row while
-- waiting for the child row, producing a lock-order cycle. Ownership-changing
-- writers already share the lifecycle user lock, so revalidation under that
-- lock closes the stale-scope race without parent/child row-lock inversion.

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
    verify_old_user_id INTEGER;
    verify_old_account_id INTEGER;
    verify_new_user_id INTEGER;
    verify_new_account_id INTEGER;
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

    -- Once the snapshot user lock(s) are held, every legitimate game
    -- ownership/account transition that could invalidate the snapshot must wait.
    -- If such a transition committed before we acquired the lock, detect it now
    -- and fail the writer so its short transaction can retry from current scope.
    IF p_old_game_id IS NOT NULL THEN
        SELECT game."userId", game."accountId"
        INTO verify_old_user_id, verify_old_account_id
        FROM "ImportedGame" AS game
        WHERE game."id" = p_old_game_id;
    END IF;
    IF p_new_game_id IS NOT NULL THEN
        IF p_new_game_id IS NOT DISTINCT FROM p_old_game_id THEN
            verify_new_user_id := verify_old_user_id;
            verify_new_account_id := verify_old_account_id;
        ELSE
            SELECT game."userId", game."accountId"
            INTO verify_new_user_id, verify_new_account_id
            FROM "ImportedGame" AS game
            WHERE game."id" = p_new_game_id;
        END IF;
    END IF;

    IF old_user_id IS DISTINCT FROM verify_old_user_id
       OR old_account_id IS DISTINCT FROM verify_old_account_id
       OR new_user_id IS DISTINCT FROM verify_new_user_id
       OR new_account_id IS DISTINCT FROM verify_new_account_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED',
            DETAIL = format(
                'oldGame=%s newGame=%s lifecycle scope changed while writer was entering commit guard',
                COALESCE(p_old_game_id::TEXT, 'null'),
                COALESCE(p_new_game_id::TEXT, 'null')
            );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "data_lifecycle_assert_game_user_consistent"(
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

    SELECT game."userId"
    INTO game_user_id
    FROM "ImportedGame" AS game
    WHERE game."id" = p_game_id;

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

-- DataPreparationTarget derives its user scope from DataPreparationRun. Make a
-- direct owner transition on that parent participate in the same lifecycle lock
-- protocol so target revalidation below is race-safe without locking parent rows.
CREATE FUNCTION "data_lifecycle_guard_preparation_run_owner_transition"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM "data_lifecycle_assert_write_transition_allowed"(
        OLD."userId", NULL, NULL,
        NEW."userId", NULL, NULL
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationRun_data_lifecycle_owner_guard"
BEFORE UPDATE OF "userId" ON "DataPreparationRun"
FOR EACH ROW
WHEN (OLD."userId" IS DISTINCT FROM NEW."userId")
EXECUTE FUNCTION "data_lifecycle_guard_preparation_run_owner_transition"();

CREATE OR REPLACE FUNCTION "data_lifecycle_guard_preparation_target_insert"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_user_id INTEGER;
    new_user_id INTEGER;
    verify_old_user_id INTEGER;
    verify_new_user_id INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT run."userId"
        INTO new_user_id
        FROM "DataPreparationRun" AS run
        WHERE run."id" = NEW."preparationRunId";

        IF new_user_id IS NULL THEN RETURN NEW; END IF;
        PERFORM "data_lifecycle_assert_write_allowed"(
            new_user_id,
            NEW."accountId",
            NULL
        );

        SELECT run."userId"
        INTO verify_new_user_id
        FROM "DataPreparationRun" AS run
        WHERE run."id" = NEW."preparationRunId";
        IF new_user_id IS DISTINCT FROM verify_new_user_id THEN
            RAISE EXCEPTION USING
                ERRCODE = 'P0001',
                MESSAGE = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED';
        END IF;
        IF NEW."accountId" IS NOT NULL THEN
            PERFORM "data_lifecycle_assert_account_user_consistent"(
                new_user_id,
                NEW."accountId"
            );
        END IF;
        RETURN NEW;
    END IF;

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

    SELECT run."userId" INTO verify_old_user_id
    FROM "DataPreparationRun" AS run
    WHERE run."id" = OLD."preparationRunId";
    SELECT run."userId" INTO verify_new_user_id
    FROM "DataPreparationRun" AS run
    WHERE run."id" = NEW."preparationRunId";
    IF old_user_id IS DISTINCT FROM verify_old_user_id
       OR new_user_id IS DISTINCT FROM verify_new_user_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED';
    END IF;

    IF NEW."accountId" IS NOT NULL THEN
        PERFORM "data_lifecycle_assert_account_user_consistent"(
            new_user_id,
            NEW."accountId"
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Scenario scope is derived through nullable session -> detection -> game links.
-- Resolve without parent row locks, take the resulting lifecycle lock(s), then
-- resolve a second time. Detection/game ownership changes use those same locks,
-- so equality of the two snapshots proves the scope remained stable.
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
        WHERE detection."id" = p_tactical_detection_id;

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
    WHERE game."id" = scope_game_id;

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
    verify_old_user_id INTEGER;
    verify_old_account_id INTEGER;
    verify_old_game_id INTEGER;
    verify_new_user_id INTEGER;
    verify_new_account_id INTEGER;
    verify_new_game_id INTEGER;
BEGIN
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

    IF TG_OP <> 'INSERT' THEN
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO verify_old_user_id, verify_old_account_id, verify_old_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            OLD."userId",
            OLD."importedGameId",
            OLD."tacticalDetectionId"
        );
    END IF;
    IF TG_OP <> 'DELETE' THEN
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO verify_new_user_id, verify_new_account_id, verify_new_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            NEW."userId",
            NEW."importedGameId",
            NEW."tacticalDetectionId"
        );
    END IF;

    IF old_user_id IS DISTINCT FROM verify_old_user_id
       OR old_account_id IS DISTINCT FROM verify_old_account_id
       OR old_game_id IS DISTINCT FROM verify_old_game_id
       OR new_user_id IS DISTINCT FROM verify_new_user_id
       OR new_account_id IS DISTINCT FROM verify_new_account_id
       OR new_game_id IS DISTINCT FROM verify_new_game_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED';
    END IF;

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
    verify_old_session_user_id INTEGER;
    verify_old_session_game_id INTEGER;
    verify_old_session_detection_id INTEGER;
    verify_new_session_user_id INTEGER;
    verify_new_session_game_id INTEGER;
    verify_new_session_detection_id INTEGER;
    verify_old_user_id INTEGER;
    verify_old_account_id INTEGER;
    verify_old_game_id INTEGER;
    verify_new_user_id INTEGER;
    verify_new_account_id INTEGER;
    verify_new_game_id INTEGER;
BEGIN
    IF TG_OP <> 'INSERT' THEN old_session_id := OLD."sessionId"; END IF;
    IF TG_OP <> 'DELETE' THEN new_session_id := NEW."sessionId"; END IF;

    IF old_session_id IS NOT NULL THEN
        SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
        INTO old_session_user_id, old_session_game_id, old_session_detection_id
        FROM "ScenarioTrainingSession" AS session
        WHERE session."id" = old_session_id;
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO old_user_id, old_account_id, old_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            old_session_user_id,
            old_session_game_id,
            old_session_detection_id
        );
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

    IF old_session_id IS NOT NULL THEN
        SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
        INTO verify_old_session_user_id, verify_old_session_game_id, verify_old_session_detection_id
        FROM "ScenarioTrainingSession" AS session
        WHERE session."id" = old_session_id;
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO verify_old_user_id, verify_old_account_id, verify_old_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            verify_old_session_user_id,
            verify_old_session_game_id,
            verify_old_session_detection_id
        );
    END IF;

    IF new_session_id IS NOT NULL THEN
        IF new_session_id IS NOT DISTINCT FROM old_session_id THEN
            verify_new_session_user_id := verify_old_session_user_id;
            verify_new_session_game_id := verify_old_session_game_id;
            verify_new_session_detection_id := verify_old_session_detection_id;
        ELSE
            SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
            INTO verify_new_session_user_id, verify_new_session_game_id, verify_new_session_detection_id
            FROM "ScenarioTrainingSession" AS session
            WHERE session."id" = new_session_id;
        END IF;
        SELECT scope_user_id, scope_account_id, scope_game_id
        INTO verify_new_user_id, verify_new_account_id, verify_new_game_id
        FROM "data_lifecycle_resolve_scenario_scope"(
            verify_new_session_user_id,
            verify_new_session_game_id,
            verify_new_session_detection_id
        );
    END IF;

    IF old_user_id IS DISTINCT FROM verify_old_user_id
       OR old_account_id IS DISTINCT FROM verify_old_account_id
       OR old_game_id IS DISTINCT FROM verify_old_game_id
       OR new_user_id IS DISTINCT FROM verify_new_user_id
       OR new_account_id IS DISTINCT FROM verify_new_account_id
       OR new_game_id IS DISTINCT FROM verify_new_game_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED';
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
