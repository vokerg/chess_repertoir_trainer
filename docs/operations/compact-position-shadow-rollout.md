# Compact Position shadow rollout

This rollout adds `Position.positionDataCompact BYTEA NULL` while retaining `id`, `normalizedFen`, `positionKey` and the fixed 34-byte `positionData` pilot. It is not a read cutover. All application lookups and deduplication continue to use the existing position key and FEN. Ply, analysis and Masters cache relations and cleanup behavior remain unchanged.

## Implementation and creation-path audit

The repository-wide creation search found three active application statements:

- `modules/imported-games/ply-index.repository.prisma.ts`: indexed-ply position `createMany`.
- `modules/analysis/analysis.repository.prisma.ts`: single analysis position `create`.
- The same analysis repository: bulk analysis position `createMany`.

Each now calls the canonical `chess-domain` compact encoder and stores its bytes alongside the unchanged FEN/key. Existing rows, including null shadow data, still resolve by key. `skipDuplicates` does not overwrite existing representations or historical null shadow values. Historical migration INSERTs and direct test fixtures are not runtime creation paths and remain unchanged. See the [format and pilot comparison](position-data-pilot.md) for exact reversible encoding and its 32-piece limit.

Migration `20260926160000_add_compact_position_shadow` contains only:

```sql
ALTER TABLE "ImportedGamePosition" ADD COLUMN "positionDataCompact" BYTEA;
```

It has no default, non-null constraint or index. The fixed pilot column is never repurposed.

## Production authorization and sequence

The user explicitly authorized this complete shadow sequence on 2026-09-27, with an immediate stop on any failed target, migration, validation, uniqueness, index, deployment or operational gate. Authorization does not permit a read cutover or merging PR #439. The user subsequently authorized resuming with the local worker intentionally paused during bulk maintenance, batches of 500, and a worker health gate after independent full validation. The earlier P2028 was a worker transaction-admission/concurrency failure, not a codec or persisted-data failure. Pool sizes, connection URL parameters and worker concurrency remain unchanged.

1. Inspect both runtime `DATABASE_URL` and migration/index `DIRECT_URL`; require the same intended database. Inspect pending migrations. Preserve the current column/index/table/database sizes and the 100 fixed-pilot values for comparison. A full **read-only**, bounded compatibility scan works even before the new column exists:

   ```bash
   npm run db:backfill-compact-position-data --workspace=apps/api -- --preflight
   ```

   This mode encodes and decodes every original FEN in a repeatable-read snapshot, records true expected compact/piece distributions and existing FEN/key storage, and performs no updates. It does not claim to validate persisted shadow bytes.

2. After authorization, apply the expansion migration only through the normal migration command. Stop if unrelated migrations are pending:

   ```bash
   npm run db:migrate --workspace=apps/api
   ```

3. Deploy the API and any active worker from the reviewed PR-branch artifact through the existing release process, without merging the PR. Apply the column before starting the new release. Confirm all Position writers use the dual-writing release before backfill. If that release cannot be deployed or any writer fails, stop the rollout and report continuous shadow coverage as pending. Old writers can introduce new nulls. Do not claim a complete sustained rollout while old writers remain active or the worker deployment gate is failed.

4. Save baseline measurements, then backfill and independently validate:

   ```bash
   npm run db:measure-compact-position-data --workspace=apps/api
   npm run db:backfill-compact-position-data --workspace=apps/api -- --batch-size=500
   npm run db:backfill-compact-position-data --workspace=apps/api -- --validate-only --batch-size=500
   ```

   Batch size accepts integers 1..5000, default 1000. The update selects only null compact values, ordered by ID, in bounded batches with row locks. It prevalidates the entire batch, performs one parameterized `UPDATE ... FROM (VALUES ...)` guarded by ID, original FEN and null compact data, rereads exactly those IDs and commits only after exact/canonical validation. Failure rolls back that batch and identifies ID, FEN, encoded length and decoded FEN. Earlier committed batches remain durable; restarting begins at the first null row and never overwrites a populated value. Malformed rows are never skipped. The fixed pilot, hash and FEN columns are not updated.

   Incremental reports include batches/scanned/written/validated/failures/last ID and bounded compact-byte/piece-count histograms. The final repeatable-read validation decodes every stored row in bounded pages, requires zero nulls and row-count agreement, and reports min/average/median/p90/p99/max sizes and piece counts, complete distributions, raw compact payload total, field-storage totals and averages. Median uses the two central ranks; p90/p99 use nearest rank. Validation has a 30-minute snapshot timeout; row-lock acquisition is five seconds and each write batch has a 60-second timeout. No whole-table array is retained.

