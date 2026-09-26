# Compact imported ply moves: rollout and recovery

`ImportedGamePly` stores only required `moveCode SMALLINT` values after the contract migration. The application and HTTP contracts still expose coordinate UCI strings. The stateless `chess-domain` codec maps source/destination squares and the exact promotion suffix to a reversible integer; no dictionary or board state is needed. Course move nodes and tactical detection records retain their original UCI storage.

## Verification before contracting

The historical expansion migrations keep `moveUci VARCHAR(5)`, add nullable `moveCode`, and add the equivalent `[positionId, moveCode, importedGameId, plyNumber]` index. The transition application dual-writes and reads codes. Do not edit those historical migrations.

Before applying the contract to another existing database:

1. Back up the database using the normal deployment procedure. Stop/drain **all** API and worker ply writers. A hosted API can initiate writes even without a deployed worker.
2. Apply the expansion and cleanup-trigger-removal migrations using the intended direct database URL. Do not deploy the contract migration yet; it must follow the validated backfill.
3. Build the domain package and run:

   ```bash
   npm run db:backfill-imported-ply-move-codes --workspace=apps/api
   npm run db:backfill-imported-ply-move-codes --workspace=apps/api -- --validate-only
   ```

   The script prevalidates every original string before writes, resumes only null codes in deterministic primary-key batches of 1,000, and performs one parameterized update per batch. Its final pass checks every row with `decodeUciMove(moveCode) === moveUci` and requires zero null codes. Unsupported values, missing/invalid codes, and mismatches abort with identifying keys. Completed batches remain committed; failed statements roll back. Preserve the successful count/equality log. The script uses raw SQL so the contracted Prisma client can still operate on a historical expanded schema.
4. Require the codec tests and relevant full build/test/lint/architecture/hygiene checks to pass. Prepare the code-only API/worker release; stop the old release before applying DDL and start the new release afterward.
5. Apply `20260926143000_contract_imported_ply_move_code`. In one transaction it locks the ply table, rejects null codes by making `moveCode` required, creates the equivalent code index if missing, drops only the legacy move index, and drops `moveUci`. It copies no encoding logic into SQL. Verify schema/index validity, start the new release, and check indexing, imported-game detail/tagging, opening aggregation, coverage, course extensions, and analysis.

A fresh empty database can apply the complete migration chain normally. For a populated expanded database, deployment tooling must not automatically apply the contract ahead of its backfill. Render's standard build command runs migrations before starting the new API, so drain the old API during this coordinated rollout. The transition release's dual-writer cannot write after the legacy column is dropped; the new code-only writer cannot insert into the old schema while its legacy column remains required.

## Storage limits and vacuum

Check the project's storage limit and current database/index sizes **before** expansion. Keeping both columns/indexes and updating rows temporarily needs additional storage. PostgreSQL updates leave old tuple/index versions until vacuum can reclaim them.

If the new code index was created early and the backfill hits the storage cap, it can be temporarily dropped concurrently while retaining the original UCI column/index. The contract recreates the exact same code-index shape after validation. This is a rollout space workaround, not an index redesign. An interrupted concurrent build can leave an invalid code index; inspect `pg_index.indisvalid` and drop only that invalid new index concurrently before contract, since `IF NOT EXISTS` does not repair it. PostgreSQL truncates the long requested code-index identifier to `ImportedGamePly_positionId_moveCode_importedGameId_plyNumber_id`; use the actual catalog name when operating on it.

Run ordinary `VACUUM (ANALYZE)` after a large backfill. It makes dead space reusable but usually does not reduce physical file size. Dropping a column also does not rewrite existing tuples. If physical compaction is needed, `VACUUM FULL` rewrites the table, requires an exclusive lock and temporary space for the replacement heap/indexes, and must be scheduled with writers stopped. Under a tight cap, temporarily omit the code index during ply-table compaction and rebuild it afterward. Retain the primary key and verify the restored index before resuming traffic. Do not delete live data to make the rollout fit.

The large `ImportedGamePosition` table is the current Prisma `Position` model (`@@map`), referenced by plies, analysis, and caches. It is not an obsolete duplicate. Remove other tables only after proving they are retired through runtime references, foreign keys, and deployment consumers; an empty table or disabled optional workflow is insufficient evidence.

## Exact UCI restoration

Once every code is valid, **the original UCI string can always be recovered exactly** with `decodeUciMove()`, including every promotion piece. The old column is not needed as a permanent recovery copy.

To recreate the legacy column for a rollback or inspection:

1. Stop all ply writers and ensure storage headroom for the restored strings and any legacy index. An export or application-level decode does not require recreating database storage.
2. From the contracted release run:

   ```bash
   npm run db:restore-imported-ply-move-uci --workspace=apps/api
   ```

   The script validates every code before any mutation, adds nullable `moveUci VARCHAR(5)` if absent, and restores missing strings in deterministic batches using only `decodeUciMove()`. It never overwrites an existing string. Restarting resumes null strings. It verifies every restored string against its code, fails with identifying keys on mismatch, and makes the restored column required only after successful validation. The codes and primary keys stay unchanged. Tests cover multi-batch restoration, interrupted runs, all promotions, invalid codes, and conflicting existing strings.
3. If rolling back to the previous dual-writing release, recreate its legacy composite index when needed and deploy that release before resuming writers. Do not start the current code-only writer while the restored UCI column is required. A release predating `moveCode` also requires a reviewed nullable-code rollback; it cannot satisfy the required compact column on new writes.
4. Reconcile Prisma schema/migration state as a deliberate rollback operation; restoration does not silently mark the contract migration unapplied. To return to compact storage, pause writers, rerun the historical script with `--validate-only`, repeat the reviewed contract DDL, and start the code-only release.

## Removed orphan-cleanup triggers

`20260926130000_remove_ply_position_cleanup_triggers` removes the orphan-position cleanup INSERT/UPDATE triggers from `ImportedGamePly`. They referenced `PositionCleanupCandidate` on ordinary writes, including backfill. The candidate table is not needed for move encoding and is not recreated. The independent data-lifecycle guard remains.

Keep optional orphan cleanup disabled (the default) until its observation/grace and concurrency guarantees are redesigned without the writer-side candidate reset/advisory fence. A transient ply reference no longer restarts the candidate grace clock; regression tests record this limitation. Historical cleanup migrations remain immutable.

## Target-database validation record

On 2026-09-26, the configured Neon database contained 882,113 plies. After temporarily dropping the new code index to free approximately 62 MB, the resumable run filled the remaining 156,113 codes and validated **all 882,113 rows with zero nulls and 100% exact UCI equality**. The database was approximately 435 MB before database-wide vacuum. This record verifies the backfill; schema/deployment completion must be recorded separately.
