-- ONB-019 deep self-review hardening. This helper is installed before the
-- revalidation migration so later trigger definitions can validate that a
-- redundant account reference belongs to the lifecycle user whose lock is held.
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

    -- Callers hold p_user_id's lifecycle advisory lock before reaching this
    -- helper. ExternalAccount ownership transitions participate in that same
    -- lock protocol, so a matching account owner remains stable to commit.
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
