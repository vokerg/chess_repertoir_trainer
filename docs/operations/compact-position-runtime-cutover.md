# Compact Position runtime cutover

PR #439 continues on `pilot-position-data`. The shadow rollout is complete. This branch implements compact runtime identity and FEN hydration; production deployment and merge require explicit authorization. Legacy storage remains for rollback. Destructive cleanup has not been performed.

## Persistence behavior

Normalized FEN remains the domain/API concept. Repositories encode canonical four-field FEN with `encodeNormalizedFenCompact` and query `Position.positionDataCompact`, using the existing nullable UNIQUE index. Database reads select compact bytes and decode with `decodeNormalizedFenCompact` at the persistence boundary. They expose the same normalized FEN strings and existing response shapes; bytes and extra selected IDs do not escape into services or contracts.

`modules/positions/position-storage.ts` centralizes byte conversion, compact map keys, required decoding, expected-FEN checks, selections and transitional write fields. Missing/malformed compact data fails explicitly with the Position ID. A decoded value different from an expected FEN is an invariant failure. Neither legacy field is a fallback. An ordinary missing cache/Position lookup retains its previous null/omission behavior.

All three runtime creation statements retain `normalizedFen`, `positionKey` and `positionDataCompact` writes. Only the compatibility write helper computes the hash. Single creation catches only Prisma P2002 uniqueness races and resolves by compact identity, validating the decoded FEN. Other operational errors propagate. Bulk analysis and ply indexing use compact hexadecimal map keys, `createMany(skipDuplicates)` and compact batch resolution; missing canonical rows after a skipped legacy conflict fail explicitly. Equal bytes associated with different FENs fail before persistence. Last-input analysis deduplication semantics remain unchanged.

No Prisma schema or migration change accompanies this cutover. `positionDataCompact` remains nullable. The legacy FEN/hash columns, both unique indexes, fixed pilot, primary key, foreign keys, cleanup predicates and transaction boundaries are retained.

## Complete runtime consumer audit

Paths below are relative to `apps/api/src/modules/`.

| Consumer | Identity resolution | FEN hydration |
| --- | --- | --- |
| `analysis/analysis.repository.prisma.ts` | Single find/create; single/bulk analysis lookups; bulk creation/resolution and deduplication | Analysis responses, batch-analysis plies, nested cached analysis Position |
| `imported-games/ply-index.repository.prisma.ts` | Compact deduplication, createMany and resolution | Expected-FEN verification before storing existing `positionId` FKs |
| `imported-games/ply-index.service.ts` | Removes hash from runtime ply input | Canonical FEN input retained |
| `imported-games/opening-analysis.repository.prisma.ts` | Single compact Position lookup | Opening Position return value |
| `opening-explorer/opening-explorer.repository.prisma.ts` | Compact relation lookup, existing Position FK upsert | Explorer cache responses |
| `lab/course-extension-candidates/course-extension-candidates.repository.prisma.ts` | Compact batch lookup | Position and candidate-ply return values |
| `imported-games/imported-games.repository.prisma.ts` | Existing FK/filter behavior retained | Imported-game detail and opening-struggle plies |
| `imported-games/game-tagging.repository.prisma.ts` | Existing game ownership retained | Tagging plies |
| `scenario-training/scenario-training.repository.prisma.ts` | Existing game ownership retained | Scenario source plies |
| `repertoire-coverage/repertoire-coverage.repository.prisma.ts` | Existing game IDs retained | Course-review plies |
| `data-lifecycle/data-lifecycle.account-game-execution.repository.prisma.ts` | Existing lifecycle ownership/transactions retained | Tag recomputation snapshots during lifecycle operations |

Repository-wide searches covered `positionKey`, `positionKeyForNormalizedFen`, `positionKeyHex`, `normalizedFen`, `positionDataCompact`, `prisma.position`, `tx.position`, Position relation selections and raw `ImportedGamePosition` SQL, with every discovered source match inspected. Classification:

- **Runtime lookup/deduplication:** the five identity repositories above now use compact equality/IN predicates and compact map keys. No normal Position lookup uses `positionKey` or stored FEN.
- **Runtime Position FEN reads:** every selected FEN consumer in the table now selects compact data. No `normalizedFen: true` selection remains under `apps/api/src` outside maintenance scripts.
- **Transitional writes:** the three creation statements call `transitionalPositionWriteFields`; its legacy hash generation is the only runtime caller of `positionKeyForNormalizedFen`.
- **Maintenance:** `scripts/backfill-position-keys.ts`, `rewrite-position-keys-to-128-bit.ts`, `pilot-backfill-position-data.ts`, `compare-position-codecs.ts`, `backfill-compact-position-data.ts`, `index-compact-position-data.ts`, `measure-compact-position-data.ts` and `benchmark-position-lookups.ts` intentionally inspect historical hash/FEN representations. `positions/position-key.ts` retains legacy hash/hex utilities for these scripts and compatibility writes. Its historical collision assertion is not used for runtime resolution.
- **Cleanup SQL:** `position-cleanup/position-cleanup.repository.prisma.ts` uses Position IDs and relation existence for bounded observation/deletion. It reads no legacy identity or FEN and is unchanged.
- **Tests:** synthetic pre-rollout NULL fixtures remain in maintenance/cleanup tests where no FEN hydration occurs. Runtime-reader fixtures now provide compact data. The isolated local cutover test deliberately changes stored FEN/hash values after canonical creation.
- **Domain FEN:** service inputs, scenario/course structures, opening-book keys, transient canonical-FEN caches, API responses and frontend/shared contracts retain their normalized FEN concept. They consume decoded canonical values and do not read the stored Position FEN column.