5. After the independent validation reports zero NULLs, zero mismatches and a validated count equal to the current row count, restart the reviewed local worker with no backfill running. Observe all configured loops with the existing `connection_limit=3`, and validate any newly created Positions. Stop on worker/database errors; do not change the connection budget to pass this gate. Only after this worker gate succeeds, build the unique index using the **direct** URL:

   ```bash
   npm run db:index-compact-position-data --workspace=apps/api
   ```

   The command explicitly checks zero nulls and zero duplicate byte values, prints bounded identifying conflict samples (including representatives of different FENs), validates every stored round trip, repeats the guards, then executes the following single statement outside an explicit transaction:

   ```sql
   CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "ImportedGamePosition_positionDataCompact_key"
   ON "ImportedGamePosition"("positionDataCompact");
   ```

   PostgreSQL enforces uniqueness throughout the concurrent build even if a competing writer races with the guards. A preexisting index must have the expected one-column unique definition and be valid/ready; otherwise the command aborts for manual review. No index is dropped automatically. An interrupted concurrent build can leave an invalid index; do not interpret `IF NOT EXISTS` as repairing it.

6. Once the authorized operational index build succeeds, copy [the staged idempotent index SQL](compact-position-shadow-index.sql) into a new normal Prisma migration and add the matching mapped `@unique` annotation to the still-nullable schema field. Apply that migration through `db:migrate`; its `CONCURRENTLY IF NOT EXISTS` statement records history without recreating the validated index. **The staged SQL is deliberately outside the migration chain until the backfill gate is met.** An automatic migration deployment therefore cannot accidentally build the index before validation. No `NOT NULL` or primary-key change is included.

7. Run ordinary vacuum outside a transaction through the configured direct connection, then collect actual storage and planner measurements:

   ```bash
   cd apps/api
   node -r dotenv/config -e 'const {spawnSync}=require("node:child_process"); if(!process.env.DIRECT_URL) throw new Error("DIRECT_URL is required"); const result=spawnSync("psql",["--dbname",process.env.DIRECT_URL,"-v","ON_ERROR_STOP=1","-c","VACUUM (ANALYZE) \"ImportedGamePosition\";"],{stdio:"inherit"}); process.exit(result.status ?? 1);'
   cd ../..
   npm run db:measure-compact-position-data --workspace=apps/api
   npm run db:benchmark-position-lookups --workspace=apps/api
   ```

   Do not run `VACUUM FULL`. Ordinary vacuum makes dead space reusable but does not generally shrink physical files. Check storage headroom before expansion and monitor it during backfill/index creation; retaining old tuple versions and current indexes temporarily requires more space than the compact field payload alone.

## Measurement interpretation

The measurement command is read-only. It reports row/null/fixed-pilot counts; min/average/max/total `pg_column_size` of FEN, hash and compact shadow data; total raw compact payload; fixed-pilot storage; every Position index's exact and pretty physical size; and heap/total-relation/database sizes. Keep the primary-key, existing hash-index and shadow unique-index measurements separately identifiable.

Report added **compact field storage plus new compact index storage** as attributable shadow representation storage, separately from the observed before/after heap and total-relation growth. Physical growth may include tuple/index bloat, alignment, visibility metadata and concurrent activity; it is not an eventual compacted steady-state estimate. Existing fields/indexes remain stored, so this rollout does not reclaim them.

The lookup comparison is also read-only. It samples at most 100 populated positions and compares exactly the same IDs/FENs for up to three single equality queries (first/middle/last sampled positions) plus one bounded 100-row `IN` batch. Each hash and shadow query collects `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` and explicitly checks resolved IDs/FENs. The report contains execution/planning time, rows, node/index selections and complete buffer plans. There are at most eight EXPLAIN executions and eight result checks, with alternating representation order. This is a warm-cache canary, not load testing or statistically robust latency benchmarking. Small tables may legitimately use sequential scans.

The existing application code never consumes the benchmark's shadow lookup. The compact field stays nullable and secondary; any future read or storage cutover requires a separate decision.

## Read-only production preflight — 2026-09-26

Target: `ep-spring-bird-algpv2s4.c-3.eu-central-1.aws.neon.tech`, database `neondb`, schema `public`, role `neondb_owner`. Runtime uses the matching pooled endpoint; migrations/index creation use the direct endpoint. The identity/compatibility reads ran in read-only transactions. The compact column is absent; all 82 completed repository migrations are applied and no unfinished migration remains. Exactly 100 rows still contain the fixed pilot. No production migration, dual-writer deployment, backfill, index build or vacuum was executed for this rollout.

The `--preflight` command validated **771,646** original FENs in bounded pages, wrote **0** rows and found **0** mismatches. These are actual full-table codec measurements, not persisted compact-column measurements:

