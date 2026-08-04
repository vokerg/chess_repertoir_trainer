# ONB-006 — Database-only orphan shared-position cleanup

Date: 2026-08-04

Issue: [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153)

Status: Research complete after two adversarial self-review rounds; implementation proposed as ONB-026 / [#280](https://github.com/vokerg/chess_repertoir_trainer/issues/280)

Related review records:

- `ONB-006-2026-08-04-self-review-addendum.md` — lock-order correction history;
- `ONB-006-2026-08-04-second-self-review-addendum.md` — database-trigger, bounded-input, dry-run, invocation, and canonical-reconciliation corrections.

This primary report has been reconciled to both addenda and is the canonical design.

## Executive decision

Implement one dedicated, manual-first PostgreSQL maintenance capability that deletes a shared `Position` only when all of the following are true:

1. the exact database predicate proves zero `ImportedGamePly` references;
2. a durable candidate row proves the position has remained orphan-observed for the accepted 30-day grace cutoff;
3. every reference insert/update resets that candidate in the same database transaction through a PostgreSQL statement trigger;
4. every scan/reconcile/dry-run/delete transaction limits its input rows before applying orphan or grace filters;
5. the delete transaction acquires short table locks in the exact order `ImportedGamePly` → `ImportedGamePosition` → `PositionAnalysis` → `MastersExplorerCache`;
6. the final delete statement rechecks `NOT EXISTS` after those locks;
7. the run still owns its exact work key and has not acknowledged cancellation.

The operation never inspects or deletes course `MoveNode` rows. `PositionAnalysis` and `MastersExplorerCache` are reproducible dependent rows and delete through their existing `ON DELETE CASCADE` constraints. The existing `ImportedGamePly.positionId` `ON DELETE RESTRICT` foreign key remains the final integrity backstop.

The first release is disabled by default, explicitly operator-initiated, durable, bounded, resumable, unscheduled, and exact-count only. It does not promise ETA or reclaimed filesystem bytes.

## Repository findings

### Physical relation inventory

`Position` maps to physical table `ImportedGamePosition`. Current relations are:

- `ImportedGamePly.positionId -> ImportedGamePosition.id`, `ON DELETE RESTRICT`;
- `PositionAnalysis.positionId -> ImportedGamePosition.id`, unique, `ON DELETE CASCADE`;
- `MastersExplorerCache.positionId -> ImportedGamePosition.id`, `ON DELETE CASCADE`.

No course model references `Position`. Course `MoveNode` is a separate course-tree model.

The authoritative orphan predicate is therefore exactly:

```sql
NOT EXISTS (
  SELECT 1
  FROM "ImportedGamePly" ply
  WHERE ply."positionId" = position.id
)
```

Dependent analysis/cache rows do not confer ownership.

### Current creation and reference paths

The imported-game index repository currently replaces a game's plies in one Prisma transaction:

1. delete existing `ImportedGamePly` rows;
2. bulk-create missing `Position` rows;
3. resolve/validate positions;
4. bulk-create `ImportedGamePly` references;
5. mark the game indexed.

Analysis persistence and opening-explorer persistence can also create `Position` rows without imported-game plies. Those rows are legitimately unreferenced under the ownership rule, but immediate deletion would create avoidable churn. They receive the same first-observed grace.

### Existing timestamps cannot express orphan age

`Position` and lean `PositionAnalysis` do not record when the last ply reference disappeared. Explorer-cache timestamps cover only one dependent cache. Existing timestamps therefore cannot prove a full orphan grace after un-index, purge, game deletion, or transient re-reference.

Explicit orphan-observation persistence is required.

## Persistence decision

### `PositionCleanupCandidate`

Add one row per observed orphan:

- `positionId` primary key and foreign key to `Position`, `ON DELETE CASCADE`;
- `firstObservedOrphanAt`;
- `lastObservedOrphanAt`.

Rules:

- bounded observation inserts a candidate when `NOT EXISTS` is true;
- repeated observation preserves `firstObservedOrphanAt` and refreshes only `lastObservedOrphanAt`;
- every new ply reference deletes the candidate in the same transaction through database triggers;
- a later orphan observation creates a new row and therefore a new grace clock;
- bounded reconciliation removes currently referenced candidates and validates legacy/rollout state.

### `PositionCleanupRun`

Use a dedicated global maintenance-run model rather than user/account/game lifecycle fences. Store:

- mode: `DRY_RUN` or `EXECUTE`;
- status and typed result/error codes;
- immutable policy snapshot: grace duration/cutoff, input-page size, delete size, lock timeout, policy version;
- phase-specific traversal upper bounds and ordered checkpoints;
- inspected, observed, eligible, deleted, skipped-referenced, dependent-analysis, dependent-cache, and retry counters;
- observation start/completion timestamps for dry-run;
- request/cancel/claim/work-key/heartbeat/stale-recovery timestamps;
- actor/audit references compatible with ONB-019/ONB-022 conventions;
- one database-enforced non-terminal run globally.

The cleanup loop belongs in the existing API worker deployment. No broker, new queue library, or new deployment is introduced.

## Grace policy

Initial grace: **30 days from `firstObservedOrphanAt`**.

The duration is configurable but snapshotted per run. An accepted run cannot silently shorten its cutoff. Reducing the default later requires measured cache-churn and operational evidence plus reviewed policy change.

The policy is conservative:

- unobserved orphan time never counts retroactively;
- free-analysis/cache-only positions are not deleted immediately;
- transient re-reference resets the clock;
- deletion after un-index/purge does not occur until a new full observed grace passes.

## Database-enforced re-reference reset

Application-only candidate reset is insufficient for a database-owned invariant. A migration, direct SQL writer, or future implementation could create and remove a reference between reconciliation passes while leaving an old candidate/grace intact.

Add PostgreSQL statement triggers:

- `AFTER INSERT ON ImportedGamePly REFERENCING NEW TABLE ...`;
- `AFTER UPDATE ON ImportedGamePly REFERENCING NEW TABLE ...`.

Each trigger:

- gathers all newly referenced `positionId` values from the transition relation;
- deletes matching `PositionCleanupCandidate` rows once per SQL statement;
- runs in the same transaction as the reference write;
- is idempotent for duplicate ids and unchanged updates;
- covers Prisma bulk insert, direct SQL, migrations, and future writers without application opt-in.

The implementation must verify the deployed PostgreSQL major version supports transition relations before migration. If it does not, ONB-026 returns to design review rather than silently weakening the contract.

Bounded reconciliation remains mandatory for legacy/adoption validation and safety diagnostics, but it is not the primary reset mechanism.

## Bounded phase design

The initial ceiling is at most **500 input Position/candidate rows inspected per transaction**, not 500 matches found after an unbounded filter.

### Phase 1 — reconcile candidate pages

- snapshot a candidate traversal upper bound;
- select the next bounded candidate page by `positionId` primary-key order;
- remove rows that currently have a ply reference;
- advance to the last candidate input id inspected;
- record inspected and reconciled counts separately.

### Phase 2 — observe position pages

- snapshot the current maximum `Position.id` as the phase upper bound;
- select the next bounded `Position` page by primary-key order regardless of orphan status;
- evaluate `NOT EXISTS` only for that page;
- insert/refresh candidates for qualifying rows;
- advance to the last input position id inspected;
- record `positionsInspected`, `orphansFirstObserved`, and `orphansRefreshed`.

A query that searches the full position table for 500 matching orphans before `LIMIT` is not accepted.

### Phase 3 — dry-run or execute candidate pages

- snapshot a candidate traversal upper bound;
- select the next bounded candidate input page by primary-key order;
- apply the accepted grace cutoff and current `NOT EXISTS` check to that page;
- advance to the last candidate input id inspected, including when no row matches;
- newly inserted/restarted candidates are outside the accepted grace cutoff and do not become mid-run eligible.

A monotonic checkpoint is safe because eligibility is rechecked, the grace cutoff is immutable, and lower-id candidates created after the checkpoint receive a new first-observed timestamp and wait for a later run.

## Dry-run semantics

A durable bounded dry-run cannot truthfully represent one point-in-time database snapshot while spanning short transactions. PostgreSQL `READ COMMITTED` gives each command a new snapshot; holding one repeatable snapshot would require a long-lived transaction/exported-snapshot design that conflicts with the maintenance budget.

Dry-run therefore:

- snapshots policy inputs, grace cutoff, and traversal upper bound at acceptance;
- traverses bounded candidate pages in short transactions;
- reports exact rows observed eligible when each page was inspected;
- records `observationStartedAt` and `observationCompletedAt`;
- labels the result `OBSERVATIONAL`;
- never promises that execution will delete the same rows.

Execution always performs a fresh final locked recheck. Execution counters are exact for rows actually deleted and dependent rows counted inside each delete transaction.

## Concurrency decision

### Rejected: predicate-only deletion

A plain `DELETE ... WHERE NOT EXISTS` relies on FK conflict behavior and can cause noisy writer/cleanup aborts. It does not provide a stable bounded delete window around concurrent index, analysis, cache, and cascade writes.

### Rejected: advisory-lock convention across every writer

Safety would depend on every present and future writer remembering an application convention. Missing one path silently weakens the guarantee.

### Accepted: short fixed-order table maintenance locks

Each execute batch, inside one short transaction:

1. sets a local cleanup `lock_timeout`;
2. locks `ImportedGamePly` in `SHARE ROW EXCLUSIVE` mode;
3. locks `ImportedGamePosition` in `SHARE ROW EXCLUSIVE` mode;
4. locks `PositionAnalysis` in `SHARE ROW EXCLUSIVE` mode;
5. locks `MastersExplorerCache` in `SHARE ROW EXCLUSIVE` mode;
6. revalidates run state and exact work key;
7. selects the next bounded candidate input page;
8. applies grace and final `NOT EXISTS` checks;
9. counts dependent rows for the exact deletable set;
10. deletes positions set-wise, persists counters/checkpoint, and commits.

The plies-first order matches the current reindex transaction, which writes `ImportedGamePly` before `ImportedGamePosition`. Reversing those two locks creates a deadlock cycle.

Ordinary reads continue. Inserts/updates/deletes that acquire `ROW EXCLUSIVE` locks wait for the bounded transaction. The cleanup owns timeout/retry behavior; the design does not assume every writer has generic retry.

On lock timeout:

- roll back the whole batch;
- do not advance checkpoint or counters;
- persist a typed retryable blocked result outside the failed transaction;
- back off;
- surface repeated contention as `NEEDS_ATTENTION`.

## Batch and query policy

- observation/reconciliation/dry-run input page: initial maximum 500 rows;
- execute input page: configurable and no greater than 500 initially; use lower measured default if cascades breach budgets;
- every page uses ascending primary-key order and a snapshotted upper bound;
- every anti-join uses the existing leading `ImportedGamePly.positionId` index;
- candidate queries require indexes supporting bounded id traversal and grace checks;
- no per-position transaction loop;
- no client-provided ids;
- no unbounded in-memory materialization;
- halve execute size after repeated transaction/lock-budget breach;
- increase only through measured review.

## Progress, cancellation, retry, and audit

### Progress

Expose exact:

- phase and upper bound;
- current input checkpoint;
- rows inspected;
- orphans first observed/refreshed;
- candidates reconciled;
- candidates observed eligible during dry-run;
- rows deleted/skipped-referenced;
- dependent analysis/cache rows deleted;
- last successful batch time;
- lock-timeout/retry count.

No percentage is shown without a frozen denominator. No ETA or reclaimed-byte estimate is exposed.

### Cancellation and recovery

Cancellation is requested durably and acknowledged between transactions. An in-flight delete batch completes atomically.

Every settlement is fenced by run id, running state, and exact work key. Stale recovery replaces only the stale claim and retains phase/checkpoint/counters. Retry resumes from persisted input checkpoint and rechecks all eligibility.

### Audit

Store pseudonymous actor, policy version, accepted parameters, aggregate counters, result/error codes, timestamps, and run id. Exclude FEN, PGN, engine lines, explorer payloads, usernames, tokens, provider URLs, and arbitrary exceptions.

## Manual invocation boundary

ONB-026 must provide a server-side command under the existing `apps/api/src/scripts/` pattern:

- dry-run is the default;
- execute requires explicit `--apply` or equally unmistakable intent plus typed confirmation;
- the command creates/observes the same durable run through the canonical application service;
- it uses the same worker iteration/state machine as future adapters and contains no separate cleanup SQL;
- it prints the durable run id and bounded terminal/status result;
- typed failure exits non-zero;
- production execution remains disabled unless cleanup configuration is explicitly enabled.

ONB-024 may later add administrator API/Angular adapters over the same service. It does not own another delete implementation.

## Storage reporting

Report exact deleted row counts only. PostgreSQL tuple deletion does not guarantee immediate filesystem shrink. `VACUUM`, `VACUUM FULL`, compaction, and hosting-platform byte telemetry are separate operational concerns.

## Manual-first and scheduling boundary

No cron, recurrence, or automatic threshold exists in ONB-026. Scheduling requires a later decision supported by production evidence for:

- orphan creation/candidate volume;
- transaction and lock-wait distributions;
- cache re-creation/churn;
- failure/retry rate;
- operator usefulness.

## Validation plan

### Migration and trigger validation

- inspect generated models, constraints, indexes, partial uniqueness, FK cascades, trigger function, and trigger definitions;
- verify deployed PostgreSQL transition-relation support;
- apply migration to an existing-data fixture and assess rollback honestly;
- verify multi-row insert/update resets candidates once per statement;
- verify trigger/reference changes roll back together;
- verify transient reference then dereference starts a new grace clock without reconciliation.

### Predicate and bounded traversal

- dry-run/execute share one predicate builder;
- exact 30-day boundary uses database timestamps;
- sparse-orphan fixtures prove only the bounded position input page is inspected;
- mostly-not-graced candidate fixtures prove only the bounded candidate input page is inspected;
- checkpoints advance to last inspected input id even with zero matches;
- query plans use primary-key/index-bounded pages and the leading ply position index.

### Concurrency

Use two independent database connections and deterministic barriers for:

- cleanup-first and indexer-first reindex interleavings;
- cleanup waiting on an existing ply writer and timing out without progress;
- indexing waiting behind a cleanup batch and succeeding after commit;
- un-index/account/game cascade deletion;
- analysis upsert;
- opening-explorer cache upsert;
- duplicate cleanup claim;
- stale worker settlement after work-key replacement.

### Dry-run and command

- multi-transaction dry-run is labelled observational and carries start/completion timestamps;
- no snapshot/execution promise appears in contracts or UI text;
- manual command defaults to dry-run;
- execute cannot start without explicit apply/confirmation;
- command calls canonical service and contains no deletion SQL;
- command returns run id/status and non-zero failure code.

### Performance release gate

Use disposable PostgreSQL fixtures with at least 10, 500, and 5,000 input rows and representative dependent distributions. Record plans, input rows inspected, matches, transaction p50/p90, lock-wait p50/p90, cascades, and retries.

Release requires:

- transaction p90 below one second;
- lock-wait p90 below 250 ms;
- no unbounded scan before page limit;
- repeated breach halves batch size before further testing.

## Implementation decomposition

Allocate one implementation task:

- **ONB-026 / #280 — Implement bounded orphan shared-position cleanup**.

It owns candidate/run persistence, database reference-reset triggers, bounded phases, worker/service/command, maintenance locking, tests, and canonical preview/status/cancel contracts.

It excludes administrator UI, recurring scheduling, VACUUM, course cleanup, and user/account/game lifecycle phases.

## Resolved ONB-006 questions

- **Orphan predicate:** zero `ImportedGamePly` references via database `NOT EXISTS`.
- **Dependent rows:** `PositionAnalysis`, `MastersExplorerCache`, and candidate rows cascade.
- **Course data:** `MoveNode` is unrelated and excluded.
- **Grace:** 30 days from first persisted orphan observation.
- **Grace reset:** database statement triggers on ply reference insert/update.
- **Batching:** input-page bounded, ascending ids, maximum 500 initially.
- **Concurrency:** plies-first fixed table-lock order plus final recheck and FK backstop.
- **Dry-run:** exact bounded traversal observations, explicitly not one snapshot or execution promise.
- **Progress:** exact phases/upper bounds/checkpoints/inspected/matched counters; no ETA/bytes.
- **Cancellation:** between atomic batches.
- **Invocation:** manual server-side command, dry-run default, explicit apply for execute.
- **Runtime:** existing worker deployment, disabled by default.
- **Scheduling:** none until separate evidence-backed decision.
- **Implementation:** ONB-026 / #280.

## External technical references

- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL `CREATE TRIGGER` transition relations: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL trigger transaction behavior: https://www.postgresql.org/docs/current/trigger-definition.html
- PostgreSQL foreign-key constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL `lock_timeout` / `SET LOCAL`: https://www.postgresql.org/docs/current/runtime-config-client.html

## Files inspected

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260530113000_compact_imported_game_ply/migration.sql`
- `apps/api/prisma/migrations/20260602120000_client_side_position_analysis/migration.sql`
- `apps/api/prisma/migrations/20260715160000_add_masters_explorer_cache/migration.sql`
- `apps/api/src/modules/imported-games/ply-index.repository.prisma.ts`
- `apps/api/src/modules/analysis/analysis.repository.prisma.ts`
- `apps/api/src/modules/opening-explorer/opening-explorer.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.repository.prisma.ts`
- `apps/api/src/scripts/cleanup-position-analysis-lines.ts`
- `apps/api/package.json`
- `north-star/onboarding/tasks/ONB-006-orphan-position-cleanup.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/DECISIONS.md`
- ONB-004 and ONB-007 reports
- active PRs #275 and #279
- issues #153, #259, #274, and #280