## Read-only production preflight — 2026-10-01

At 17:51–17:53 UTC, verified the intended direct endpoint `ep-spring-bird-algpv2s4.c-3.eu-central-1.aws.neon.tech`, database/schema `neondb.public`. The runtime pooled hostname is the same project with `-pooler`; both URLs target `neondb`. Existing `connection_limit=3` is unchanged.

- Positions: **771,646**; compact NULLs: **0**; duplicate compact groups: **0**.
- Independent repeatable-read, read-only validation, bounded pages of 500: **771,646 decoded and canonically re-encoded**, exact legacy FEN equality, **0 mismatches**.
- Compact index: valid, ready, unique, ordinary one-column btree, **32,899,072 bytes**.
- Retained hash unique index: valid/ready/unique, **31,367,168 bytes**; primary key: **17,358,848 bytes**. These current clean sizes supersede the historical post-backfill sizes; they are not correctness gates or performance claims.
- All five Position columns remain present; compact and fixed pilot remain nullable with no defaults.
- Hosted `/health`: **HTTP 200**, `{ "ok": true }`. Render dashboard independently shows the API Live on `6d3b660459187e989dae08dfb7c52570e0c023cb`, with auto-deploy disabled; the production project lists one web service and no hosted worker. No local `node dist/worker.js` process was present at the final inventory.

No production fixture, backfill, index, migration or other mutation ran for this preflight. Production cutover canary and post-cutover EXPLAIN measurements are pending deployment authorization.

## Deployment and rollback gate

Before deployment, report the exact reviewed commit and tests, refresh read-only production identity/count/NULL/duplicate/index/canonical validation/health checks, and verify current migration and runtime revisions. Deploy only after explicit user authorization, to every active API and worker that exercises Position code. Do not merge as part of deployment unless separately instructed.

Canary checks cover API/worker health, unchanged Prisma connectivity, representative existing analysis and opening lookups, naturally available explorer cache/indexed-game flows, and absence of compact invariant errors. Create no fake production user/game data. If new Positions naturally appear, verify all three write fields and exact compact decode. Stop on invariant failure, lookup/result mismatch, unexpected NULLs, schema/migration drift, API/worker regression or material operational error. Bounded comparison/EXPLAIN may confirm identical IDs/results and compact-index use; cache-confounded timings do not establish a performance improvement.

Rollback consists of redeploying the previous reviewed dual-write revision `6d3b660459187e989dae08dfb7c52570e0c023cb` to all active runtimes. No reverse migration or data restoration is required because the shadow fields/indexes and ongoing legacy writes remain intact. Keep all representations while evaluating rollback confidence.

Stop after a stable authorized runtime cutover. Removing `normalizedFen`, `positionKey`, the fixed pilot, old indexes, making compact NOT NULL, heap reclamation and VACUUM FULL belong to a separate destructive cleanup task.

## Implementation validation — 2026-10-01

Passed:

- `npm run test --workspace=packages/chess-domain`: 191 tests / 16 files.
- `npm run build:api`: API typecheck/build, including required domain/contracts prebuild and Prisma generation.
- Full 84-migration chain via `npm run db:migrate --workspace=apps/api` on fresh disposable PostgreSQL 16.15, explicitly UTC, loopback port 55439.
- `npm test`: dependency-audit tests, domain, contracts, all **251 API test files**, web tests and mobile tests. The API workspace test command includes its build and trap validation. This final run used another fresh disposable database (`compact_runtime_verified`).
- `npm run build`: all workspaces, including web and mobile exports.
- `npm run lint`: API, web and mobile.
- `npm run check:architecture`, `npm run check:hygiene`, `git diff --check`.
- Focused cutover integration/unit tests and cleanup/reindex/scenario regressions. Shadow corruption tests are guarded to loopback databases and restore/delete their isolated fixtures; no such tests ran on Neon.

Initial broad runs exposed fixture uniqueness assumptions (random hashes creating equal canonical Positions) and a duplicate test import; corrected fixtures/imports, focused regressions passed, then the complete fresh-database root run passed. Git reports the repository's existing LF-to-CRLF conversion notices. No new build/lint warning was reported. Hosted API deployment, worker startup/canary, post-cutover measurements and destructive cleanup were skipped pending explicit deployment authorization. `npm run expo:check` was not run for this API-only behavior change; mobile build/test/lint did run. GitHub CI for the pushed cutover commit is reported on PR #439 separately.