| Metric | Min | Average | Median | p90 | p99 | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Compact payload bytes | 12 | 20.978037 | 22 | 25 | 26 | 26 |
| Piece count | 3 | 21.554491 | 23 | 30 | 32 | 32 |

Expected raw compact payload is **16,187,618 bytes**, versus **26,235,964 bytes** at 34 bytes/position: **10,048,346 bytes (38.30%)** less. Existing FEN field storage totals **40,581,498 bytes** (average 52.590823), and hash field storage totals **13,117,982 bytes** (average 17). Future actual compact `pg_column_size` totals and index size must be measured after authorized execution; raw payload excludes PostgreSQL field headers and indexes.

| Compact bytes | Positions |
| ---: | ---: |
| 12 | 8,457 |
| 13 | 16,771 |
| 14 | 23,447 |
| 15 | 30,517 |
| 16 | 36,944 |
| 17 | 41,059 |
| 18 | 48,203 |
| 19 | 52,473 |
| 20 | 56,787 |
| 21 | 62,309 |
| 22 | 70,332 |
| 23 | 76,670 |
| 24 | 86,832 |
| 25 | 92,531 |
| 26 | 68,314 |

| Pieces | Positions |
| ---: | ---: |
| 3 | 3,668 |
| 4 | 4,789 |
| 5 | 6,671 |
| 6 | 10,100 |
| 7 | 10,028 |
| 8 | 13,419 |
| 9 | 13,938 |
| 10 | 16,579 |
| 11 | 18,231 |
| 12 | 18,713 |
| 13 | 19,441 |
| 14 | 21,618 |
| 15 | 23,176 |
| 16 | 25,027 |
| 17 | 25,636 |
| 18 | 26,837 |
| 19 | 27,367 |
| 20 | 29,420 |
| 21 | 29,081 |
| 22 | 33,228 |
| 23 | 31,247 |
| 24 | 39,085 |
| 25 | 31,208 |
| 26 | 45,462 |
| 27 | 29,258 |
| 28 | 57,574 |
| 29 | 25,843 |
| 30 | 66,688 |
| 31 | 15,086 |
| 32 | 53,228 |

Pre-rollout physical baseline: hash unique index **31,367,168 bytes**, primary-key index **19,906,560 bytes**, Position heap **89,194,496 bytes**, Position total relation **140,550,144 bytes**, whole database **344,203,264 bytes**. These values can change with concurrent activity. The compact index does not exist, and additional production storage introduced by this task so far is **0 bytes**.

Lossless encoding and the full-table 38.30% raw reduction versus the fixed codec support proceeding with a shadow canary. They do not yet establish compact-index performance, write cost, actual additional storage or the viability of replacing the existing hash plus FEN. Those conclusions require the authorized rollout and measurements below.

## Validation and current execution checkpoint

New API tests cover all three dual-write statements, duplicate-create semantics, legacy null shadow reads, immutable fixed data/keys/FENs, interruption/resume/idempotency, rollback for malformed FEN or corrupted readback, zero final nulls, exact full histogram statistics, duplicate/collision gates, concurrent index validity, nullable schema and bounded lookup equivalence. Backfill/index/benchmark integration fixtures live in a private PostgreSQL schema. Run mutation tests only against an identified disposable test database.

