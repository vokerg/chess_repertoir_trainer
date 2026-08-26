# ONB-026 — Implement bounded orphan shared-position cleanup

Status: READY

Priority: P1

Order: 185

Delivery class: Implementation

Planning maturity: Implementation-ready after ONB-006/007 acceptance and ONB-019 lifecycle-foundation delivery; claim-time schema/migration and deployed-PostgreSQL compatibility checks remain mandatory

GitHub issue: [#280](https://github.com/vokerg/chess_repertoir_trainer/issues/280)

Research owner: ONB-006 / [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

Promoted at: 2026-08-26 through merged-task completion reconciliation

## Outcome

Implement a manual-first, disabled-by-default, durable PostgreSQL maintenance operation that removes shared `Position` rows only after an exact zero-`ImportedGamePly` predicate has remained true for a 30-day first-observed grace period.

## Canonical design

Follow all ONB-006 reports:

- `reports/ONB-006-2026-08-04-orphan-shared-position-cleanup.md`;
- `reports/ONB-006-2026-08-04-self-review-addendum.md`;
- `reports/ONB-006-2026-08-04-second-self-review-addendum.md`.

The primary report is reconciled to both addenda and is canonical. The addenda preserve the adversarial review history and the reasons for the corrected lock, trigger, traversal, dry-run, and invocation contracts.

The implementation must use:

- dedicated `PositionCleanupCandidate` persistence;
- dedicated `PositionCleanupRun` persistence;
- exact database `NOT EXISTS` eligibility;
- database-enforced candidate deletion whenever `ImportedGamePly` gains a reference;
- bounded reconcile, observe, dry-run, and delete phases whose input rows are limited before filtering;
- short `SHARE ROW EXCLUSIVE` maintenance locks acquired in the exact order `ImportedGamePly` → `ImportedGamePosition` → `PositionAnalysis` → `MastersExplorerCache`;
- the existing `ImportedGamePly.positionId` foreign key restriction as a final integrity backstop;
- one non-terminal run globally;
- exact work-key fencing, checkpointing, cancellation between transactions, stale recovery, and aggregate audit/status;
- a server-side manual command that calls the canonical service and defaults to dry-run.

## Repository anchors

- `apps/api/prisma/schema.prisma`
- focused migration SQL for candidate/run constraints and reference-reset triggers
- `apps/api/src/modules/imported-games/ply-index.repository.prisma.ts`
- `apps/api/src/modules/analysis/analysis.repository.prisma.ts`
- `apps/api/src/modules/opening-explorer/opening-explorer.repository.prisma.ts`
- `apps/api/src/modules/jobs/` for claim/heartbeat/stale/shutdown patterns only
- existing API worker bootstrap
- `apps/api/src/scripts/` and `apps/api/package.json` for the manual command pattern
- shared contract/OpenAPI conventions where a canonical maintenance projection is exposed
- PostgreSQL disposable-database test infrastructure

## Dependencies

- ONB-006 accepted and merged — complete.
- ONB-007 transaction/lock budget accepted — complete.
- ONB-019 actor/audit/claim conventions are delivered; cleanup remains separate from user/account/game lifecycle fences.
- Coordinate Prisma/schema/migration ownership with delivered ONB-011/017/019 immediately before claim.
- Coordinate destructive cascade writers with ONB-020/021 during implementation.
- Expose one canonical service consumed later by ONB-024 administrator adapters.
- Verify the deployed PostgreSQL major version supports `AFTER ... REFERENCING NEW TABLE` transition relations before writing the migration; return to design review if it does not.

## In scope

- Prisma models, migration, indexes, constraints, and one non-terminal-run uniqueness.
- `PositionCleanupCandidate` keyed by `positionId`, with stable `firstObservedOrphanAt` and refreshed `lastObservedOrphanAt`.
- `PositionCleanupRun` with immutable policy, grace cutoff, traversal upper bounds, exact counters, checkpoints, claim/work key, heartbeat, cancellation, and typed terminal state.
- PostgreSQL statement triggers for `ImportedGamePly` insert and position-reference update that delete matching candidates in the same transaction.
- Bounded candidate reconciliation and 30-day grace.
- Input-page-bounded observe, dry-run, and execute phases ordered by id.
- Durable run lifecycle, work-key fencing, worker loop, shutdown, retry, cancellation, and stale recovery.
- Shared dry-run/execute eligibility implementation.
- Corrected fixed-order maintenance lock and local lock-timeout behavior.
- Exact dependent-row and deletion counters.
- Observational dry-run status with traversal start/completion timestamps; no point-in-time snapshot claim.
- Canonical preview/create/status/cancel service and bounded contracts.
- Manual command under `apps/api/src/scripts/`, defaulting to dry-run and requiring explicit apply/typed confirmation for execute.
- Manual, disabled-by-default configuration.
- Focused concurrency, migration, repository, worker, command, contract, and benchmark tests.

## Bounded traversal contract

Every database phase limits input rows before applying eligibility filters:

- observation selects at most the configured number of `Position` rows after the scan checkpoint, then evaluates `NOT EXISTS` for that page;
- reconciliation selects at most the configured number of candidate rows, then removes those currently referenced;
- dry-run and execute select at most the configured number of candidate rows after their checkpoint, then apply grace and final reference checks;
- checkpoints advance to the last input row inspected, not the last matching row;
- each run snapshots a traversal upper bound so the phase terminates deterministically;
- the initial maximum is 500 input rows inspected per transaction, with a lower measured delete default permitted.

A query that filters the full table for 500 matching orphans before `LIMIT` does not satisfy this contract.

## Reference-reset trigger contract

Use PostgreSQL `AFTER INSERT` and `AFTER UPDATE` statement triggers on `ImportedGamePly` with transition relations:

- collect all newly referenced `positionId` values for the statement;
- delete matching `PositionCleanupCandidate` rows once per statement;
- execute in the same transaction as the reference write;
- remain idempotent for duplicate position IDs and updates that retain the same position;
- cover Prisma bulk insert, direct SQL, migrations, and future writers without application opt-in.

The bounded reconciliation phase remains mandatory for legacy/adoption validation and as a safety diagnostic, but it is not the authoritative grace-reset mechanism.

## Dry-run semantics

A dry-run is a durable bounded traversal, not one long repeatable-read snapshot:

- snapshot policy inputs, grace cutoff, and traversal upper bound at acceptance;
- recheck each bounded candidate page under normal short transactions;
- report exact rows observed eligible during the traversal;
- include `observationStartedAt` and `observationCompletedAt` and label the result observational;
- never represent the result as a promise that execution will delete the same rows;
- execution always performs a new final locked recheck.

## Manual invocation contract

Provide a server-side command following the existing `apps/api/src/scripts/` pattern:

- dry-run is the default;
- execute requires an explicit `--apply` or equivalently unmistakable flag and typed confirmation;
- the command invokes the canonical application service and the same worker iteration/state machine used by future adapters;
- it contains no independent cleanup SQL;
- it prints the durable run id and bounded status/result;
- typed failure produces a non-zero exit code;
- production use remains disabled unless the cleanup configuration is explicitly enabled.

## Out of scope

- Course `MoveNode` deletion.
- Client-provided position ID lists.
- Automatic recurring scheduling.
- Administrator Angular UI.
- `VACUUM`, `VACUUM FULL`, or filesystem-byte promises.
- New broker, queue library, deployment, or generic workflow framework.
- Changes to retention of positions that still have imported-game ply references.
- A long-lived repeatable-read/exported-snapshot preview transaction.
- Application-only reference-reset coordination as the final correctness mechanism.

## Acceptance criteria

- A referenced position cannot be deleted.
- Every insert or update that creates an `ImportedGamePly.positionId` reference removes the candidate in the same database transaction.
- A transient reference followed by dereference starts a new grace clock even if no reconciliation pass ran while it was referenced.
- Free-analysis and opening-explorer-only positions receive the same first-observed grace.
- Dry-run and execute share one predicate/policy implementation.
- Dry-run is labelled observational and never claims one point-in-time snapshot across bounded transactions.
- Every phase limits input rows before filtering and records inspected versus matched counters.
- Every delete batch acquires locks in the exact corrected order and rechecks eligibility afterward.
- The lock order is defined once and covered by a regression test that would fail if reordered.
- Reindex-versus-cleanup tests prove both cleanup-first and indexer-first interleavings complete without deadlock.
- Lock timeout rolls back without checkpoint/counter advancement and is retryable by cleanup; no generic writer retry is assumed.
- Cancellation is acknowledged only between atomic batches.
- Crash/retry/stale claim cannot skip or double-count input pages.
- `PositionAnalysis`, `MastersExplorerCache`, and candidate rows cascade; imported games, plies, and course trees remain intact.
- The manual command defaults to dry-run and cannot execute without explicit apply/confirmation.
- The manual command and future API adapter reuse the same service and contain no parallel deletion state machine.
- Transaction p90 is below one second and lock-wait p90 below 250 ms on the representative fixture before release.
- No ETA or reclaimed-byte claim is exposed.
- No schedule runs unless a later task explicitly authorizes it.

## Required validation

- Prisma format/generate and migration apply/rollback assessment.
- Foreign-key/index/partial-unique and trigger inspection.
- PostgreSQL transition-relation compatibility check against the deployed major version.
- Trigger tests for multi-row insert, position-id update, duplicate ids, and transaction rollback.
- Predicate equivalence and grace-boundary tests.
- Transient re-reference/dereference grace-reset test without an intervening reconciliation pass.
- Bounded scan tests with large tables, sparse orphans, mostly ineligible candidates, and query-plan evidence.
- Re-reference reset and candidate-reconciliation tests.
- Deterministic two-connection tests for the exact table-lock order.
- Forced concurrency tests for index/reindex/un-index, account/game cascades, analysis, cache writes, duplicate cleanup claim, lock timeout, cancellation, stale worker, and restart.
- Cleanup-first and writer-first interleavings, including cleanup waiting on an existing ply writer without checkpoint advancement and indexing waiting behind a bounded cleanup commit.
- Multi-transaction dry-run test proving observational timestamps and no snapshot overclaim.
- Manual-command tests for default dry-run, explicit execution confirmation, canonical-service reuse, output, and failure exit code.
- 10/500/5,000-input-row fixture evidence with query plans and p50/p90 transaction/lock timing.
- Full API/contracts build, lint, test, architecture, migration, and OpenAPI gates relevant to the change.

## Claim rule

The canonical queue has promoted ONB-026 to `READY`. Before claiming, the claimant must still re-inspect current schema/migration ownership for ONB-011/017/019, check active ONB-020/021 work for writer/lock collisions, and verify the deployed PostgreSQL transition-relation capability. If any of those checks fails, return the task to `BLOCKED` or design review rather than improvising.

## Completion

Pull request: none

Completed at: none
