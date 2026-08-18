-- ONB-019 self-review hardening: ScenarioTrainingSession can retain a direct
-- imported-game link, a tactical-detection link, or both. Lifecycle admission
-- must resolve the effective game through either path so a nullable direct
-- importedGameId cannot bypass a GAME/ACCOUNT/USER fence.

CREATE FUNCTION "data_lifecycle_resolve_scenario_scope"(
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
    IF scope_game_id IS NULL THEN
        RETURN;
    END IF;

    SELECT game."userId", game."accountId"
    INTO game_user_id, game_account_id
    FROM "ImportedGame" AS game
    WHERE game."id" = scope_game_id;

    IF game_user_id IS NOT NULL AND game_user_id IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH',
            DETAIL = format(
                'scenario user=%s game=%s gameUser=%s',
                p_user_id,
                scope_game_id,
                game_user_id
            );
    END IF;

    IF game_user_id IS NOT NULL THEN
        scope_user_id := game_user_id;
        scope_account_id := game_account_id;
    END IF;
END;
$$;

CREATE FUNCTION "data_lifecycle_guard_scenario_session_write"()
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

DROP TRIGGER "ScenarioTrainingSession_data_lifecycle_guard" ON "ScenarioTrainingSession";
CREATE TRIGGER "ScenarioTrainingSession_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "ScenarioTrainingSession"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_scenario_session_write"();

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

    IF old_session_id IS NOT NULL THEN
        SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
        INTO old_session_user_id, old_session_game_id, old_session_detection_id
        FROM "ScenarioTrainingSession" AS session
        WHERE session."id" = old_session_id;

        IF old_session_user_id IS NOT NULL THEN
            SELECT scope_user_id, scope_account_id, scope_game_id
            INTO old_user_id, old_account_id, old_game_id
            FROM "data_lifecycle_resolve_scenario_scope"(
                old_session_user_id,
                old_session_game_id,
                old_session_detection_id
            );
        END IF;
    END IF;

    IF new_session_id IS NOT NULL THEN
        IF new_session_id IS NOT DISTINCT FROM old_session_id THEN
            new_user_id := old_user_id;
            new_account_id := old_account_id;
            new_game_id := old_game_id;
        ELSE
            SELECT session."userId", session."importedGameId", session."tacticalDetectionId"
            INTO new_session_user_id, new_session_game_id, new_session_detection_id
            FROM "ScenarioTrainingSession" AS session
            WHERE session."id" = new_session_id;

            IF new_session_user_id IS NOT NULL THEN
                SELECT scope_user_id, scope_account_id, scope_game_id
                INTO new_user_id, new_account_id, new_game_id
                FROM "data_lifecycle_resolve_scenario_scope"(
                    new_session_user_id,
                    new_session_game_id,
                    new_session_detection_id
                );
            END IF;
        END IF;
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