Local validation completed: root `npm run build` (including API typecheck, web and mobile builds), root `npm run lint`, all 191 chess-domain tests, focused dual-write/backfill and existing import/analysis/opening/HTTP tests, `check:architecture`, `check:hygiene`, and `git diff --check`. The full migration chain was applied only to disposable local PostgreSQL 16 databases; maintenance integration uses 2,107 positions in an isolated schema. The complete root suite passed: 191 domain tests, 250 API test files, 545 web tests and 25 mobile tests. [CI passed for reviewed commit `6d3b6604`](https://github.com/vokerg/chess_repertoir_trainer/actions/runs/36269077398). Initial local full-suite attempts exposed non-UTC PostgreSQL timestamps, reused authentication fixtures, and a synthetic non-FEN cleanup fixture; the final run uses a fresh UTC database and the cleanup test now exercises a valid played FEN without changing cleanup behavior. Database-mutating integration tests ran only on disposable local PostgreSQL. Production execution is tracked separately below. Git emits configured LF-to-CRLF conversion notices.

## Authorized execution — stopped at deployment gate, 2026-09-27

At 11:41 UTC, target verification matched the documented direct/pooled endpoint, `neondb.public`, role `neondb_owner`, 771,646 positions and 100 fixed pilot rows. The expansion migration was the only pending migration; main had not advanced beyond the branch base. The Neon console identified project `morning-butterfly-68390172`, production branch `br-dawn-hall-alkzystf`, Free plan with 0.5 GB/project storage. Reported project usage was 367.67 MB; PostgreSQL reports `neon.max_cluster_size = 512 MB` and autovacuum enabled.

Completed:

- `npm run db:migrate --workspace=apps/api` applied `20260926160000_add_compact_position_shadow` at **11:44:07 UTC**, then regenerated Prisma. The compact field is nullable with no default; no index was added. Prisma displayed a major-version upgrade notice; no dependency upgrade was performed.
- Verified the existing Render service's runtime/direct database hosts and database/schema match the intended Neon target, without changing its environment.
- Render service `srv-d8a44vf7f7vs73cp9ogg` deployed exact reviewed commit `6d3b660459187e989dae08dfb7c52570e0c023cb` through the specific-commit workflow, without merging or changing its configured branch. [Deployment `dep-dasg3kh7lnhs7391irc0`](https://dashboard.render.com/web/srv-d8a44vf7f7vs73cp9ogg/deploys/dep-dasg3kh7lnhs7391irc0) reported live at **11:48:56 UTC**; `/health` returned `{ "ok": true }`. Verified Render auto-deploy is **Off** after the specific-commit workflow; it remains off so an unrelated main push cannot replace the dual-writing canary with the legacy build. The configured source branch remains main.
- Found the actual local API/worker supervisors in this repository. Reloaded their reviewed source after Prisma generation by changing entry-file modification times only; no source content changed. Local API PID 49187 remained healthy. Worker PID 49186 initially ran under supervisor PID 36438, but subsequently exited, leaving the supervisor with no child. The Render project contains one API web service and no hosted worker.

**Stop condition:** the active worker could not be confirmed to remain running on the dual-write release. The rollout stopped immediately when that deployment inconsistency was established, before any compact backfill batch. Computer-use safety controls rejected access to Terminal, so the worker's console error was unavailable. At this first checkpoint its console error was unavailable and no second restart had been attempted. The user subsequently clarified that they had intentionally terminated the local processes, authorized starting them for verification, and the sequence resumed as recorded below.

Read-only checkpoint at **11:55 UTC**:

| Measurement | Actual value |
| --- | ---: |
| Positions | 771,646 |
| Compact NULLs | 771,646 |
| Rows backfilled | 0 |
| Compact field storage / raw payload | 0 / 0 bytes |
| Compact UNIQUE index | Not created |
| Hash unique index | 31,367,168 bytes |
| Primary-key index | 19,906,560 bytes |
| FEN field total | 40,581,498 bytes |
| Hash field total | 13,117,982 bytes |
| Fixed pilot field total | 3,500 bytes |
| Position heap | 89,194,496 bytes; growth 0 |
| Position total relation | 140,550,144 bytes; growth 0 |
| PostgreSQL database | 344,203,264 bytes; growth 0 |

An independent read-only audit compared the saved 100 fixed-pilot rows' IDs, FENs, keys and fixed bytes exactly; all are unchanged. Both existing index definitions are unchanged. Additional measured compact field/index storage is zero; metadata/catalog effects are not a compacted steady-state estimate.

Not executed: backfill, stored-data full validation, unique index gates/build, convergence migration or nullable `@unique` annotation, vacuum, and equality/batch benchmark. No lookup plans/timings or post-backfill storage conclusions are available. The full-table preflight distribution above remains encoding-only evidence, not completed shadow rollout validation. The 38.30% raw gain still merits a canary, but does not justify cutover without the remaining measured storage/index/lookup gates.

The existing application reads remain key-based; the fixed pilot, FEN/hash fields, relations and cleanup behavior remain intact. PR #439 is unmerged. Resolve and confirm the worker deployment gate before resuming the still-authorized sequence; recheck identity, migrations and headroom before the next production mutation.

## Resumed after user clarification — stopped on worker P2028

The user clarified that the earlier local process termination was intentional and authorized startup for verification. Rebuilt the reviewed API runtime with `npm run build:api`, then started the compiled local API and worker using the repository's normal `start` and `start:worker` commands, with logs captured. Both local and hosted API health checks passed. The worker started all configured loops; orphan Position cleanup remained disabled by its existing configuration. Its initial preparation-reconciliation lag warning after downtime cleared on subsequent iterations. Rechecked the target: `neondb.public`, intended endpoints, no pending/unfinished migrations, 771,646 positions and 771,646 compact NULLs.

Ran the documented backfill command with `--batch-size=1000`. **75 batches / 75,000 rows** committed, each prevalidated and validated again from PostgreSQL before commit, with **zero codec failures**, last committed ID **76,614**. The worker subsequently exited with:

```text
Persistent worker failed PrismaClientKnownRequestError:
Transaction API error: Unable to start a transaction in the given time.
code: P2028

Timed out fetching a new connection from the connection pool.
Current connection pool timeout: 20, connection limit: 3
```

On detecting this material operational failure, interrupted the maintenance process immediately with SIGINT. No automatic retry or additional batch job was launched. The worker is stopped. The temporary local API used for verification was intentionally shut down afterward; the hosted API remains live on reviewed commit `6d3b6604`, with Render auto-deploy Off. The backfill's own per-batch validation reported no failure; the **worker operational failure** stopped the rollout. Existing successful batches remain resumable and are not undone.

An independent **read-only partial audit** at **12:06:47 UTC** paged through all 75,000 populated values, requiring exact decoded FEN and canonical byte equality, and found **zero mismatches**. It explicitly excluded the still-unfilled values and is **not** the required final full-table validation. All 100 saved fixed-pilot IDs/FENs/keys/fixed bytes remain exactly unchanged.

| Current measurement | Actual value |
| --- | ---: |
| Total positions | 771,646 |
| Compact populated / NULL | 75,000 / 696,646 |
| Committed / independently validated | 75,000 / 75,000 |
| Codec mismatches | 0 |
| Compact field storage | 1,513,571 bytes |
| Compact raw payload | 1,438,571 bytes |
| Compact field min / average / max | 13 / 20.180947 / 27 bytes |
| Compact UNIQUE index | Not built |
| Current hash unique index | 31,367,168 bytes; unchanged |
| Primary-key index | 19,906,560 bytes; unchanged |
| Position heap | 90,849,280 bytes; growth 1,654,784 |
| Position total relation | 142,204,928 bytes; growth 1,654,784 |
| Database | 345,858,048 bytes; growth 1,654,784 |
| FEN / hash / fixed-pilot field totals | 40,581,498 / 13,117,982 / 3,500 bytes; unchanged |

Measured attributable compact field/index storage is **1,513,571 bytes**, with zero compact index storage. Physical growth is reported separately; no vacuum has run, and these partial-update heap sizes do not establish eventual compacted storage.

| Partial populated rows only | Min | Average | Median | p90 | p99 | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Compact raw bytes | 12 | 19.180947 | 19 | 24 | 26 | 26 |
| Piece count | 3 | 17.918880 | 18 | 28 | 32 | 32 |

| Compact raw bytes | Populated positions |
| ---: | ---: |
| 12 | 1,471 |
| 13 | 2,772 |
| 14 | 3,468 |
| 15 | 4,659 |
| 16 | 6,326 |
| 17 | 6,626 |
| 18 | 7,242 |
| 19 | 7,488 |
| 20 | 6,848 |
| 21 | 6,674 |
| 22 | 6,245 |
| 23 | 5,565 |
| 24 | 4,574 |
| 25 | 3,407 |
| 26 | 1,635 |

| Pieces | Populated positions |
| ---: | ---: |
| 3 | 664 |
| 4 | 807 |
| 5 | 868 |
| 6 | 1,904 |
| 7 | 1,431 |
| 8 | 2,037 |
| 9 | 2,265 |
| 10 | 2,394 |
| 11 | 3,037 |
| 12 | 3,289 |
| 13 | 3,388 |
| 14 | 3,238 |
| 15 | 3,576 |
| 16 | 3,666 |
| 17 | 3,749 |
| 18 | 3,739 |
| 19 | 3,307 |
| 20 | 3,541 |
| 21 | 3,124 |
| 22 | 3,550 |
| 23 | 2,680 |
| 24 | 3,565 |
| 25 | 2,244 |
| 26 | 3,321 |
| 27 | 1,617 |
| 28 | 2,957 |
| 29 | 1,028 |
| 30 | 2,379 |
| 31 | 248 |
| 32 | 1,387 |

Remaining operations were **not executed**: the other 696,646 historical rows, independent full-table stored validation, duplicate/index gates and concurrent UNIQUE build, convergence migration/nullable unique annotation, ordinary vacuum, and equality/batch lookup comparisons. No query-plan/timing comparison or final compact-index size exists yet, so there is no basis for a cutover decision. Reads remain on the existing key and FEN.

Resume requires diagnosing the worker's transaction-admission and three-connection-pool exhaustion and confirming a stable connection budget for its concurrent loops while maintenance runs. The cause is now captured in the worker log; no console access or additional authorization for the already approved sequence is needed, but the user's explicit stop-on-operational-error condition prevents silently retrying the failed rollout. Recheck target/migrations/headroom and worker health before a deliberate resume. The documented NULL-only command will retain the already committed 75,000 rows and continue at the first unfilled ID.

## Maintenance-pause resume — 2026-09-27

The user explicitly instructed that the worker stay stopped throughout the bulk backfill and independent full validation. The prior P2028 means the worker could not acquire a transaction/connection while concurrent maintenance was active; there were zero codec mismatches. This rollout changes neither Prisma pool sizes, `DATABASE_URL` parameters, worker concurrency nor application architecture. The post-backfill restart will determine whether the reviewed worker remains healthy without the write workload.

Resume preflight at 12:16:42 UTC confirmed the intended direct/pooled Neon identity, no pending or unfinished migrations, the nullable/no-default shadow column and no compact index. Counts matched the checkpoint exactly: 771,646 total, 75,000 populated, 696,646 NULL. Database storage was 345,858,048 bytes against the 512 MB cluster limit. A SHA-256 audit of IDs and existing compact bytes was saved to verify that the original 75,000 values remain untouched. Render remained Live on reviewed dual-write commit `6d3b660459187e989dae08dfb7c52570e0c023cb`, with auto-deploy Off.

The resumed command uses `--batch-size=500`. A health-monitor timeout caused an immediate pause after 127 batches / 63,500 additional rows, with written = validated and zero failures. The Render free instance had been inactive for over 15 minutes; its logs show a fresh instance startup, followed by HTTP 200 and a subsequent 0.3-second health response. This was a cold-start delay rather than evidence of codec/database failure. After confirming recovery, the NULL-only command resumed with continuous health/headroom/count monitoring. The local worker stayed intentionally stopped until both full validations passed. The reviewed worker restart was subsequently interrupted by local laptop sleep and a failed health probe; it is stopped again. The worker health gate and remaining index/vacuum/benchmark sequence are pending.

### Completed backfill and independent validation

The resumed work committed **696,646** additional rows in **1,394** batches of at most 500: 127 / 63,500 before the cold-start monitoring pause and 1,267 / 633,146 afterward. Including the initial 75 / 75,000, the complete backfill committed **771,646 rows across 1,469 batches**, with written = readback-validated for every batch and **zero failures**. The final ID was **1,123,909**.

Both the automatic full validation and the separate `--validate-only --batch-size=500` command validated **771,646** stored rows with **zero NULLs and zero mismatches**, equal to the current Position count. Each required exact FEN equality and canonical re-encoding. A separate retention audit reproduced the SHA-256 digest of the initial 75,000 compact values and confirmed all 100 saved fixed-pilot IDs/FENs/keys/bytes unchanged. FEN and hash field totals also equal the pre-rollout totals.

| Persisted full-table metric | Min | Average | Median | p90 | p99 | Max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Compact payload bytes | 12 | 20.978037 | 22 | 25 | 26 | 26 |
| Piece count | 3 | 21.554491 | 23 | 30 | 32 | 32 |

Actual raw compact payload totals **16,187,618 bytes**; `pg_column_size(positionDataCompact)` totals **16,959,264 bytes**, averaging **21.978037 bytes** including the field header. This is **38.30%** less raw payload than the fixed 34-byte format.

| Persisted compact payload bytes | Positions |
| ---: | ---: |
| 12 | 8,457 |
| 13 | 16,771 |
| 14 | 23,447 |
| 15 | 30,517 |
| 16 | 36,944 |
| 17 | 41,059 |
| 18 | 48,203 |
| 19 | 52,473 |
| 20 | 56,787 |
| 21 | 62,309 |
| 22 | 70,332 |
| 23 | 76,670 |
| 24 | 86,832 |
| 25 | 92,531 |
| 26 | 68,314 |

The persisted piece-count distribution exactly matches the complete preflight piece table above. The worker restart uses the reviewed compiled `start:worker` build and the existing `connection_limit=3`; no backfill is running during observation.

### Worker observation interrupted by laptop sleep — final checkpoint

At **12:51:02 UTC**, after both validation processes exited successfully and no backfill remained, restarted the reviewed compiled worker using `npm run start:worker --workspace=apps/api`. Persistent jobs, account imports, account/game lifecycle and whole-user lifecycle loops started normally. Position cleanup remained disabled by its existing configuration. Preparation reconciliation telemetry recovered from the downtime warning to normal sub-second lag. The existing `connection_limit=3` was unchanged.

The worker remained alive and all health probes passed through **12:53:02 UTC** (121 seconds), with **no P2028, database transaction/connection errors or codec failures**. No Position with ID above the pre-restart maximum 1,123,909 was created during that window, so the bounded canonical audit observed **zero new rows**; this is not a claim that a new production creation path was exercised. The creation paths are covered by the API dual-write tests.

The observation then stopped on a health-probe transport failure (`fetch failed`), and its supervisor sent SIGTERM to the worker process group. The laptop subsequently spent several hours in sleep/dark-wake cycles, confirmed by the macOS power log. A later 30-second curl probe reported 949.9 seconds elapsed across suspension and no response. This local interruption prevents claiming a complete continuous worker health canary; it does **not** demonstrate a codec failure or a recurrence of P2028. The worker is stopped. No pool, URL, concurrency or architecture settings were changed to pass the gate.

After wake, a read-only Neon check reconfirmed **771,646 positions, zero compact NULLs**, and **417,472,512 database bytes**. A fresh hosted `/health` request subsequently returned **HTTP 200 / `{ "ok": true }`** after 82.5 seconds, consistent with Render free-instance wake latency; the interrupted worker observation is still incomplete. The fully committed backfill and both successful full validations remain durable. No compact UNIQUE index, convergence migration, nullable `@unique` annotation, vacuum or lookup benchmark was executed because the worker observation gate remains incomplete. Existing reads and representations remain unchanged; PR #439 remains unmerged.

The following are **post-backfill, pre-index, pre-vacuum** measurements, not a completed shadow rollout:

| Measurement | Actual bytes | Change from original baseline |
| --- | ---: | ---: |
| Compact raw payload | 16,187,618 | +16,187,618 |
| Compact field storage | 16,959,264 | +16,959,264 |
| Compact UNIQUE index | Not built | 0 |
| Current hash unique index | 62,521,344 | +31,154,176 |
| Primary-key index | 35,053,568 | +15,147,008 |
| Position heap | 116,154,368 | +26,959,872 |
| Position total relation | 213,819,392 | +73,269,248 |
| Whole database | 417,472,512 | +73,269,248 |

FEN/hash/fixed-pilot field totals remain **40,581,498 / 13,117,982 / 3,500 bytes**. Compact field min/average/max are **13 / 21.978037 / 27 bytes**; payload min/average/median/p90/p99/max are **12 / 20.978037 / 22 / 25 / 26 / 26 bytes**. Attributable compact field-plus-index storage so far is **16,959,264 bytes**. The larger observed physical growth includes backfill tuple/index bloat and reusable space; neither old index growth nor heap growth should be treated as eventual compacted steady-state storage. No current index was logically altered or dropped.

The full-table lossless result and 38.30% raw reduction versus the fixed format support compact identity as a candidate. Actual compact-index size, duplicate readiness and equality/batch plans/timings remain unmeasured; these results alone do not justify a read cutover.

Validation for this checkpoint: **191 chess-domain tests / 16 files** passed; the complete API command (`npm run test --workspace=apps/api`) passed **250 test files** against a fresh disposable local PostgreSQL 16 database with UTC timezone, including the API build/typecheck, dual-write and transactional backfill tests. Architecture and hygiene checks passed. Production mutation tests were not run. The previously reviewed runtime and prior documentation checkpoint both have green GitHub CI; CI for this documentation checkpoint is triggered on push.

## Completed shadow rollout — 2026-10-01

This section supersedes the preceding stopped checkpoint. The hosted API remains on reviewed dual-write commit `6d3b660459187e989dae08dfb7c52570e0c023cb` with healthy `/health`; PR #439 is still unmerged. Production reads, deduplication and cleanup still use the existing `positionKey`/`normalizedFen` behavior. No old representation, relation or index was removed, and `positionDataCompact` remains nullable.

The renewed target check confirmed `neondb.public` on the intended direct/pooled Neon endpoints, **771,646** Positions, **zero compact NULLs**, **100** fixed-pilot values, no compact index and no pending repository migrations. The current Neon-reported cluster limit is **1 GB**; the database was **417,472,512 bytes** before index creation. A new independent `--validate-only --batch-size=500` pass decoded and canonically re-encoded **all 771,646 stored values** with **zero mismatches** and **zero NULLs**. FEN/key/compact field totals matched the previous full validation exactly.

With no backfill running, the reviewed compiled worker restarted using the existing `connection_limit=3`. Persistent jobs, account imports, account/game lifecycle and whole-user lifecycle loops started; Position cleanup remained disabled by its existing configuration. Preparation reconciliation cleared the initial maintenance lag on its next iteration. The worker and hosted API passed a **303-second** continuous observation with no P2028 or transaction/connection failure, then remained healthy through index creation, migration, vacuum and measurement. No Position above pre-restart ID **1,123,909** was created through the final readback, so this production observation contains **zero new-row dual-write samples**; the three creation paths are covered by API tests. The worker's ordinary terminal-retention loop deleted two expired job runs on startup, outside the Position table.

An explicit read-only readiness gate found **zero NULLs**, **zero duplicate compact values** and no pre-existing compact index. The guarded command repeated those gates, validated **771,646** rows again, and created `ImportedGamePosition_positionDataCompact_key` with `CREATE UNIQUE INDEX CONCURRENTLY` outside an explicit transaction. PostgreSQL reports a valid, ready, unique one-column btree. Its size is **32,899,072 bytes**. No invalid-index state occurred.

The normal convergence migration [`20261001171630_index_compact_position_shadow`](../../apps/api/prisma/migrations/20261001171630_index_compact_position_shadow/migration.sql) records the index with `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS`; the Prisma field now has a mapped nullable `@unique` annotation. The operational index retained PostgreSQL object ID **2,105,344** across migration deployment, proving it was not recreated. The column remains nullable with no default. All **84** repository migrations are applied. The earlier `0001_init` status warning was a rolled-back May migration, not an active or pending migration; a complete history audit found that this convergence migration was the sole pending migration and no finished migration was missing locally. Prisma now reports the schema up to date.

Ordinary `VACUUM (ANALYZE) "ImportedGamePosition"` completed outside a transaction. `VACUUM FULL` was not run. Actual post-vacuum field storage is:

| Column | Min bytes | Average bytes | Max bytes | Total bytes |
| --- | ---: | ---: | ---: | ---: |
| `normalizedFen` | 25 | 52.590823 | 73 | 40,581,498 |
| `positionKey` | 17 | 17 | 17 | 13,117,982 |
| `positionDataCompact` | 13 | 21.978037 | 27 | 16,959,264 |

The 100 retained fixed-pilot values total **3,500 field bytes**. Compact raw payload totals **16,187,618 bytes**, versus **26,235,964 bytes** for 771,646 fixed 34-byte payloads: **10,048,346 bytes (38.30%)** less raw data. The persisted compact and piece-count distributions in the preceding full-backfill section still apply.

| Physical measurement | Actual bytes | Change from pre-rollout baseline |
| --- | ---: | ---: |
| Compact UNIQUE index | 32,899,072 | +32,899,072 |
| Current `positionKey` UNIQUE index | 62,521,344 | +31,154,176 |
| Position primary-key index | 35,053,568 | +15,147,008 |
| Position heap | 116,154,368 | +26,959,872 |
| Position total relation | 246,718,464 | +106,168,320 |
| Whole database | 450,387,968 | +106,184,704 |

The attributable added compact **field plus index** storage is **49,858,336 bytes**. Whole-database growth is larger because updating every Position also grew old index files and left heap/index space that ordinary vacuum can reuse without shrinking their physical files. The current hash index is **29,622,272 bytes larger** than the compact index, but the hash index was only **31,367,168 bytes before backfill**. These are actual live sizes, not a clean steady-state comparison or a prediction of space reclaimed by dropping anything later.

The read-only bounded benchmark sampled the **same 100 Positions** for both representations: three single equality lookups and one 100-value `IN` lookup per representation, **eight** `EXPLAIN (ANALYZE, BUFFERS)` executions in total. All ID/FEN result sets agreed with **zero mismatches**. PostgreSQL selected the corresponding unique index in all eight plans (single `Index Scan`, batch `Bitmap Index Scan`/`Bitmap Heap Scan` under a final sort). The [complete bounded EXPLAIN report](compact-position-shadow-benchmark-2026-10-01.json) retains plans, buffers, sampled IDs and per-query timings.

| Pattern | `positionKey` execution | Compact execution | Rows each |
| --- | ---: | ---: | ---: |
| Single equality, three-query mean | 2.669 ms | 0.072 ms | 1 |
| Batch `IN` (100 values) | 127.296 ms | 0.390 ms | 100 |

This is a single warm-cache canary, not a reliable latency estimate. The newly built compact index incurred **zero shared-block reads** in these plans; the current hash index incurred **2–3** in each single lookup and **138** in the batch. Buffer-cache state and backfill bloat materially affect this timing difference. The result establishes equivalent identity resolution and index eligibility, not a production throughput advantage.

The lossless full-table validation, zero duplicates and successful unique index make compact bytes viable as a future collision-free Position identity. Its smaller actual shadow index and much smaller field storage justify evaluating a separate cutover, subject to representative load testing and a storage design that accounts for old-index bloat. This rollout makes **no read cutover**, no `NOT NULL` change and no removal of `normalizedFen`, `positionKey` or fixed `positionData`.

After the convergence migration, `npm run test --workspace=packages/chess-domain` passed **191 tests in 16 files**, `npm run build:api` passed, and `npm run test --workspace=apps/api` passed **250 test files**, including the compact dual-write and backfill suites, against a fresh disposable UTC PostgreSQL 16 database with all 84 migrations applied. Root lint, architecture and hygiene checks passed. An initial attempt against a reused local database failed on a pre-existing dev-auth uniqueness fixture; the clean database run passed without application-code changes. Pull-request CI is tracked with the final branch review. No production test fixture rows were created.
