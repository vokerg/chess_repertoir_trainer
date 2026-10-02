# Compact Position storage cleanup

PR #439 continues on `pilot-position-data`; merge is not authorized. The user authorized deployment of the reviewed compact runtime followed by removal of legacy Position storage on 2026-10-02. Historical Prisma checksum discrepancies are explicitly accepted for this rollout and are not repaired.

## Current code and forward migration

`Position` contains only `id` and required `positionDataCompact`. The reversible compact codec, integer IDs, existing compact UNIQUE index and every Position relation/FK are unchanged. All normal runtime identity queries and in-memory deduplication use compact bytes. Repository boundaries decode normalized FEN for unchanged domain/API contracts. NULL, malformed and unexpected decoded values fail explicitly; there is no legacy fallback.

Migration `20261002044000_finish_compact_position_storage` runs in one transaction with a five-second lock timeout and two-minute statement timeout:

1. Require non-null `positionDataCompact`; any NULL aborts the transaction.
2. Drop `ImportedGamePosition_positionKey_key`.
3. Drop `positionKey`, stored `normalizedFen` and fixed pilot `positionData`.

It does not rewrite compact bytes, delete Position rows, change IDs/FKs, reclaim heap or run VACUUM FULL. No previously applied migration is edited. Position creation in single analysis, bulk analysis and ply indexing writes only compact data; `transitionalPositionWriteFields` and the runtime hash module are removed.

Eight maintenance commands for historical hashes, FEN backfill, pilot/comparison, index rollout and old-vs-compact measurements are retired with their source scripts. Their old documents remain explicitly labelled history. The replacement `db:validate-position-data-compact` performs a full read-only, repeatable-read validation in bounded pages, rejects NULL/duplicate/noncanonical values, and fingerprints every ID/compact byte pair for before/after verification. Its SHA-256 fingerprint is diagnostic, not an application Position identity.

## Runtime audit

