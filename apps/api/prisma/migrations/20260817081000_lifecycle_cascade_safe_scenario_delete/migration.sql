-- ScenarioTrainingSession keeps nullable references to ImportedGame and
-- TacticalDetection while AppUser/ExternalAccount/ImportedGame ownership is
-- deleted through FK cascades. PostgreSQL may execute the parent delete before
-- the session DELETE trigger runs, so a strict parent re-resolution can observe
-- an already-deleted parent and reject the cascade.
--
-- A dangling parent reference cannot exist outside the deleting statement
-- because the foreign keys are immediate. If a referenced parent is already
-- missing during DELETE, the parent mutation that caused the cascade has already
-- crossed its own lifecycle guard, so the child DELETE can safely continue.
-- INSERT/UPDATE and ordinary direct DELETE paths remain fully scope-checked.
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
    parent_exists BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD."importedGameId" IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM "ImportedGame" AS game
                WHERE game."id" = OLD."importedGameId"
            ) INTO parent_exists;

            IF NOT parent_exists THEN
                RETURN OLD;
            END IF;
        ELSIF OLD."tacticalDetectionId" IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM "TacticalDetection" AS detection
                WHERE detection."id" = OLD."tacticalDetectionId"
            ) INTO parent_exists;

            IF NOT parent_exists THEN
                RETURN OLD;
            END IF;
        END IF;
    END IF;

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
