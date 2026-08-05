# ONB-006 — Second self-review addendum

Date: 2026-08-04

Issue: [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153)

Pull request: [#281](https://github.com/vokerg/chess_repertoir_trainer/pull/281)

This addendum records a second adversarial review of the ONB-006 research delivery. It is authoritative where it conflicts with the primary report or the first self-review addendum. The primary report and implementation issue must be reconciled to these conclusions before PR #281 returns to review-ready state.

## Finding 1 — the primary report still contains the rejected lock order

The first self-review correctly changed the delete-batch table-lock order to:

```text
ImportedGamePly
  → ImportedGamePosition
  → PositionAnalysis
  → MastersExplorerCache
```

However, the primary report still listed `ImportedGamePosition` before `ImportedGamePly` in its canonical concurrency section. A downstream implementer reading only the primary report could therefore reproduce the deadlock risk already identified against the current reindex transaction.

Disposition:

- correct the primary report itself;
- keep the first addendum as historical evidence of the correction;
- retain one implementation constant/helper and deterministic lock-order regression tests.

## Finding 2 — re-reference grace reset must be database-enforced

The initial design required the current indexing repository to delete matching `PositionCleanupCandidate` rows after creating `ImportedGamePly` rows. That covers the current application path but does not fully satisfy the stated protection against direct SQL, migrations, and future writers.

A bounded reconciliation pass cannot repair every missed transient reference. A writer could create and later remove a reference between reconciliation passes, leaving the old `firstObservedOrphanAt` intact and incorrectly allowing immediate cleanup after the second orphaning event.

Corrected decision:

- add PostgreSQL `AFTER INSERT` and `AFTER UPDATE` statement triggers on `ImportedGamePly`;
- use transition relations to delete candidates for every newly referenced `positionId` once per SQL statement;
- run the trigger in the same transaction as the reference write, so either both changes commit or both roll back;
- keep bounded candidate reconciliation as a repair/audit path for legacy state and rollout verification, not as the primary grace-reset mechanism;
- do not duplicate the reset in Angular or route code;
- the current indexing repository needs no separate candidate-reset call when the trigger is installed.

The implementation must verify the deployed PostgreSQL version supports transition relations before migration. If that assumption fails, the implementation must return to design review rather than silently falling back to per-row application coordination.

## Finding 3 — bound rows inspected, not only matching orphans

The original observation wording limited each transaction to 500 matching orphan candidates. That does not guarantee a bounded database operation: when orphans are sparse, PostgreSQL may inspect a large portion of `ImportedGamePosition` to find 500 matches.

Corrected phase contract:

- snapshot a phase upper bound such as the current maximum `Position.id`;
- select the next at-most-500 `Position` rows by primary-key order, regardless of orphan status;
- evaluate the exact `NOT EXISTS` predicate only for that bounded input page;
- insert/update candidates for qualifying rows;
- advance the scan checkpoint to the last inspected position id, not the last matching orphan id;
- record both `positionsInspected` and `orphansObserved`.

Apply the same principle elsewhere:

- candidate reconciliation pages at most the configured number of candidate rows inspected;
- dry-run and execute page at most the configured number of candidate rows inspected before filtering by grace and final reference state;
- query-plan validation must prove primary-key/index-bounded input pages before any anti-join or dependent-row counting.

The ONB-007 ceiling is therefore interpreted as at most 500 input Position/candidate rows inspected per transaction initially, not 500 matches after an unbounded filter.

## Finding 4 — a bounded dry-run is not one point-in-time snapshot

The primary report described dry-run as an exact count at one database snapshot. A durable, resumable dry-run spanning bounded transactions cannot provide that semantics under normal `READ COMMITTED` execution. PostgreSQL gives each command a fresh snapshot; retaining one repeatable snapshot would require a long-lived transaction or exported-snapshot protocol that conflicts with the bounded maintenance design.

Corrected dry-run semantics:

- snapshot immutable policy inputs, the grace cutoff, and the traversal upper bound when the run is accepted;
- traverse candidate input pages in bounded transactions;
- recheck grace and `NOT EXISTS` when each page is inspected;
- report exact rows observed as eligible during that traversal, with `observationStartedAt` and `observationCompletedAt`;
- label the result `OBSERVATIONAL`, not as a single-time database snapshot or execution promise;
- execution always performs its own final locked recheck;
- no long repeatable-read transaction or exported snapshot is introduced merely to make preview wording stronger.

Execution counts remain exact for rows actually deleted and dependent rows counted in each locked delete transaction.

## Finding 5 — the manual invocation surface was unspecified

The first release was described as manual and operator-initiated, but the implementation contract named only an internal service and a disabled worker loop. That left no concrete supported way for an operator to start the operation before the later administrator UI task.

Corrected invocation boundary:

- add a server-side command under the existing `apps/api/src/scripts/` pattern;
- default to `DRY_RUN`;
- require an explicit `--apply` or equivalently unmistakable execute flag plus typed confirmation for `EXECUTE`;
- invoke the same canonical application service and worker iteration used by every future API/admin adapter;
- never contain separate cleanup SQL or a second state machine;
- print the durable run id and bounded status/result, and exit non-zero on typed failure;
- retain disabled-by-default configuration and production database safety checks;
- ONB-024 may later add capability-gated API/Angular adapters without replacing this service.

## Finding 6 — program completion records were not reconciled

PR #281 initially changed the task queue and GitHub mapping but did not update:

- `DECISIONS.md`;
- `OPEN_QUESTIONS.md`;
- `ROADMAP.md`;
- `STATUS.md`.

This violates the program completion rule recorded in `TASKS.md` and leaves the repository claiming ONB-006 questions remain open and ONB-005 is still the next research task.

Disposition before review readiness:

- lock the final ONB-006 decisions in `DECISIONS.md` using IDs that do not collide with active PR #275;
- move ONB-006-owned questions to resolved and delegate only implementation-local validation to ONB-026;
- show ONB-006 as `REVIEW` and ONB-026 as `PROPOSED` in roadmap/status records;
- remove stale wording that PR #281 is draft after it returns to review-ready state;
- rebase/reconcile if PR #275 or PR #279 lands first.

## Required implementation tests added by this review

- statement-trigger reset for multi-row `ImportedGamePly.createMany`;
- update-trigger reset when `positionId` changes;
- trigger and reference write roll back together;
- transient reference followed by dereference starts a new grace clock even when no reconciliation pass runs between them;
- bounded scan test with a large table and sparse orphans proving only the input page is inspected;
- bounded candidate-page tests with mostly ineligible/not-yet-graced rows;
- dry-run traversal across multiple transactions proving the result is labelled observational and carries start/completion timestamps;
- manual command defaults to dry-run and cannot execute without explicit apply/confirmation;
- the command and future API adapter call the same canonical service and contain no deletion SQL.

## Final disposition

The core ONB-006 direction remains valid after these corrections:

- exact zero-ply orphan predicate;
- dependent cache/analysis cascades;
- 30-day first-observed grace;
- database-enforced grace reset on every reference write;
- input-page-bounded scan/reconcile/dry-run/delete phases;
- plies-first fixed maintenance lock order;
- observational bounded dry-run and exact execution results;
- manual server-side command first, no schedule;
- ONB-026 / #280 as the sole implementation task.

PR #281 remains draft until the primary report, implementation task/issue, and canonical program records are synchronized with this addendum.