The complete consumer list is recorded in the [read cutover audit](compact-position-runtime-cutover.md#complete-runtime-consumer-audit). A fresh source search covers all `apps/api/src` usages of legacy hashes/FEN storage, Position operations, nested selections and raw Position SQL. No runtime legacy hash lookup/write, stored Position FEN lookup/read/write, fixed pilot storage or legacy fallback remains. Domain-level `normalizedFen` inputs, output fields and transient opening/book caches are retained.

Tests use canonical compact fixtures throughout. The local-only cleanup migration test checks atomic NULL rejection, preservation of IDs/bytes/index identity/foreign-key definitions, compact-only inserts and uniqueness. Runtime tests cover single/bulk analysis, opening analysis, explorer, course extension, ply indexing, imported games, tagging, scenario hydration, malformed/NULL/unexpected identity errors, concurrent creation and relation/cleanup behavior. Mutation fixtures run only on disposable loopback PostgreSQL, never Neon.

## Validation — 2026-10-02

Passed locally:

- `npm run build:api` (typecheck, domain/contracts prebuild, Prisma generation).
- Complete **85-migration** chain on fresh disposable PostgreSQL **16.15**, loopback **55439**, explicitly **UTC** (`position_final_complete`).
- `npm test`: dependency-audit reporter, **191 domain tests / 16 files**, shared contracts, **249 API test files**, **545 web tests**, **25 mobile tests / 12 files**. API tests include build and trap validation.
- `npm run build`: all workspaces, web production bundle, iOS and Android exports.
- `npm run lint`: API, web and mobile.
- `npm run check:architecture`, `npm run check:hygiene`, `git diff --check`.
- Worker canary against a separate fresh disposable UTC database: 15 seconds of polling, normal startup, no errors, graceful SIGTERM shutdown with exit 0. Cleanup worker remains disabled by configuration. No hosted worker exists, and no extra production worker was started.
- Focused storage/identity/migration tests; full cleanup interleaving, cancellation, lifecycle and relation regressions in the API suite.

Initial broad runs exposed a reused lifecycle fixture and two fixture transformations outside the database boundary; corrected those fixtures while retaining domain `normalizedFen` shapes, then the fresh full suite passed. Reusing a previously exercised database also exposed the suite's fixed dev-user assumption; the final complete run used a newly created database. No mutation fixture ran against Neon.

Existing Git line-ending conversion notices and Expo's experimental autolinking notice remain. No new build/lint warning was reported. `npm run expo:check` was skipped for this API-only change; mobile build/test/lint did run. Deployment and before/after results are recorded below.

## Deployment sequence and observations

The reviewed compact read runtime `ddf03ff4a7ce0d50b46833776d1a7834bdf54a8d` became Live at **2026-10-02 04:38:14 UTC**, deployment `dep-davj8re7bikc73e9kcug`. Legacy storage remained present. Health and representative Position reads passed at 04:38:37 UTC: Positions **25, 30, 31**, analysis IDs **30204, 34261, 62118**, identical canonical FENs and bulk Position IDs. Health is a hosted HTTP request; Position checks execute the reviewed repositories read-only against the production DB, not authenticated hosted API endpoints.

Preflight at 04:34–04:36 UTC independently validated all **771,646** Positions against canonical compact re-encoding and legacy FEN, with **0 NULLs, duplicates or mismatches**. A renewed read-only snapshot at **05:02:59 UTC** validated all **771,646** canonical identities and fingerprinted every ID/compact byte pair: `78631b71a659ebbe6420d109b95ad1b78de5f671f2a8f6b6232b73f111e0caad`. Compact index was valid/ready/unique. Direct endpoint `ep-spring-bird-algpv2s4.c-3.eu-central-1.aws.neon.tech`, `neondb.public`; pooled URL and `connection_limit=3` remain unchanged.

The final cleanup implementation is **`77bcec57c0a3b4ab6aa7aa489779d8063f20a853`**. Normal `npm run db:migrate --workspace=apps/api` applied only the new forward migration to the confirmed direct Neon target at **05:12–05:13 UTC**. No historical SQL or existing ledger checksum was changed. The new ledger checksum matches the committed SQL bytes exactly.

Render deployment **`dep-davjqs8u01pc73f24cng`** checked out that exact commit and became **Live at 05:16:35 UTC**. Its unchanged build command also ran `prisma migrate deploy`, which reported **85 migrations / no pending migrations**. Specific-commit deployment leaves auto-deploy disabled; the configured source branch remains `main`. Brief temporary errors between storage removal and final runtime startup were accepted, but none were observed by these read-only checks.

Post-cleanup full read-only validation completed at **05:15:28 UTC**:

- **771,646 Positions**, all decoded and canonically re-encoded; **0 NULLs / duplicate groups**.
- The full ID/compact fingerprint is exactly unchanged: `78631b71a659ebbe6420d109b95ad1b78de5f671f2a8f6b6232b73f111e0caad`.
- Position has exactly **`id INTEGER NOT NULL`** and **`positionDataCompact BYTEA NOT NULL`**; all three legacy columns and the hash index are absent.
- Retained primary-key and compact-index definitions/OIDs are unchanged, valid, ready and unique (compact index OID `2105344`).
- All three production Position FK definitions/OIDs are exactly unchanged: ImportedGamePly, PositionAnalysis and MastersExplorerCache. The previously absent cleanup-candidate FK remains part of the unrelated historical drift below.
- All **84 historical migration ledger names/checksums** are unchanged; the new migration is the only added entry.
- A bounded read-only EXPLAIN selects **`ImportedGamePosition_positionDataCompact_key`**, with no legacy index/fallback. No timing performance claim is made.

At **05:16:52 UTC**, the hosted API `/health` returned **200 / `{ "ok": true }`** after final runtime deployment. Final-code single/bulk analysis and opening repository reads returned the exact same Positions **25/30/31**, analysis IDs **30204/34261/62118** and canonical FENs as the pre-cleanup samples. No compact invariant, NULL, lookup mismatch or Prisma connectivity regression was observed. These Position reads use the final compiled repositories against production; they are not authenticated hosted HTTP feature calls. No synthetic production users/games, production mutation fixtures or extra production worker were created. Worker startup/polling/shutdown was verified on disposable UTC PostgreSQL; there is no hosted worker in the Render project.

[Cleanup implementation CI](https://github.com/vokerg/chess_repertoir_trainer/actions/runs/36967725931) completed successfully for the exact deployed commit on Node 22 and fresh PostgreSQL 16. Local complete validation above passed before migration/deployment. The subsequent documentation checkpoint changes no runtime code. The rollout stops here for final review; PR #439 remains open and unmerged.

## Authorized physical compaction — 2026-10-02

The user subsequently authorized freeing storage with vacuum/index maintenance and accepted temporary production errors. The latest PR checkpoint CI was green, the intended Neon target was unchanged, and a fresh read-only audit found **771,646** Positions, required compact identity, valid indexes, **0 dead tuples** and no other active transaction. Neon reports a **1 GB** cluster limit; PostgreSQL database size was **370,171,904 bytes**.

Dropping legacy columns had left their physical contents in existing heap tuples. The heap remained **116,154,368 bytes**; both indexes were already compact. A targeted rewrite reclaims that retained storage ([PostgreSQL DROP COLUMN behavior](https://www.postgresql.org/docs/17/sql-altertable.html), [VACUUM FULL behavior](https://www.postgresql.org/docs/17/sql-vacuum.html)).

Executed outside a transaction, through the direct endpoint:

```sql
VACUUM (FULL, ANALYZE) public."ImportedGamePosition";
```

The maintenance-only connection used a five-second lock timeout and ten-minute statement timeout. The application connection settings are unchanged. The command succeeded at **19:20:56.140–19:20:57.662 UTC** (**1.522 seconds**) and rebuilt the table's existing indexes as part of the rewrite. No separate reindex or maintenance of unrelated tables was needed.

| Measurement | Before bytes | After bytes | Freed bytes |
| --- | ---: | ---: | ---: |
| Position heap | 116,154,368 | 44,507,136 | 71,647,232 |
| Position table incl. auxiliary storage | 116,219,904 | 44,515,328 | 71,704,576 |
| Position indexes | 50,257,920 | 50,257,920 | 0 |
| Position total relation | 166,477,824 | 94,773,248 | 71,704,576 |
| Whole PostgreSQL database | 370,171,904 | 298,467,328 | 71,704,576 |

Reclaimed **71,704,576 bytes** (**71.70 decimal MB / 68.38 MiB**). Measurements cover live PostgreSQL relation/database bytes; Neon project history/retention usage is measured separately.

Independent full, bounded, read-only validation before and after the rewrite reproduced all **771,646** canonical identities with **0 NULLs / duplicates** and exactly the same ID/compact fingerprint: `78631b71a659ebbe6420d109b95ad1b78de5f671f2a8f6b6232b73f111e0caad`. Columns, index definitions/OIDs/validity, all existing Position FK definitions/OIDs and all **85 migration ledger names/checksums** are exactly unchanged. At **19:21:24 UTC**, hosted health was **200**, and single/bulk analysis plus opening repository reads returned the same Position/analysis IDs and exact FENs. Read-only EXPLAIN still selects the compact UNIQUE index.

`npm run check:hygiene` and `git diff --check` passed for this documentation checkpoint; Git emitted its existing line-ending conversion notice. Broad builds/tests were not rerun because this maintenance step changes no runtime code, Prisma model or migration. The prior complete test/build results and green runtime CI remain recorded above. No production deployment changed. PR #439 stays open and unmerged.

## Historical drift remains separate

The two checksum discrepancies for `20260717093000_require_complete_analysis_progress` and `20260903080000_position_cleanup_foundation` predate this change. The earlier audit also found a missing `PositionCleanupCandidate` and the extra legacy `PositionCleanupRun.orphansObserved` field. The Position storage migration did not change that subsystem. The user subsequently authorized the empty candidate-table restoration below; the extra legacy run column and historical checksum discrepancies remain unchanged.

## Empty cleanup-candidate restoration — 2026-10-02

After confirming the production candidate table was absent, the user explicitly authorized recreating it without data. Forward migration `20261002194000_restore_position_cleanup_candidate` restores the existing Prisma model's three columns, timestamp defaults/precision, primary key, observation-order CHECK, cascading Position FK and paging index. It creates the table only when absent; databases where the foundation already created it retain the existing object and observations. It runs transactionally with a five-second lock timeout and two-minute statement timeout.

The migration does not seed/backdate candidates, create cleanup runs, run observation/deletion, modify Positions or restore the removed ply triggers. Candidate observations will start empty. The cleanup service remains disabled; the existing [observation/grace/concurrency limitation](imported-ply-move-codes.md#removed-orphan-cleanup-triggers) still requires separate review before enabling cleanup. No historical migration or checksum repair is included, and no runtime deployment is required because the deployed Prisma model already defines the table.

Preflight at **19:43:31 UTC** reconfirmed `neondb.public`, absent candidate table, all **771,646** canonical Positions with unchanged full fingerprint and **0 NULLs / duplicates**, **882,172 plies**, **104,881 analyses**, **183 caches**, and **four retained cleanup runs**. The existing data-lifecycle guard is the only non-internal ply trigger; the three existing cleanup functions remain present. All 85 historical migration ledger entries are finished.

Focused disposable-database tests cover empty restoration, preservation/replay with existing observations and unrelated data/triggers, exact column/constraint/index definitions, ORM reads/writes, FK/default/uniqueness/check behavior, cascading relations and atomic rollback on index creation failure. The complete **86-migration** chain and **250 API test files** passed on fresh disposable UTC PostgreSQL 16.15, including API/domain/contracts builds and trap validation. API build, root lint, architecture/hygiene checks and `git diff --check` passed. An initial suite failure from shared-client schema isolation was fixed by giving the restoration fixtures dedicated Prisma clients; the full suite then passed on another fresh database. Root build/tests were not repeated for this SQL/test/documentation-only repair; the previous rollout passed them and CI repeats them. Production application and post-repair evidence will be recorded after validation completes.

## Rollback after storage removal

Redeploying a legacy dual-write revision (`6d3b660459187e989dae08dfb7c52570e0c023cb` or the read-cutover revision) alone is no longer compatible after column removal. Prefer a forward runtime fix retaining compact-only persistence. Restoring legacy runtime requires a separately reviewed additive migration to restore/reconstruct legacy columns and the old unique index from compact data, or a database restore. Do not modify historical migration checksums. No merge or further destructive storage change is included. The later authorized physical compaction is recorded above.
