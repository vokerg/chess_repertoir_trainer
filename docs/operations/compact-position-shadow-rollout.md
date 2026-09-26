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

The previous authorization covered a 100-row fixed-format pilot. It does **not** authorize this full-table rollout. Do not mutate Neon until the target identity, current row count and these commands have been presented and execution is explicitly authorized. Keep PR #439 unmerged.

1. Inspect both runtime `DATABASE_URL` and migration/index `DIRECT_URL`; require the same intended database. Inspect pending migrations. Preserve the current column/index/table/database sizes and the 100 fixed-pilot values for comparison. A full **read-only**, bounded compatibility scan works even before the new column exists:

   ```bash
   npm run db:backfill-compact-position-data --workspace=apps/api -- --preflight
   ```

   This mode encodes and decodes every original FEN in a repeatable-read snapshot, records true expected compact/piece distributions and existing FEN/key storage, and performs no updates. It does not claim to validate persisted shadow bytes.

2. After authorization, apply the expansion migration only through the normal migration command. Stop if unrelated migrations are pending:

   ```bash
   npm run db:migrate --workspace=apps/api
   ```

3. Deploy the API and any active worker from the reviewed PR-branch artifact through the existing release process, without merging the PR. Apply the column before starting the new release. Confirm all Position writers use the dual-writing release before backfill. If that release cannot be deployed, pause legacy writers for maintenance and report continuous shadow coverage as pending; old writers can introduce new nulls after they resume. Do not claim a complete sustained rollout while old writers remain active.

4. Save baseline measurements, then backfill and independently validate:

   ```bash
   npm run db:measure-compact-position-data --workspace=apps/api
   npm run db:backfill-compact-position-data --workspace=apps/api -- --batch-size=1000
   npm run db:backfill-compact-position-data --workspace=apps/api -- --validate-only --batch-size=1000
   ```

   Batch size accepts integers 1..5000, default 1000. The update selects only null compact values, ordered by ID, in bounded batches with row locks. It prevalidates the entire batch, performs one parameterized `UPDATE ... FROM (VALUES ...)` guarded by ID, original FEN and null compact data, rereads exactly those IDs and commits only after exact/canonical validation. Failure rolls back that batch and identifies ID, FEN, encoded length and decoded FEN. Earlier committed batches remain durable; restarting begins at the first null row and never overwrites a populated value. Malformed rows are never skipped. The fixed pilot, hash and FEN columns are not updated.

   Incremental reports include batches/scanned/written/validated/failures/last ID and bounded compact-byte/piece-count histograms. The final repeatable-read validation decodes every stored row in bounded pages, requires zero nulls and row-count agreement, and reports min/average/median/p90/p99/max sizes and piece counts, complete distributions, raw compact payload total, field-storage totals and averages. Median uses the two central ranks; p90/p99 use nearest rank. Validation has a 30-minute snapshot timeout; row-lock acquisition is five seconds and each write batch has a 60-second timeout. No whole-table array is retained.

5. Only after successful full validation, build the unique index using the **direct** URL:

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

Local validation completed: root `npm run build` (including API typecheck, web and mobile builds), root `npm run lint`, all 191 chess-domain tests, focused dual-write/backfill and existing import/analysis/opening/HTTP tests, `check:architecture`, `check:hygiene`, and `git diff --check`. The full migration chain was applied only to disposable local PostgreSQL 16 databases; maintenance integration uses 2,107 positions in an isolated schema. The complete root test suite and fresh PR CI are rerun for this checkpoint. Initial local full-suite attempts exposed non-UTC PostgreSQL timestamps, reused authentication fixtures, and a synthetic non-FEN cleanup fixture; the final run uses a fresh UTC database and the cleanup test now exercises a valid played FEN without changing cleanup behavior. Production-mutating tests, migration, deployment, backfill, index and vacuum are skipped pending authorization. Git emits configured LF-to-CRLF conversion notices.

The full production rollout has **not yet been authorized or executed**. Its commands and SQL are reviewable above; actual production compact-column/index totals and lookup plans remain pending execution. The earlier [100-row fixed pilot and read-only compact comparison](position-data-pilot.md) remain historical checkpoints, not evidence that this full shadow rollout is complete.
