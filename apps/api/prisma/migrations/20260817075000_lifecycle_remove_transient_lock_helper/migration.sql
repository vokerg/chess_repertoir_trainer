-- The previous self-review migration introduced a parent-row locking helper
-- while exploring stale indirect-scope reads. The final design uses lifecycle
-- advisory locks plus scope revalidation instead, avoiding parent/child row-lock
-- inversion during cascades. Do not leave the superseded helper in the schema.
DROP FUNCTION IF EXISTS "data_lifecycle_lock_scenario_dependencies"(
    INTEGER,
    INTEGER,
    INTEGER,
    INTEGER
);
