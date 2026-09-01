-- ONB-020 account deletion must clear AppUser.defaultProgressAccountId when it
-- points at the account being deleted. Keep the ACCOUNT fence narrow: authorize
-- only that pointer clear (plus Prisma's updatedAt change) for the bound
-- DELETE_EXTERNAL_ACCOUNT operation. All other AppUser writes continue through
-- the normal USER-scope lifecycle guard.
CREATE OR REPLACE FUNCTION "data_lifecycle_guard_app_user_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    user_row "AppUser"%ROWTYPE;
    current_operation_id INTEGER;
    account_delete_fence_id INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN user_row := OLD; ELSE user_row := NEW; END IF;

    IF TG_OP = 'UPDATE'
       AND OLD."defaultProgressAccountId" IS NOT NULL
       AND NEW."defaultProgressAccountId" IS NULL
       AND (
           to_jsonb(NEW) - 'defaultProgressAccountId' - 'updatedAt'
       ) IS NOT DISTINCT FROM (
           to_jsonb(OLD) - 'defaultProgressAccountId' - 'updatedAt'
       ) THEN
        BEGIN
            current_operation_id := NULLIF(current_setting('app.data_lifecycle_operation_id', TRUE), '')::INTEGER;
        EXCEPTION WHEN invalid_text_representation THEN
            current_operation_id := NULL;
        END;

        IF current_operation_id IS NOT NULL THEN
            SELECT fence."id"
            INTO account_delete_fence_id
            FROM "DataLifecycleOperation" AS operation
            JOIN "DataLifecycleResourceFence" AS fence
              ON fence."operationId" = operation."id"
            WHERE operation."id" = current_operation_id
              AND operation."targetUserId" = OLD."id"
              AND operation."action" = 'DELETE_EXTERNAL_ACCOUNT'
              AND fence."releasedAt" IS NULL
              AND fence."ownerUserId" = OLD."id"
              AND fence."resourceType" = 'ACCOUNT'
              AND fence."resourceId" = OLD."defaultProgressAccountId"
            LIMIT 1;

            IF account_delete_fence_id IS NOT NULL THEN
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    PERFORM "data_lifecycle_assert_write_allowed"(user_row."id", NULL, NULL);

    IF TG_OP = 'DELETE' THEN
        BEGIN
            current_operation_id := NULLIF(current_setting('app.data_lifecycle_operation_id', TRUE), '')::INTEGER;
        EXCEPTION WHEN invalid_text_representation THEN
            current_operation_id := NULL;
        END;

        IF current_operation_id IS NOT NULL
           AND NOT EXISTS (
               SELECT 1
               FROM "DeletedAuthIdentityTombstone" AS tombstone
               JOIN "DataLifecycleOperation" AS operation ON operation."id" = tombstone."operationId"
               WHERE tombstone."operationId" = current_operation_id
                 AND operation."targetUserId" = user_row."id"
                 AND operation."action" = 'DELETE_APP_USER'
           ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DATA_LIFECYCLE_TOMBSTONE_REQUIRED';
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;
