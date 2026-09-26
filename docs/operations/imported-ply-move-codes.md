# Imported-game ply move-code rollout

This is a staged storage migration for `ImportedGamePly` only. The current transition schema retains required `moveUci varchar(5)` and its composite index, adds nullable `moveCode smallint`, and adds the equivalent `(positionId, moveCode, importedGameId, plyNumber)` index for cutover. The application writes both columns and reads only the code, decoding it at repository boundaries. Services, HTTP/MCP contracts, Angular, and Expo continue to use UCI strings. Storage savings are realized after the separately gated contract phase; this release does not drop the legacy column or index.

## Codec

`packages/chess-domain/src/uci-move-code.ts` is the only codec. Squares use `a1 = 0` through `h8 = 63`; bits 0–5 store the source, 6–11 the destination, and 12–14 the promotion (`0` none, `1` knight, `2` bishop, `3` rook, `4` queen). The result is a nonnegative PostgreSQL `SMALLINT`. Encoding and decoding reject invalid values instead of normalizing them. The codec validates coordinate syntax, distinct squares, and a lowercase `n/b/r/q` suffix; board-dependent legality is outside its scope. It does not support null moves (`0000`) or dictionary IDs. Every accepted string round-trips exactly.

The exhaustive domain tests cover all 20,160 supported combinations, every 15-bit code, malformed strings, castling coordinates, en-passant coordinates, promotions, and numeric values outside the supported range.

## Expand, backfill, and cutover

Use a maintenance window for the backfill and application cutover. Before applying anything, take the usual database backup and verify **both** `DATABASE_URL` (runtime and scripts) and `DIRECT_URL` (Prisma migrations) identify the intended database. Overriding only `DATABASE_URL` does not redirect migrations if `DIRECT_URL` still points elsewhere. For an isolated test database, set both URLs explicitly. Never print credentials into rollout logs.

1. Keep the existing application release running while applying the additive expand migration `20260926120000_expand_imported_ply_move_code`. Existing rows and writers remain compatible. The second migration `20260926121000_index_imported_ply_move_code` supports the code-based cutover without removing the old index. It builds the same index shape concurrently and may safely be prepared before switching application readers. The standard `npm run db:migrate --workspace=apps/api` applies both pending migrations. Do not include a contract migration in this release.
2. Build the new release with `npm run build:api`. Do not start its API or workers against unbackfilled data: readers deliberately reject missing/invalid codes, with no legacy fallback.
3. Stop/drain all API and worker processes that can insert, delete, reindex, or modify plies, including scripts and external database writers. Pause scheduled imports and maintenance work. A validated scan is evidence only while that data stays stable; the script does not hold a table lock across the entire rollout.
4. Run the one-off backfill against that database:

   ```bash
   npm run db:backfill-imported-ply-move-codes --workspace=apps/api
   ```

   Before writing, it scans every row in deterministic composite-primary-key batches and calls `encodeUciMove()` for each legacy string. Any unsupported value aborts before writes with `importedGameId`, `plyNumber`, `moveUci`, and `moveCode`. Investigate the identified row; do not silently truncate, lowercase, drop a suffix, or substitute a move.

   The update pass selects only null codes in batches of 1,000 and issues one parameterized `UPDATE ... FROM (VALUES ...)` per batch. Updates are guarded by both identifying keys, the observed legacy string, and `moveCode IS NULL`; existing codes are never overwritten. Completed batches remain committed if a later batch fails. Restarting repeats prevalidation and resumes the remaining null rows. Memory and query payloads remain bounded; no per-row update loop or SQL copy of the bit encoding is used.

   The final pass scans **all** rows, checks `decodeUciMove(moveCode) === moveUci`, and confirms the database count of null codes is zero. A mismatch or invalid code fails immediately with identifying keys and both stored values. Save the completion log with prevalidated, updated, and validated counts. Exit status zero with the final 100% equality message is required; merely finishing updates is insufficient.
5. Run the read-only verification again while writers remain stopped:

   ```bash
   npm run db:backfill-imported-ply-move-codes --workspace=apps/api -- --validate-only
   ```

6. Switch **all** API and worker instances to the new application release, then resume work. Newly indexed games persist both UCI and encoded moves during transition. Verify imported-game detail/tagging, opening next-move counts, opening struggles, position/game analysis, coverage, course extensions, and tactical scenarios. Queries group/distinct on codes internally and decode to strings; repositories restore lexical UCI order where numeric order differs. Tactical detection keeps numeric evaluation filtering in SQL, then compares decoded moves with engine UCI from the same query snapshot and applies the existing missed-shot precedence within batches of at most 100 games. `MoveNode.moveUci`, `TacticalDetection.moveUci`, positions, and public contracts remain unchanged.

The concurrent index migration must run outside a transaction. An interrupted PostgreSQL concurrent build can leave an invalid index. Inspect `pg_index.indisvalid` for the **new** index; if invalid, drop that invalid new index concurrently, mark the failed Prisma migration rolled back using the normal migration-recovery procedure, and rerun it. Retain the legacy index throughout. Do not redesign either index in this rollout.

## Contract gate (not included in this release)

Create a **separate reviewed release/PR** only after retaining evidence that:

- Domain codec tests and the full relevant build/test/lint/architecture/hygiene checks pass.
- Backfill verification on the actual target database proves zero nulls and exact round-trip equality for 100% of rows.
- All deployed readers use codes, all writers are compatible with the next schema, and API/domain representations still expose UCI strings.
- Application cutover and the new composite index have been verified.

Stop/drain writers again and repeat `--validate-only` immediately before contracting. Remove the transitional legacy write from `replacePlyRowsForGame` and update persistence fixtures, then change the Prisma model to `moveCode Int @db.SmallInt`, remove `moveUci` and its index, and retain the existing code-based index. Generate the destructive migration only at that point. Its DDL must make `moveCode` non-null, drop **only** the legacy composite index, and drop `ImportedGamePly.moveUci`. The DDL should be transactional and reject null codes before dropping anything. Round-trip verification belongs to the canonical TypeScript codec; do not implement a second SQL codec in a migration.

The dual-writing transition application cannot run after the column drop. Stop it, verify stable data, apply the contract migration, and start the code-only writer release. Preserve the verification log and the previous-column backup alongside the deployment record. Local fixture validation cannot substitute for evidence about existing production rows.

Before contraction, rollback to the old application is possible because the legacy column/index remain and new writers maintain them. Such a rollback can create null codes; repeat the backfill and full verification before attempting cutover again. After contraction, the old application requires a reviewed reverse expansion/backfill or restoration from backup; do not attempt an automatic rollback that assumes the dropped column exists.
