-- ONB-019 self-review: normal write admission is hierarchical.
-- A USER-scoped writer overlaps every fence for that user; an ACCOUNT-scoped
-- writer overlaps the account fence and every GAME fence under that account;
-- a GAME-scoped writer overlaps its USER/ACCOUNT ancestors and exact game.
CREATE OR REPLACE FUNCTION "data_lifecycle_assert_write_allowed"(
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
        (p_account_id IS NULL AND p_game_id IS NULL)
        OR fence."resourceType" = 'USER'
        OR (
          p_account_id IS NOT NULL
          AND fence."resourceType" = 'ACCOUNT'
          AND fence."resourceId" = p_account_id
        )
        OR (
          p_game_id IS NULL
          AND p_account_id IS NOT NULL
          AND fence."resourceType" = 'GAME'
          AND fence."ownerAccountId" = p_account_id
        )
        OR (
          p_game_id IS NOT NULL
          AND fence."resourceType" = 'GAME'
          AND fence."resourceId" = p_game_id
        )
      )
    ORDER BY CASE fence."resourceType" WHEN 'USER' THEN 0 WHEN 'ACCOUNT' THEN 1 ELSE 2 END, fence."id"
    LIMIT 1;

    IF active_operation_id IS NOT NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'DATA_LIFECYCLE_WRITE_BLOCKED',
            DETAIL = format(
                'operation=%s resource=%s:%s',
                active_operation_id,
                active_resource_type,
                active_resource_id
            );
    END IF;
END;
$$;
