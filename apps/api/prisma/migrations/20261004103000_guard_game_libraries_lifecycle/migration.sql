-- Serialize library and membership writes with active user/account/game lifecycle fences.
-- The operation's own destructive transactions carry app.data_lifecycle_operation_id,
-- so their cleanup remains permitted while unrelated writers are rejected.
CREATE FUNCTION "data_lifecycle_guard_game_library_write"()
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
    OLD."userId", NULL, NULL,
    NEW."userId", NULL, NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER "GameLibrary_data_lifecycle_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "GameLibrary"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_game_library_write"();

-- Membership writes inherit the referenced game's lifecycle scope. Only
-- additions/reparenting need admission: deletions must remain possible when
-- a parent game or library is being cascade-deleted.
CREATE FUNCTION "data_lifecycle_guard_game_library_entry_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  library_user_id INTEGER;
  game_user_id INTEGER;
BEGIN
  PERFORM "data_lifecycle_assert_game_transition_allowed"(
    CASE WHEN TG_OP = 'UPDATE' THEN OLD."gameId" ELSE NULL END,
    NEW."gameId"
  );

  -- Resolve ownership after the game-scope lifecycle lock. Both parents must
  -- belong to the same user; a cross-user association could bypass fences.
  SELECT "userId" INTO library_user_id
  FROM "GameLibrary" WHERE "id" = NEW."libraryId";
  SELECT "userId" INTO game_user_id
  FROM "ImportedGame" WHERE "id" = NEW."gameId";
  IF library_user_id IS NOT NULL AND game_user_id IS NOT NULL
     AND library_user_id IS DISTINCT FROM game_user_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'DATA_LIFECYCLE_SCOPE_MISMATCH';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "GameLibraryEntry_data_lifecycle_guard"
BEFORE INSERT OR UPDATE ON "GameLibraryEntry"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_game_library_entry_write"();
