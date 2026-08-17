-- ONB-019 self-review hardening: TacticalDetectionRun is a durable user-owned
-- admission row created before game-scoped tactical detections are written.
-- Block new runs while any lifecycle fence overlaps the user, but continue to
-- allow already-admitted runs to settle completed/failed during drain.

CREATE FUNCTION "data_lifecycle_guard_tactical_detection_run_write"()
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

CREATE TRIGGER "TacticalDetectionRun_data_lifecycle_guard_insert"
BEFORE INSERT ON "TacticalDetectionRun"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_tactical_detection_run_write"();

CREATE TRIGGER "TacticalDetectionRun_data_lifecycle_guard_owner_update"
BEFORE UPDATE OF "userId" ON "TacticalDetectionRun"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_tactical_detection_run_write"();

CREATE TRIGGER "TacticalDetectionRun_data_lifecycle_guard_delete"
BEFORE DELETE ON "TacticalDetectionRun"
FOR EACH ROW EXECUTE FUNCTION "data_lifecycle_guard_tactical_detection_run_write"();
