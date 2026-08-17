-- ONB-019 third self-review: enforce redundant ownership consistency and cover
-- user-scoped writes that are not protected by an AppUser foreign key.

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

-- AppUser INSERT must be guarded as well as UPDATE/DELETE: after final user
-- deletion a direct writer must not be able to recreate the deleted numeric id
-- while the durable USER fence remains active.
DROP TRIGGER "AppUser_data_lifecycle_guard" ON "AppUser";
CREATE TRIGGER "AppUser_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "AppUser"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_app_user_write"();

-- OAuthLoginState intentionally has no AppUser FK. Without a commit-side guard,
-- a login-state row could be admitted after explicit cleanup and survive the
-- final AppUser deletion.
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
